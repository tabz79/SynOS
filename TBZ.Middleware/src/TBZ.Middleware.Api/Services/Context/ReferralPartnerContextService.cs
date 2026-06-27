using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services.Context
{
    public class ReferralPartnerContextService
    {
        private readonly MiddlewareDbContext _db;

        public ReferralPartnerContextService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<List<ReferralPartnerContextItemDto>> GetTopPartnersAsync(string labId, DateTime? startDate, DateTime? endDate, int limit, string? q = null)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var query = _db.ReferralPartnerFacts
                .Where(f => f.LabId == labId && f.Date >= start.Date && f.Date <= end.Date);

            if (!string.IsNullOrEmpty(q))
            {
                query = query.Where(f => f.ReferralPartnerName.Contains(q) || f.ReferralPartnerLocation.Contains(q) || f.ReferralPartnerId.Contains(q));
            }

            var rawFacts = await query.ToListAsync();

            var groups = rawFacts
                .GroupBy(f => new { f.ReferralPartnerId, f.ReferralPartnerName, f.ReferralPartnerLocation })
                .Select(g => new
                {
                    g.Key.ReferralPartnerId,
                    g.Key.ReferralPartnerName,
                    g.Key.ReferralPartnerLocation,
                    TotalPatients = g.Sum(x => x.PatientCount),
                    TotalRevenueGenerated = g.Sum(x => x.RevenueGenerated),
                    TotalTests = g.Sum(x => x.TestCount),
                    FirstReferralDate = g.Min(x => (DateTime?)x.Date),
                    LatestReferralDate = g.Max(x => (DateTime?)x.Date)
                })
                .OrderByDescending(x => x.TotalRevenueGenerated)
                .Take(limit)
                .ToList();

            var result = new List<ReferralPartnerContextItemDto>();
            foreach (var partner in groups)
            {
                var partnerFacts = rawFacts.Where(f => f.ReferralPartnerId == partner.ReferralPartnerId).ToList();

                var monthlyTrend = partnerFacts
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

                var weeklyTrend = partnerFacts
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

                var dailyTrend = partnerFacts
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

                result.Add(new ReferralPartnerContextItemDto
                {
                    PartnerId = partner.ReferralPartnerId,
                    PartnerName = partner.ReferralPartnerName,
                    PartnerLocation = partner.ReferralPartnerLocation,
                    TotalPatients = partner.TotalPatients,
                    TotalRevenueGenerated = partner.TotalRevenueGenerated,
                    TotalTests = partner.TotalTests,
                    FirstReferralDate = partner.FirstReferralDate,
                    LatestReferralDate = partner.LatestReferralDate,
                    MonthlyTrend = monthlyTrend,
                    WeeklyTrend = weeklyTrend,
                    DailyTrend = dailyTrend
                });
            }

            return result;
        }

        public async Task<ReferralPartnerContextItemDto?> GetPartnerByIdAsync(string labId, string partnerId, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var rawFacts = await _db.ReferralPartnerFacts
                .Where(f => f.LabId == labId && f.ReferralPartnerId == partnerId && f.Date >= start.Date && f.Date <= end.Date)
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

            return new ReferralPartnerContextItemDto
            {
                PartnerId = partnerId,
                PartnerName = first.ReferralPartnerName,
                PartnerLocation = first.ReferralPartnerLocation,
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
