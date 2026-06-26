using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class BusinessSourceService
    {
        private readonly MiddlewareDbContext _db;

        public BusinessSourceService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<BusinessSourcesSummaryDto> GetAsync(string resolvedLabId, DateTime? startDate, DateTime? endDate, string? sourceType)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var query = _db.BusinessSourceFacts
                .Where(f => f.LabId == resolvedLabId && f.Date >= start.Date && f.Date <= end.Date);

            if (!string.IsNullOrEmpty(sourceType) && Enum.TryParse<BusinessSourceType>(sourceType, true, out var parsedType))
            {
                query = query.Where(f => f.SourceType == parsedType);
            }

            var rawFacts = await query.ToListAsync();

            var sources = rawFacts
                .GroupBy(f => new { f.SourceType, f.SourceId, f.SourceName, f.IsFirstVisit })
                .Select(g => new BusinessSourceItemDto
                {
                    SourceType = g.Key.SourceType.ToString(),
                    SourceId = g.Key.SourceId,
                    SourceName = g.Key.SourceName,
                    IsFirstVisit = g.Key.IsFirstVisit,
                    PatientCount = g.Sum(x => x.PatientCount),
                    RevenueGenerated = g.Sum(x => x.RevenueGenerated),
                    TestCount = g.Sum(x => x.TestCount)
                })
                .OrderByDescending(x => x.RevenueGenerated)
                .ToList();

            return new BusinessSourcesSummaryDto { LabId = resolvedLabId, Sources = sources };
        }
    }
}
