using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class ReferralService
    {
        private readonly MiddlewareDbContext _db;

        public ReferralService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<ReferralsSummaryDto> GetAsync(string resolvedLabId, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var rawDoctors = await _db.DoctorReferralFacts
                .Where(f => f.LabId == resolvedLabId && f.Date >= start.Date && f.Date <= end.Date)
                .ToListAsync();

            var doctors = rawDoctors
                .GroupBy(f => new { f.DoctorId, f.DoctorName })
                .Select(g => new DoctorReferralSummaryDto
                {
                    DoctorId = g.Key.DoctorId,
                    DoctorName = g.Key.DoctorName,
                    PatientCount = g.Sum(x => x.PatientCount),
                    RevenueGenerated = g.Sum(x => x.RevenueGenerated),
                    TestCount = g.Sum(x => x.TestCount)
                })
                .OrderByDescending(x => x.RevenueGenerated)
                .ToList();

            var rawPartners = await _db.ReferralPartnerFacts
                .Where(f => f.LabId == resolvedLabId && f.Date >= start.Date && f.Date <= end.Date)
                .ToListAsync();

            var partners = rawPartners
                .GroupBy(f => new { f.ReferralPartnerId, f.ReferralPartnerName, f.ReferralPartnerLocation })
                .Select(g => new ReferralPartnerSummaryDto
                {
                    PartnerId = g.Key.ReferralPartnerId,
                    PartnerName = g.Key.ReferralPartnerName,
                    PartnerLocation = g.Key.ReferralPartnerLocation,
                    PatientCount = g.Sum(x => x.PatientCount),
                    RevenueGenerated = g.Sum(x => x.RevenueGenerated),
                    TestCount = g.Sum(x => x.TestCount)
                })
                .OrderByDescending(x => x.RevenueGenerated)
                .ToList();

            return new ReferralsSummaryDto { Doctors = doctors, Partners = partners };
        }
    }
}
