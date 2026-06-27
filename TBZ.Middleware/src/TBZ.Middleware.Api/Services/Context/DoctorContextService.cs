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
    public class DoctorContextService
    {
        private readonly MiddlewareDbContext _db;

        public DoctorContextService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<List<DoctorContextItemDto>> GetTopDoctorsAsync(string labId, DateTime? startDate, DateTime? endDate, int limit, string? q = null)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var query = _db.DoctorReferralFacts
                .Where(f => f.LabId == labId && f.Date >= start.Date && f.Date <= end.Date);

            if (!string.IsNullOrEmpty(q))
            {
                query = query.Where(f => f.DoctorName.Contains(q) || f.DoctorId.Contains(q));
            }

            var rawFacts = await query.ToListAsync();

            var groups = rawFacts
                .GroupBy(f => new { f.DoctorId, f.DoctorName })
                .Select(g => new
                {
                    g.Key.DoctorId,
                    g.Key.DoctorName,
                    TotalPatients = g.Sum(x => x.PatientCount),
                    TotalRevenueGenerated = g.Sum(x => x.RevenueGenerated),
                    TotalTests = g.Sum(x => x.TestCount),
                    FirstReferralDate = g.Min(x => (DateTime?)x.Date),
                    LatestReferralDate = g.Max(x => (DateTime?)x.Date)
                })
                .OrderByDescending(x => x.TotalRevenueGenerated)
                .Take(limit)
                .ToList();

            var result = new List<DoctorContextItemDto>();
            foreach (var doc in groups)
            {
                var docFacts = rawFacts.Where(f => f.DoctorId == doc.DoctorId).ToList();

                var monthlyTrend = docFacts
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

                var weeklyTrend = docFacts
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

                var dailyTrend = docFacts
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

                result.Add(new DoctorContextItemDto
                {
                    DoctorId = doc.DoctorId,
                    DoctorName = doc.DoctorName,
                    TotalPatients = doc.TotalPatients,
                    TotalRevenueGenerated = doc.TotalRevenueGenerated,
                    TotalTests = doc.TotalTests,
                    FirstReferralDate = doc.FirstReferralDate,
                    LatestReferralDate = doc.LatestReferralDate,
                    MonthlyTrend = monthlyTrend,
                    WeeklyTrend = weeklyTrend,
                    DailyTrend = dailyTrend
                });
            }

            return result;
        }

        public async Task<DoctorContextItemDto?> GetDoctorByIdAsync(string labId, string doctorId, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var rawFacts = await _db.DoctorReferralFacts
                .Where(f => f.LabId == labId && f.DoctorId == doctorId && f.Date >= start.Date && f.Date <= end.Date)
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

            return new DoctorContextItemDto
            {
                DoctorId = doctorId,
                DoctorName = first.DoctorName,
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
            var day = CultureInfo.InvariantCulture.Calendar.GetDayOfWeek(time);
            if (day >= DayOfWeek.Monday && day <= DayOfWeek.Wednesday)
            {
                time = time.AddDays(3);
            }
            var week = CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(time, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
            return $"{time.Year}-W{week:D2}";
        }
    }
}
