using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FuzzySharp;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class PatientService : IPatientService
    {
        private readonly SynOSDbContext _context;

        public PatientService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<Patient> CreatePatientAsync(PatientCreateDto patientDto)
        {
            var newMrn = await GenerateNextMrnAsync();
            var patient = new Patient
            {
                PatientId = Guid.NewGuid(),
                MRN = newMrn,
                FirstName = patientDto.FirstName,
                LastName = patientDto.LastName,
                DateOfBirth = patientDto.DateOfBirth,
                Gender = patientDto.Gender,
                CurrentPhoneNumber = patientDto.PhoneNumber
            };

            if (!string.IsNullOrEmpty(patientDto.PhoneNumber))
            {
                patient.PhoneHistory = new List<PatientPhoneHistory>
                {
                    new PatientPhoneHistory { PhoneNumber = patientDto.PhoneNumber }
                };
            }

            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();
            return patient;
        }

        public async Task<IEnumerable<Patient>> SearchPatientsAsync(string query, int limit, int offset)
        {
            return await _context.Patients
                .Where(p => !p.IsSoftDeleted &&
                            (EF.Functions.Like(p.FirstName, $"%{query}%") ||
                             EF.Functions.Like(p.LastName, $"%{query}%") ||
                             EF.Functions.Like(p.MRN, $"%{query}%") ||
                             EF.Functions.Like(p.CurrentPhoneNumber, $"%{query}%")))
                .OrderBy(p => p.LastName)
                .Skip(offset)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<Patient> GetPatientByIdAsync(Guid id)
        {
            return await _context.Patients.FindAsync(id);
        }

        public async Task<IEnumerable<PatientPhoneHistory>> GetPatientPhoneHistoryAsync(Guid id)
        {
            return await _context.PatientPhoneHistories
                .Where(h => h.PatientId == id)
                .OrderByDescending(h => h.StartDate)
                .ToListAsync();
        }

        public async Task<Patient> UpdatePhoneAsync(Guid patientId, string newPhone)
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

            patient.PhoneHistory.Add(new PatientPhoneHistory { PhoneNumber = newPhone });
            patient.CurrentPhoneNumber = newPhone;
            patient.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return patient;
        }

        public async Task<IEnumerable<DuplicatePatientDto>> FindPossibleDuplicatesAsync(Guid patientId)
        {
            var targetPatient = await _context.Patients.FindAsync(patientId);
            if (targetPatient == null) return null;

            var potentialDuplicates = await _context.Patients
                .Where(p => p.PatientId != patientId && !p.IsSoftDeleted &&
                            (p.CurrentPhoneNumber == targetPatient.CurrentPhoneNumber))
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
                    });
                }
            }
            return results.OrderByDescending(r => r.MatchPercentage);
        }

        public async Task<MergePreviewDto> GetMergePreviewAsync(Guid targetId, Guid sourceId)
        {
            // This is a simplified preview. A real implementation would query related tables.
            // For now, we'll return dummy counts.
            return new MergePreviewDto
            {
                VisitsToMove = await _context.Patients.Where(p => p.PatientId == sourceId).SelectMany(p => p.PhoneHistory).CountAsync(), // Placeholder for Visits
                SamplesToMove = 0, // Placeholder for Samples
                PhoneHistoryToMove = await _context.PatientPhoneHistories.CountAsync(h => h.PatientId == sourceId),
                AliasesToMove = await _context.PatientAliases.CountAsync(a => a.PatientId == sourceId),
                ReferrerLinksToMove = await _context.PatientReferrerLinks.CountAsync(r => r.PatientId == sourceId)
            };
        }

        public async Task<bool> MergePatientsAsync(Guid targetId, Guid sourceId, int userId)
        {
            var targetPatient = await _context.Patients.FindAsync(targetId);
            var sourcePatient = await _context.Patients.FindAsync(sourceId);

            if (targetPatient == null || sourcePatient == null) return false;

            // Re-link related entities
            var phoneHistory = await _context.PatientPhoneHistories.Where(h => h.PatientId == sourceId).ToListAsync();
            phoneHistory.ForEach(h => h.PatientId = targetId);

            var aliases = await _context.PatientAliases.Where(a => a.PatientId == sourceId).ToListAsync();
            aliases.ForEach(a => a.PatientId = targetId);

            var referrerLinks = await _context.PatientReferrerLinks.Where(r => r.PatientId == sourceId).ToListAsync();
            referrerLinks.ForEach(r => r.PatientId = targetId);

            // Soft delete the source patient
            sourcePatient.IsSoftDeleted = true;
            sourcePatient.UpdatedAt = DateTime.UtcNow;

            // Add an audit log entry
            var auditLog = new AuditLog
            {
                UserId = userId,
                Action = "MergePatients",
                Timestamp = DateTime.UtcNow,
                Details = $"Merged patient {sourcePatient.MRN} ({sourceId}) into {targetPatient.MRN} ({targetId})."
            };
            _context.AuditLogs.Add(auditLog);

            await _context.SaveChangesAsync();
            return true;
        }

        private async Task<string> GenerateNextMrnAsync()
        {
            var lastMrn = await _context.Patients
                .Where(p => p.MRN.StartsWith("A"))
                .OrderByDescending(p => p.MRN)
                .Select(p => p.MRN)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastMrn))
            {
                return "A00001";
            }

            var numberPart = int.Parse(lastMrn.Substring(1));
            return $"A{(numberPart + 1):D5}";
        }
    }
}
