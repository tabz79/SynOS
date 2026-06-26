using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class TrendService
    {
        private readonly MiddlewareDbContext _db;

        public TrendService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<TrendsSummaryDto> GetAsync(string resolvedLabId, int? days)
        {
            var numDays = days ?? 30;
            if (numDays != 7 && numDays != 30 && numDays != 90)
            {
                numDays = 30; // Fallback to 30 days
            }

            var currentStart = DateTime.UtcNow.Date.AddDays(-numDays);
            var currentEnd = DateTime.UtcNow.Date;
            var previousStart = DateTime.UtcNow.Date.AddDays(-numDays * 2);
            var previousEnd = currentStart;

            var trendsData = await _db.TrendFacts
                .Where(f => f.LabId == resolvedLabId && f.Date >= previousStart && f.Date <= currentEnd)
                .ToListAsync();

            // Fetch Doctor & Partner names for friendly display in trends
            var doctorNames = await _db.DoctorReferralFacts
                .Where(f => f.LabId == resolvedLabId && f.DoctorId != "Direct")
                .Select(f => new { f.DoctorId, f.DoctorName })
                .Distinct()
                .ToDictionaryAsync(x => x.DoctorId, x => x.DoctorName);

            var partnerNames = await _db.ReferralPartnerFacts
                .Where(f => f.LabId == resolvedLabId && f.ReferralPartnerId != "Direct")
                .Select(f => new { f.ReferralPartnerId, f.ReferralPartnerName })
                .Distinct()
                .ToDictionaryAsync(x => x.ReferralPartnerId, x => x.ReferralPartnerName);

            var dto = new TrendsSummaryDto();

            // Test volume trends
            dto.Tests = trendsData
                .Where(t => t.EntityType == "Test")
                .GroupBy(t => t.EntityKey)
                .Select(g => {
                    var currentCount = g.Where(x => x.Date >= currentStart).Sum(x => x.Count);
                    var previousCount = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Count);
                    var currentRev = g.Where(x => x.Date >= currentStart).Sum(x => x.Revenue);
                    var previousRev = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Revenue);
                    return new TrendItemDto {
                        Key = g.Key,
                        Name = g.Key,
                        CurrentPeriodCount = currentCount,
                        PreviousPeriodCount = previousCount,
                        CountGrowthRate = previousCount == 0 ? (currentCount > 0 ? 100.0 : 0.0) : Math.Round(((double)(currentCount - previousCount) / previousCount) * 100, 2),
                        CurrentPeriodRevenue = currentRev,
                        PreviousPeriodRevenue = previousRev,
                        RevenueGrowthRate = previousRev == 0 ? (currentRev > 0 ? 100.0 : 0.0) : (double)Math.Round(((currentRev - previousRev) / previousRev) * 100, 2)
                    };
                })
                .OrderByDescending(x => x.CurrentPeriodCount)
                .ToList();

            // Department trends
            dto.Departments = trendsData
                .Where(t => t.EntityType == "Department")
                .GroupBy(t => t.EntityKey)
                .Select(g => {
                    var currentCount = g.Where(x => x.Date >= currentStart).Sum(x => x.Count);
                    var previousCount = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Count);
                    var currentRev = g.Where(x => x.Date >= currentStart).Sum(x => x.Revenue);
                    var previousRev = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Revenue);
                    return new TrendItemDto {
                        Key = g.Key,
                        Name = g.Key,
                        CurrentPeriodCount = currentCount,
                        PreviousPeriodCount = previousCount,
                        CountGrowthRate = previousCount == 0 ? (currentCount > 0 ? 100.0 : 0.0) : Math.Round(((double)(currentCount - previousCount) / previousCount) * 100, 2),
                        CurrentPeriodRevenue = currentRev,
                        PreviousPeriodRevenue = previousRev,
                        RevenueGrowthRate = previousRev == 0 ? (currentRev > 0 ? 100.0 : 0.0) : (double)Math.Round(((currentRev - previousRev) / previousRev) * 100, 2)
                    };
                })
                .OrderByDescending(x => x.CurrentPeriodCount)
                .ToList();

            // Doctor trends
            dto.Doctors = trendsData
                .Where(t => t.EntityType == "Doctor")
                .GroupBy(t => t.EntityKey)
                .Select(g => {
                    var currentCount = g.Where(x => x.Date >= currentStart).Sum(x => x.Count);
                    var previousCount = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Count);
                    var currentRev = g.Where(x => x.Date >= currentStart).Sum(x => x.Revenue);
                    var previousRev = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Revenue);
                    
                    doctorNames.TryGetValue(g.Key, out var docName);
                    var name = string.IsNullOrEmpty(docName) ? (g.Key == "Direct" ? "Self-Referral" : "Unknown Doctor") : docName;

                    return new TrendItemDto {
                        Key = g.Key,
                        Name = name,
                        CurrentPeriodCount = currentCount,
                        PreviousPeriodCount = previousCount,
                        CountGrowthRate = previousCount == 0 ? (currentCount > 0 ? 100.0 : 0.0) : Math.Round(((double)(currentCount - previousCount) / previousCount) * 100, 2),
                        CurrentPeriodRevenue = currentRev,
                        PreviousPeriodRevenue = previousRev,
                        RevenueGrowthRate = previousRev == 0 ? (currentRev > 0 ? 100.0 : 0.0) : (double)Math.Round(((currentRev - previousRev) / previousRev) * 100, 2)
                    };
                })
                .OrderByDescending(x => x.CurrentPeriodRevenue)
                .ToList();

            // Referral partner trends
            dto.Partners = trendsData
                .Where(t => t.EntityType == "ReferralPartner")
                .GroupBy(t => t.EntityKey)
                .Select(g => {
                    var currentCount = g.Where(x => x.Date >= currentStart).Sum(x => x.Count);
                    var previousCount = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Count);
                    var currentRev = g.Where(x => x.Date >= currentStart).Sum(x => x.Revenue);
                    var previousRev = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Revenue);
                    
                    partnerNames.TryGetValue(g.Key, out var partName);
                    var name = string.IsNullOrEmpty(partName) ? (g.Key == "Direct" ? "Direct" : "Unknown Partner") : partName;

                    return new TrendItemDto {
                        Key = g.Key,
                        Name = name,
                        CurrentPeriodCount = currentCount,
                        PreviousPeriodCount = previousCount,
                        CountGrowthRate = previousCount == 0 ? (currentCount > 0 ? 100.0 : 0.0) : Math.Round(((double)(currentCount - previousCount) / previousCount) * 100, 2),
                        CurrentPeriodRevenue = currentRev,
                        PreviousPeriodRevenue = previousRev,
                        RevenueGrowthRate = previousRev == 0 ? (currentRev > 0 ? 100.0 : 0.0) : (double)Math.Round(((currentRev - previousRev) / previousRev) * 100, 2)
                    };
                })
                .OrderByDescending(x => x.CurrentPeriodRevenue)
                .ToList();

            return dto;
        }
    }
}
