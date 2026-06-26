using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class DemographicsService
    {
        private readonly MiddlewareDbContext _db;

        public DemographicsService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<DemographicsSummaryDto> GetAsync(string resolvedLabId, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var rawFacts = await _db.PatientDemographicFacts
                .Where(f => f.LabId == resolvedLabId && f.Date >= start.Date && f.Date <= end.Date)
                .ToListAsync();

            var data = rawFacts
                .GroupBy(f => new { f.AgeGroup, f.Gender })
                .Select(g => new DemographicMetricDto
                {
                    AgeGroup = g.Key.AgeGroup,
                    Gender = g.Key.Gender,
                    PatientCount = g.Sum(x => x.PatientCount),
                    Revenue = g.Sum(x => x.Revenue),
                    TestCount = g.Sum(x => x.TestCount)
                })
                .ToList();

            return new DemographicsSummaryDto { Metrics = data };
        }
    }
}
