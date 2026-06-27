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
    public class TestContextService
    {
        private readonly MiddlewareDbContext _db;

        public TestContextService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<List<TestContextItemDto>> GetTopTestsAsync(string labId, DateTime? startDate, DateTime? endDate, int limit, string? q = null)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var query = _db.TestVolumeFacts
                .Where(f => f.LabId == labId && f.Date >= start.Date && f.Date <= end.Date);

            if (!string.IsNullOrEmpty(q))
            {
                query = query.Where(f => f.TestCode.Contains(q) || f.Department.Contains(q));
            }

            var rawFacts = await query.ToListAsync();

            var groups = rawFacts
                .GroupBy(f => new { f.TestCode, f.Department })
                .Select(g => new
                {
                    g.Key.TestCode,
                    g.Key.Department,
                    VolumeCount = g.Sum(x => x.VolumeCount)
                })
                .OrderByDescending(x => x.VolumeCount)
                .Take(limit)
                .ToList();

            var result = new List<TestContextItemDto>();
            foreach (var test in groups)
            {
                var testFacts = rawFacts.Where(f => f.TestCode == test.TestCode).ToList();

                var dailyCounts = testFacts
                    .GroupBy(f => f.Date.ToString("yyyy-MM-dd"))
                    .Select(tg => new TrendPointDto
                    {
                        Period = tg.Key,
                        TestCount = tg.Sum(x => x.VolumeCount)
                    })
                    .OrderBy(x => x.Period)
                    .ToList();

                var weeklyCounts = testFacts
                    .GroupBy(f => GetIso8601WeekOfYear(f.Date))
                    .Select(tg => new TrendPointDto
                    {
                        Period = tg.Key,
                        TestCount = tg.Sum(x => x.VolumeCount)
                    })
                    .OrderBy(x => x.Period)
                    .ToList();

                var monthlyCounts = testFacts
                    .GroupBy(f => f.Date.ToString("yyyy-MM"))
                    .Select(tg => new TrendPointDto
                    {
                        Period = tg.Key,
                        TestCount = tg.Sum(x => x.VolumeCount)
                    })
                    .OrderBy(x => x.Period)
                    .ToList();

                result.Add(new TestContextItemDto
                {
                    TestCode = test.TestCode,
                    Department = test.Department,
                    VolumeCount = test.VolumeCount,
                    DailyCounts = dailyCounts,
                    WeeklyCounts = weeklyCounts,
                    MonthlyCounts = monthlyCounts
                });
            }

            return result;
        }

        public async Task<TestContextItemDto?> GetTestByCodeAsync(string labId, string testCode, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var testFacts = await _db.TestVolumeFacts
                .Where(f => f.LabId == labId && f.TestCode == testCode && f.Date >= start.Date && f.Date <= end.Date)
                .ToListAsync();

            if (!testFacts.Any())
            {
                return null;
            }

            var first = testFacts.First();
            var volumeCount = testFacts.Sum(x => x.VolumeCount);

            var dailyCounts = testFacts
                .GroupBy(f => f.Date.ToString("yyyy-MM-dd"))
                .Select(tg => new TrendPointDto
                {
                    Period = tg.Key,
                    TestCount = tg.Sum(x => x.VolumeCount)
                })
                .OrderBy(x => x.Period)
                .ToList();

            var weeklyCounts = testFacts
                .GroupBy(f => GetIso8601WeekOfYear(f.Date))
                .Select(tg => new TrendPointDto
                {
                    Period = tg.Key,
                    TestCount = tg.Sum(x => x.VolumeCount)
                })
                .OrderBy(x => x.Period)
                .ToList();

            var monthlyCounts = testFacts
                .GroupBy(f => f.Date.ToString("yyyy-MM"))
                .Select(tg => new TrendPointDto
                {
                    Period = tg.Key,
                    TestCount = tg.Sum(x => x.VolumeCount)
                })
                .OrderBy(x => x.Period)
                .ToList();

            return new TestContextItemDto
            {
                TestCode = testCode,
                Department = first.Department,
                VolumeCount = volumeCount,
                DailyCounts = dailyCounts,
                WeeklyCounts = weeklyCounts,
                MonthlyCounts = monthlyCounts
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
