using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using FuzzySharp;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

using SynOS.Services.Operational; // ADDED
using SynOS.Services.Security; // ADDED
using SynOS.Models.ReadModels; // ADDED
using SynOS.Models.Events;

namespace SynOS.Services
{
    public class PatientService : IPatientService
    {
        private readonly SynOSDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IMapper _mapper;
        private readonly IOperationalEventWriter _operationalEventWriter; // ADDED
        private readonly IUserContext _userContext; // ADDED
        private readonly IMiddlewareOutboxService _outboxService;

        public PatientService(
            SynOSDbContext context, 
            IAuditService auditService, 
            IMapper mapper,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext,
            IMiddlewareOutboxService outboxService)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _outboxService = outboxService ?? throw new ArgumentNullException(nameof(outboxService));
        }

        // Create patient and return PatientDto (avoids returning entity with navigation properties)
        public async Task<PatientDto> CreatePatientAsync(PatientCreateDto patientDto)
        {
            if (patientDto == null) throw new ArgumentNullException(nameof(patientDto));

            var newMrn = await GenerateNextMrnAsync();

            DateTime calculatedDob = patientDto.DateOfBirth > DateTime.MinValue && patientDto.DateOfBirth.Year > 1900
                ? patientDto.DateOfBirth
                : (patientDto.Age.HasValue && patientDto.Age.Value > 0
                    ? DateTime.UtcNow.AddYears(-patientDto.Age.Value)
                    : DateTime.MinValue);

            bool isDobKnown = patientDto.DateOfBirth > DateTime.MinValue && patientDto.DateOfBirth.Year > 1900
                ? patientDto.IsDateOfBirthKnown
                : false;

            var patient = new Patient
            {
                PatientId = Guid.NewGuid(),
                MRN = newMrn,
                FirstName = patientDto.FirstName,
                LastName = patientDto.LastName,
                DateOfBirth = calculatedDob,
                IsDateOfBirthKnown = isDobKnown,
                Gender = patientDto.Gender,
                CurrentPhoneNumber = patientDto.CurrentPhoneNumber ?? string.Empty,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (!string.IsNullOrEmpty(patientDto.CurrentPhoneNumber))
            {
                // Create initial phone history entry (use properties that exist on PatientPhoneHistory)
                patient.PhoneHistory = new List<PatientPhoneHistory>
                {
                    new PatientPhoneHistory
                    {
                        // do not assume property names that don't exist; set common ones:
                        PhoneNumber = patientDto.CurrentPhoneNumber,
                        StartDate = DateTime.UtcNow
                    }
                };
            }

            _context.Patients.Add(patient);

            // Enqueue PatientRegisteredEvent
            _outboxService.Enqueue(new PatientRegisteredEvent(
                patient.PatientId,
                patient.FirstName,
                patient.LastName,
                patient.MRN,
                patient.Gender,
                patient.DateOfBirth,
                patient.CurrentPhoneNumber,
                _userContext.CurrentBranchId
            ));

            await _context.SaveChangesAsync();

            var dto = _mapper.Map<PatientDto>(patient);

            // 🔥 IMPORTANT: log a FLAT object, NOT the EF entity
            await _auditService.LogAsync(
                null,
                "CreatePatient",
                "Patient",
                patient.PatientId,
                new
                {
                    dto.PatientId,
                    dto.MRN,
                    dto.FirstName,
                    dto.LastName,
                    dto.DateOfBirth,
                    dto.Gender,
                    dto.CurrentPhoneNumber
                }
            );

            // PHASE 3: Emit Patient Registered Event
            var age = DateTime.UtcNow.Year - patient.DateOfBirth.Year;
            
            if (patient.DateOfBirth > DateTime.UtcNow.AddYears(-age)) age--;

            var summary = $"New patient registered: {patient.FirstName} {patient.LastName} ({patient.Gender}, {age})";
            var currentUserId = _userContext.CurrentUserId != Guid.Empty ? _userContext.CurrentUserId.ToString() : "System";
            var currentBranchId = _userContext.CurrentBranchId != Guid.Empty ? _userContext.CurrentBranchId.ToString() : Guid.Empty.ToString();

            var metadata = System.Text.Json.JsonSerializer.Serialize(new 
            {
                Name = $"{patient.FirstName} {patient.LastName}",
                Age = age,
                Gender = patient.Gender,
                MRN = patient.MRN,
                Phone = patient.CurrentPhoneNumber
            });

            await _operationalEventWriter.WriteEventAsync(
                Models.Enums.BranchEventType.PATIENT_REGISTERED,
                currentBranchId,
                patient.PatientId.ToString(),
                patient.MRN,
                summary,
                "Patient",
                currentUserId,
                true, // saveChanges
                null, // sourceId
                null, // sourceType
                TimelineVisibility.Surface,
                patient.PatientId, // IntentId matches PatientId for registration flow
                metadata
            );

            return dto;
        }

        // Enhanced search - returns DTOs directly with Last Visit info (Canonical JOIN Implementation)
        public async Task<IEnumerable<PatientDto>> SearchPatientsAsync(string? query, int limit, int offset)
        {
            var q = query?.Trim();

            // 2️⃣ Base patient scope
            var patients = _context.Patients
                .AsNoTracking()
                .Where(p => !p.IsSoftDeleted);

            // 3️⃣ Active phone scope (canonical source)
            var activePhones =
                from ph in _context.PatientPhoneHistories
                where ph.EndDate == null
                select ph;

            // 4️⃣ Alias scope
            var aliases =
                from a in _context.PatientAliases
                select a;

            if (!string.IsNullOrWhiteSpace(q))
            {
                patients = from p in patients

                           join ph in activePhones
                               on p.PatientId equals ph.PatientId into phoneGroup
                           from ph in phoneGroup.DefaultIfEmpty()

                           join a in aliases
                               on p.PatientId equals a.PatientId into aliasGroup
                           from a in aliasGroup.DefaultIfEmpty()

                           where
                               EF.Functions.Like(p.MRN, $"%{q}%")
                               || EF.Functions.Like((p.FirstName + " " + p.LastName), $"%{q}%")
                               || (a != null && EF.Functions.Like((a.FirstName + " " + a.LastName), $"%{q}%"))
                               || (ph != null && EF.Functions.Like(ph.PhoneNumber, $"%{q}%"))

                           select p;

                patients = patients.Distinct();
            }

            var results =
                from p in patients

                join ph in activePhones
                    on p.PatientId equals ph.PatientId into phoneGroup
                from ph in phoneGroup.DefaultIfEmpty()

                select new PatientDto
                {
                    PatientId = p.PatientId,
                    MRN = p.MRN,
                    FirstName = p.FirstName,
                    LastName = p.LastName,
                    DateOfBirth = p.DateOfBirth,
                    Age = p.DateOfBirth == DateTime.MinValue ? 0 : DateTime.UtcNow.Year - p.DateOfBirth.Year,
                    Gender = p.Gender,
                    CreatedAt = p.CreatedAt,
                    
                    // IMPORTANT: expose ACTIVE phone
                    CurrentPhoneNumber = ph != null ? ph.PhoneNumber : null,

                    LastVisitDate = _context.Visits
                        .Where(v => v.PatientId == p.PatientId)
                        .OrderByDescending(v => v.TokenDate)
                        .Select(v => (DateTime?)v.TokenDate)
                        .FirstOrDefault(),

                     LastVisitTestCodes = _context.Visits
                        .Where(v => v.PatientId == p.PatientId)
                        .OrderByDescending(v => v.TokenDate)
                        .Select(v => v.Orders.Select(o => o.TestCode).ToList())
                        .FirstOrDefault() ?? new List<string>()
                };

            // 6️⃣ Pagination
            var paged = await results
                .OrderBy(p => p.FirstName)
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            return paged;
        }

        // Return PatientDto (safe for API)
        public async Task<PatientDto?> GetPatientByIdAsync(Guid id)
        {
            var patient = await _context.Patients
                .Include(p => p.Aliases) // include whatever small navigation props are safe for mapping
                .SingleOrDefaultAsync(p => p.PatientId == id);

            if (patient == null) return null;
            return _mapper.Map<PatientDto>(patient);
        }

        // Phone history fetch - returns entity list
        public async Task<IEnumerable<PatientPhoneHistory>> GetPatientPhoneHistoryAsync(Guid id)
        {
            return await _context.PatientPhoneHistories
                .Where(h => h.PatientId == id)
                .OrderByDescending(h => h.StartDate)
                .ToListAsync();
        }

        // Update phone: close previous open phone history (EndDate null), add new entry
        public async Task<Patient?> UpdatePhoneAsync(Guid patientId, string newPhone)
        {
            var patient = await _context.Patients
                .Include(p => p.PhoneHistory)
                .SingleOrDefaultAsync(p => p.PatientId == patientId);

            if (patient == null) return null;

            var oldPhoneHistory = patient.PhoneHistory.FirstOrDefault(h => h.EndDate == null);
            if (oldPhoneHistory != null)
            {
                oldPhoneHistory.EndDate = DateTime.UtcNow;
            }

            patient.PhoneHistory.Add(new PatientPhoneHistory
            {
                PhoneNumber = newPhone,
                StartDate = DateTime.UtcNow
            });

            patient.CurrentPhoneNumber = newPhone;
            patient.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(null, "UpdatePatientPhone", "Patient", patientId, new { OldPhone = oldPhoneHistory?.PhoneNumber, NewPhone = newPhone });

            return patient;
        }

        // Find possible duplicates by phone + fuzzy name match
        public async Task<IEnumerable<DuplicatePatientDto>?> FindPossibleDuplicatesAsync(Guid patientId)
        {
            var targetPatient = await _context.Patients.FindAsync(patientId);
            if (targetPatient == null) return null;

            var potentialDuplicates = await _context.Patients
                .Where(p => p.PatientId != patientId && !p.IsSoftDeleted &&
                            p.CurrentPhoneNumber == targetPatient.CurrentPhoneNumber)
                .ToListAsync();

            var results = new List<DuplicatePatientDto>();
            foreach (var p in potentialDuplicates)
            {
                var nameSimilarity = Fuzz.Ratio($"{targetPatient.FirstName} {targetPatient.LastName}", $"{p.FirstName} {p.LastName}");
                if (nameSimilarity >= 80)
                {
                    results.Add(new DuplicatePatientDto
                    {
                        PatientId = p.PatientId,
                        MRN = p.MRN,
                        FirstName = p.FirstName,
                        LastName = p.LastName,
                        DateOfBirth = p.DateOfBirth,
                        PhoneNumber = p.CurrentPhoneNumber,
                        MatchPercentage = nameSimilarity
                        // NOTE: do not set a 'Reason' property because the DTO in your repo does not contain it.
                    });
                }
            }

            return results.OrderByDescending(r => r.MatchPercentage);
        }

        // Merge preview counts (safe dummies based on existing tables)
        public async Task<MergePreviewDto> GetMergePreviewAsync(Guid targetId, Guid sourceId)
        {
            // Placeholder: we count phone history and aliases etc. Real implementation would move visits/samples.
            var preview = new MergePreviewDto
            {
                VisitsToMove = await _context.Patients.Where(p => p.PatientId == sourceId).SelectMany(p => p.PhoneHistory).CountAsync(),
                // SamplesToMove = 0, // REFACTOR: Sample removed
                PhoneHistoryToMove = await _context.PatientPhoneHistories.CountAsync(h => h.PatientId == sourceId),
                AliasesToMove = await _context.PatientAliases.CountAsync(a => a.PatientId == sourceId),
                ReferrerLinksToMove = await _context.PatientReferrerLinks.CountAsync(r => r.PatientId == sourceId)
            };
            return preview;
        }

        // Merge patients - simple example: move phone history & aliases, soft delete source
        public async Task<bool> MergePatientsAsync(Guid targetId, Guid sourceId, Guid userId)
        {
            if (targetId == sourceId) return false;

            var target = await _context.Patients
                .Include(p => p.PhoneHistory)
                .Include(p => p.Aliases)
                .SingleOrDefaultAsync(p => p.PatientId == targetId);

            var source = await _context.Patients
                .Include(p => p.PhoneHistory)
                .Include(p => p.Aliases)
                .SingleOrDefaultAsync(p => p.PatientId == sourceId);

            if (target == null || source == null) return false;

            // Move associated visits
            var visits = await _context.Visits.Where(v => v.PatientId == sourceId).ToListAsync();
            foreach (var visit in visits)
            {
                visit.PatientId = targetId;
            }

            // Move phone history entries
            foreach (var ph in source.PhoneHistory.ToList())
            {
                ph.PatientId = target.PatientId;
                target.PhoneHistory.Add(ph);
            }

            // Move aliases
            foreach (var al in source.Aliases.ToList())
            {
                al.PatientId = target.PatientId;
                target.Aliases.Add(al);
            }

            // mark source as soft deleted
            source.IsSoftDeleted = true;
            source.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "MergePatients", "Patient", targetId, new { Source = sourceId, Target = targetId });

            return true;
        }

