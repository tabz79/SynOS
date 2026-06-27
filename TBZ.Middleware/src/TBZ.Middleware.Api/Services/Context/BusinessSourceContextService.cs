using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services.Context
{
    public class BusinessSourceContextService
    {
        private readonly MiddlewareDbContext _db;

        public BusinessSourceContextService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<List<BusinessSourceContextItemDto>> GetBusinessSourcesAsync(string labId, DateTime? startDate, DateTime? endDate, int limit, string? q = null)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var query = _db.BusinessSourceFacts
                .Where(f => f.LabId == labId && f.Date >= start.Date && f.Date <= end.Date);

            if (!string.IsNullOrEmpty(q))
            {
                query = query.Where(f => f.SourceName.Contains(q) || f.SourceId.Contains(q));
            }

            var rawFacts = await query.ToListAsync();

            var groups = rawFacts
                .GroupBy(f => new { f.SourceType, f.SourceId, f.SourceName, f.IsFirstVisit })
                .Select(g => new
                {
                    g.Key.SourceType,
                    g.Key.SourceId,
                    g.Key.SourceName,
                    g.Key.IsFirstVisit,
                    TotalPatients = g.Sum(x => x.PatientCount),
                    TotalRevenueGenerated = g.Sum(x => x.RevenueGenerated),
                    TotalTests = g.Sum(x => x.TestCount),
                    FirstReferralDate = g.Min(x => (DateTime?)x.Date),
                    LatestReferralDate = g.Max(x => (DateTime?)x.Date)
                })
                .OrderByDescending(x => x.TotalRevenueGenerated)
                .Take(limit)
                .ToList();

            var result = new List<BusinessSourceContextItemDto>();
            foreach (var src in groups)
            {
                var srcFacts = rawFacts.Where(f => f.SourceId == src.SourceId && f.SourceType == src.SourceType).ToList();

                var monthlyTrend = srcFacts
                    .GroupBy(f => f.Date.ToString("yyyy-MM"))
                    .Select(tg => new TrendPointDto
                    {
                        Period = tg.Key,
                        PatientCount = tg.Sum(x => x.PatientCount),
                        Revenue = tg.Sum(x => x.RevenueGenerated),
                        TestCount = tg.Sum(x => x.TestCount)
                    })
                    .OrderBy(x => x.Period)
                    .ToList();

                var weeklyTrend = srcFacts
                    .GroupBy(f => GetIso8601WeekOfYear(f.Date))
                    .Select(tg => new TrendPointDto
                    {
                        Period = tg.Key,
                        PatientCount = tg.Sum(x => x.PatientCount),
                        Revenue = tg.Sum(x => x.RevenueGenerated),
                        TestCount = tg.Sum(x => x.TestCount)
                    })
                    .OrderBy(x => x.Period)
                    .ToList();

                var dailyTrend = srcFacts
                    .GroupBy(f => f.Date.ToString("yyyy-MM-dd"))
                    .Select(tg => new TrendPointDto
                    {
                        Period = tg.Key,
                        PatientCount = tg.Sum(x => x.PatientCount),
                        Revenue = tg.Sum(x => x.RevenueGenerated),
                        TestCount = tg.Sum(x => x.TestCount)
                    })
                    .OrderBy(x => x.Period)
                    .ToList();

                result.Add(new BusinessSourceContextItemDto
                {
                    SourceType = src.SourceType.ToString(),
                    SourceId = src.SourceId,
                    SourceName = src.SourceName,
                    IsFirstVisit = src.IsFirstVisit,
                    TotalPatients = src.TotalPatients,
                    TotalRevenueGenerated = src.TotalRevenueGenerated,
                    TotalTests = src.TotalTests,
                    FirstReferralDate = src.FirstReferralDate,
                    LatestReferralDate = src.LatestReferralDate,
                    MonthlyTrend = monthlyTrend,
                    WeeklyTrend = weeklyTrend,
                    DailyTrend = dailyTrend
                });
            }

            return result;
        }

        public async Task<BusinessSourceContextItemDto?> GetBusinessSourceByIdAsync(string labId, string sourceId, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var rawFacts = await _db.BusinessSourceFacts
                .Where(f => f.LabId == labId && f.SourceId == sourceId && f.Date >= start.Date && f.Date <= end.Date)
                .ToListAsync();

            if (!rawFacts.Any())
            {
                return null;
            }

            var first = rawFacts.First();
            var totalPatients = rawFacts.Sum(x => x.PatientCount);
            var totalRevenue = rawFacts.Sum(x => x.RevenueGenerated);
            var totalTests = rawFacts.Sum(x => x.TestCount);
            var minDate = rawFacts.Min(x => (DateTime?)x.Date);
            var maxDate = rawFacts.Max(x => (DateTime?)x.Date);

            var monthlyTrend = rawFacts
                .GroupBy(f => f.Date.ToString("yyyy-MM"))
                .Select(tg => new TrendPointDto
                {
                    Period = tg.Key,
                    PatientCount = tg.Sum(x => x.PatientCount),
                    Revenue = tg.Sum(x => x.RevenueGenerated),
                    TestCount = tg.Sum(x => x.TestCount)
                })
                .OrderBy(x => x.Period)
                .ToList();

            var weeklyTrend = rawFacts
                .GroupBy(f => GetIso8601WeekOfYear(f.Date))
                .Select(tg => new TrendPointDto
                {
                    Period = tg.Key,
                    PatientCount = tg.Sum(x => x.PatientCount),
                    Revenue = tg.Sum(x => x.RevenueGenerated),
                    TestCount = tg.Sum(x => x.TestCount)
                })
                .OrderBy(x => x.Period)
                .ToList();

            var dailyTrend = rawFacts
                .GroupBy(f => f.Date.ToString("yyyy-MM-dd"))
                .Select(tg => new TrendPointDto
                {
                    Period = tg.Key,
                    PatientCount = tg.Sum(x => x.PatientCount),
                    Revenue = tg.Sum(x => x.RevenueGenerated),
                    TestCount = tg.Sum(x => x.TestCount)
                })
                .OrderBy(x => x.Period)
                .ToList();

            return new BusinessSourceContextItemDto
            {
                SourceType = first.SourceType.ToString(),
                SourceId = sourceId,
                SourceName = first.SourceName,
                IsFirstVisit = first.IsFirstVisit,
                TotalPatients = totalPatients,
                TotalRevenueGenerated = totalRevenue,
                TotalTests = totalTests,
                FirstReferralDate = minDate,
                LatestReferralDate = maxDate,
                MonthlyTrend = monthlyTrend,
                WeeklyTrend = weeklyTrend,
                DailyTrend = dailyTrend
            };
        }

        private static string GetIso8601WeekOfYear(DateTime time)
        {
            System.Globalization.Calendar cal = System.Globalization.CultureInfo.InvariantCulture.Calendar;
            DayOfWeek day = cal.GetDayOfWeek(time);
            if (day >= DayOfWeek.Monday && day <= DayOfWeek.Wednesday)
            {
                time = time.AddDays(3);
            }
            int week = cal.GetWeekOfYear(time, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
            return $"{time.Year}-W{week:D2}";
        }
    }
}
