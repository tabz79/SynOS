using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services.Context
{
    public class DemographicsContextService
    {
        private readonly MiddlewareDbContext _db;

        public DemographicsContextService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<DemographicsContextDto> GetDemographicsAsync(string labId, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var rawFacts = await _db.PatientDemographicFacts
                .Where(f => f.LabId == labId && f.Date >= start.Date && f.Date <= end.Date)
                .ToListAsync();

            var ageGroups = rawFacts
                .GroupBy(f => f.AgeGroup)
                .Select(g => new DemographicMetricDto
                {
                    AgeGroup = g.Key,
                    Gender = "All",
                    PatientCount = g.Sum(x => x.PatientCount),
                    Revenue = g.Sum(x => x.Revenue),
                    TestCount = g.Sum(x => x.TestCount)
                })
                .ToList();

            var genders = rawFacts
                .GroupBy(f => f.Gender)
                .Select(g => new DemographicMetricDto
                {
                    AgeGroup = "All",
                    Gender = g.Key,
                    PatientCount = g.Sum(x => x.PatientCount),
                    Revenue = g.Sum(x => x.Revenue),
                    TestCount = g.Sum(x => x.TestCount)
                })
                .ToList();

             var locations = rawFacts
                .GroupBy(f => f.PatientLocation)
                .Select(g => new DemographicLocationMetricDto
                {
                    Location = g.Key,
                    PatientCount = g.Sum(x => x.PatientCount),
                    Revenue = g.Sum(x => x.Revenue),
                    TestCount = g.Sum(x => x.TestCount)
                })
                .ToList();

            var growthHistory = rawFacts
                .GroupBy(f => f.Date.ToString("yyyy-MM-dd"))
                .Select(g => new TrendPointDto
                {
                    Period = g.Key,
                    PatientCount = g.Sum(x => x.PatientCount),
                    Revenue = g.Sum(x => x.Revenue),
                    TestCount = g.Sum(x => x.TestCount)
                })
                .OrderBy(x => x.Period)
                .ToList();

            return new DemographicsContextDto
            {
                AgeGroups = ageGroups,
                Genders = genders,
                Locations = locations,
                GrowthHistory = growthHistory
            };
        }
    }
}
