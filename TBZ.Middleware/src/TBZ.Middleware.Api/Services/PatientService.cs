using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class PatientService
    {
        private readonly MiddlewareDbContext _db;

        public PatientService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<List<PatientListItemDto>> GetPatientsAsync(string labId, string? q)
        {
            var query = _db.PatientIntelligenceFacts.Where(f => f.LabId == labId);

            if (!string.IsNullOrEmpty(q))
            {
                var lowerQ = q.ToLowerInvariant();
                query = query.Where(f => 
                    f.PatientName.ToLower().Contains(lowerQ) ||
                    f.MRN.ToLower().Contains(lowerQ) ||
                    f.MobileNumber.ToLower().Contains(lowerQ) ||
                    f.ReferringDoctorOrPartner.ToLower().Contains(lowerQ)
                );
            }

            var patients = await query.ToListAsync();
            var patientIds = patients.Select(p => p.PatientId).ToList();

            // Load visits to aggregate tests dynamically
            var visits = await _db.PatientVisitFacts
                .Where(v => patientIds.Contains(v.PatientId))
                .ToListAsync();

            return MapPatients(patients, visits);
        }

        public async Task<List<PatientListItemDto>> GetPatientsByReferralPartnerAsync(string labId, Guid partnerId)
        {
            var patients = await _db.PatientIntelligenceFacts
                .Where(f => f.LabId == labId && f.ReferralPartnerId == partnerId)
                .ToListAsync();
            var patientIds = patients.Select(p => p.PatientId).ToList();
            var visits = await _db.PatientVisitFacts
                .Where(v => patientIds.Contains(v.PatientId))
                .ToListAsync();
            return MapPatients(patients, visits);
        }

        public async Task<List<PatientListItemDto>> GetPatientsByReferringDoctorAsync(string labId, Guid doctorId)
        {
            var patients = await _db.PatientIntelligenceFacts
                .Where(f => f.LabId == labId && f.ReferringDoctorId == doctorId)
                .ToListAsync();
            var patientIds = patients.Select(p => p.PatientId).ToList();
            var visits = await _db.PatientVisitFacts
                .Where(v => patientIds.Contains(v.PatientId))
                .ToListAsync();
            return MapPatients(patients, visits);
        }

        private List<PatientListItemDto> MapPatients(List<PatientIntelligenceFact> patients, List<PatientVisitFact> visits)
        {
            var result = new List<PatientListItemDto>();
            foreach (var p in patients)
            {
                // Dynamic Age calculation
                int age = 0;
                if (p.DateOfBirth.HasValue)
                {
                    var today = DateTime.UtcNow;
                    age = today.Year - p.DateOfBirth.Value.Year;
                    if (p.DateOfBirth.Value.Date > today.AddYears(-age)) age--;
                }

                // Dynamic test aggregation
                var patientVisits = visits.Where(v => v.PatientId == p.PatientId).ToList();
                var distinctTests = new HashSet<string>();
                foreach (var v in patientVisits)
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(v.TestsJson))
                        {
                            var list = JsonSerializer.Deserialize<List<string>>(v.TestsJson);
                            if (list != null)
                            {
                                foreach (var t in list) distinctTests.Add(t);
                            }
                        }
                    }
                    catch
                    {
                        // Ignore parse error
                    }
                }

                result.Add(new PatientListItemDto
                {
                    PatientId = p.PatientId,
                    MRN = p.MRN,
                    Name = p.PatientName,
                    Age = age,
                    Gender = p.Gender,
                    MobileNumber = p.MobileNumber,
                    TestsOrdered = string.Join(", ", distinctTests),
                    ReferringDoctorOrPartner = p.ReferringDoctorOrPartner,
                    TotalVisits = p.TotalVisits,
                    LastVisitDate = p.LastVisitDate,
                    LifetimeRevenue = p.LifetimeRevenue
                });
            }

            return result.OrderByDescending(p => p.LastVisitDate).ToList();
        }

        public async Task<PatientDetailsDto?> GetPatientDetailsAsync(string labId, Guid patientId)
        {
            var p = await _db.PatientIntelligenceFacts.FirstOrDefaultAsync(f => f.LabId == labId && f.PatientId == patientId);
            if (p == null) return null;

            int age = 0;
            if (p.DateOfBirth.HasValue)
            {
                var today = DateTime.UtcNow;
                age = today.Year - p.DateOfBirth.Value.Year;
                if (p.DateOfBirth.Value.Date > today.AddYears(-age)) age--;
            }

            var visits = await _db.PatientVisitFacts
                .Where(v => v.PatientId == patientId)
                .OrderByDescending(v => v.VisitDate)
                .ToListAsync();

            var visitDtos = new List<PatientVisitDto>();
            foreach (var v in visits)
            {
                var tests = new List<string>();
                try
                {
                    if (!string.IsNullOrEmpty(v.TestsJson))
                    {
                        tests = JsonSerializer.Deserialize<List<string>>(v.TestsJson) ?? new List<string>();
                    }
                }
                catch
                {
                    // Ignore parse error
                }

                visitDtos.Add(new PatientVisitDto
                {
                    VisitId = v.VisitId,
                    Token = v.Token,
                    VisitDate = v.VisitDate,
                    Tests = tests,
                    AmountPaid = v.AmountPaid
                });
            }

            return new PatientDetailsDto
            {
                PatientId = p.PatientId,
                MRN = p.MRN,
                Name = p.PatientName,
                Age = age,
                Gender = p.Gender,
                MobileNumber = p.MobileNumber,
                ReferringDoctorOrPartner = p.ReferringDoctorOrPartner,
                TotalVisits = p.TotalVisits,
                LifetimeRevenue = p.LifetimeRevenue,
                FirstVisitDate = p.FirstVisitDate,
                LastVisitDate = p.LastVisitDate,
                Visits = visitDtos
            };
        }
    }
}
