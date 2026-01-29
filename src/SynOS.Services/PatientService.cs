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

namespace SynOS.Services
{
    public class PatientService : IPatientService
    {
        private readonly SynOSDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IMapper _mapper;
        private readonly IOperationalEventWriter _operationalEventWriter; // ADDED
        private readonly IUserContext _userContext; // ADDED

        public PatientService(
            SynOSDbContext context, 
            IAuditService auditService, 
            IMapper mapper,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
        }

        // Create patient and return PatientDto (avoids returning entity with navigation properties)
        public async Task<PatientDto> CreatePatientAsync(PatientCreateDto patientDto)
        {
            if (patientDto == null) throw new ArgumentNullException(nameof(patientDto));

            var newMrn = await GenerateNextMrnAsync();

            var patient = new Patient
            {
                PatientId = Guid.NewGuid(),
                MRN = newMrn,
                FirstName = patientDto.FirstName,
                LastName = patientDto.LastName,
                DateOfBirth = patientDto.DateOfBirth,
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

            await _operationalEventWriter.WriteEventAsync(
                Models.Enums.BranchEventType.PATIENT_REGISTERED,
                currentBranchId,
                patient.PatientId.ToString(),
                patient.MRN,
                summary,
                "Patient",
                currentUserId
            );

            return dto;
        }

        // Enhanced search - returns DTOs directly with Last Visit info
        public async Task<IEnumerable<PatientDto>> SearchPatientsAsync(string query, int limit, int offset)
        {
            query ??= string.Empty;
            return await _context.Patients
                .AsNoTracking()
                .Where(p => !p.IsSoftDeleted &&
                            (EF.Functions.Like(p.FirstName, $"%{query}%") ||
                             EF.Functions.Like(p.LastName, $"%{query}%") ||
                             EF.Functions.Like(p.MRN, $"%{query}%") ||
                             EF.Functions.Like(p.CurrentPhoneNumber, $"%{query}%")))
                .OrderBy(p => p.LastName)
                .Skip(offset)
                .Take(limit)
                .Select(p => new PatientDto
                {
                    PatientId = p.PatientId,
                    MRN = p.MRN,
                    FirstName = p.FirstName,
                    LastName = p.LastName,
                    Age = p.DateOfBirth == DateTime.MinValue ? 0 : DateTime.UtcNow.Year - p.DateOfBirth.Year, // Helper calculation
                    DateOfBirth = p.DateOfBirth,
                    Gender = p.Gender,
                    CurrentPhoneNumber = p.CurrentPhoneNumber,
                    CreatedAt = p.CreatedAt,
                    LastVisitDate = p.Visits
                        .Where(v => v.Invoices.Any(i => i.Status == "Paid"))
                        .OrderByDescending(v => v.TokenDate)
                        .Select(v => v.TokenDate)
                        .FirstOrDefault(),
                    LastVisitTestCodes = p.Visits
                        .Where(v => v.Invoices.Any(i => i.Status == "Paid"))
                        .OrderByDescending(v => v.TokenDate)
                        .Select(v => v.Orders.Select(o => o.TestCode).ToList())
                        .FirstOrDefault()
                })
                .ToListAsync();
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
                SamplesToMove = 0,
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

            // Move phone history entries
            foreach (var ph in source.PhoneHistory.ToList())
            {
                // reassign PatientId or clone depending on your entity config
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

        // small helper: MRN generator (very simple placeholder)
        private async Task<string> GenerateNextMrnAsync()
        {
            // very simple MRN: numeric sequence padded to 6
            var last = await _context.Patients.OrderByDescending(p => p.CreatedAt).FirstOrDefaultAsync();
            int lastNumber = 0;
            if (last != null && int.TryParse(last.MRN, out var n)) lastNumber = n;
            return (lastNumber + 1).ToString().PadLeft(6, '0');
        }
    }
}