        public async Task<PatientDto?> UpdatePatientAsync(Guid id, PatientUpdateDto dto, Guid? actorUserId = null)
        {
            var patient = await _context.Patients
                .Include(p => p.PhoneHistory)
                .SingleOrDefaultAsync(p => p.PatientId == id);

            if (patient == null) return null;

            var oldValues = new
            {
                patient.FirstName,
                patient.LastName,
                patient.DateOfBirth,
                patient.Gender,
                patient.CurrentPhoneNumber
            };

            patient.FirstName = dto.FirstName;
            patient.LastName = dto.LastName;
            patient.DateOfBirth = dto.DateOfBirth;
            patient.Gender = dto.Gender;

            if (dto.CurrentPhoneNumber != null && patient.CurrentPhoneNumber != dto.CurrentPhoneNumber)
            {
                var activePhone = patient.PhoneHistory.FirstOrDefault(h => h.EndDate == null);
                if (activePhone != null)
                {
                    activePhone.EndDate = DateTime.UtcNow;
                }

                patient.PhoneHistory.Add(new PatientPhoneHistory
                {
                    PhoneNumber = dto.CurrentPhoneNumber,
                    StartDate = DateTime.UtcNow
                });
                patient.CurrentPhoneNumber = dto.CurrentPhoneNumber;
            }

            patient.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(actorUserId, "UpdatePatient", "Patient", id, new { Old = oldValues, New = dto });

            return _mapper.Map<PatientDto>(patient);
        }

        // small helper: MRN generator (very simple placeholder)
        private async Task<string> GenerateNextMrnAsync()
        {
            // improved MRN: find last and increment numeric part
            var last = await _context.Patients.OrderByDescending(p => p.CreatedAt).FirstOrDefaultAsync();
            if (last == null) return "000001";

            var numericPart = new string(last.MRN.Where(char.IsDigit).ToArray());
            if (int.TryParse(numericPart, out var n))
            {
                return (n + 1).ToString().PadLeft(6, '0');
            }
            
            // If parsing fails (e.g. no digits), fallback to a high number or timestamp-based
            return DateTime.UtcNow.Ticks.ToString().Substring(10).PadLeft(6, '0');
        }
    }
}
