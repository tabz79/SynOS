using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payments;
using SynOS.Models.Enums.BusinessIntelligence;
using SynOS.Models.ReadModels.BusinessIntelligence;

namespace SynOS.Services.BusinessIntelligence
{
    /// <summary>
    /// Implementation of the Business Intelligence Service.
    /// This service provides read-only aggregations and summaries for high-level visibility.
    /// </summary>
    public class BusinessIntelligenceService : IBusinessIntelligenceService
    {
        private readonly SynOSDbContext _context;

        public BusinessIntelligenceService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<SpendSummaryView> GetSpendSummaryAsync(DateTimeOffset from, DateTimeOffset to, string currency)
        {
            var spendFacts = await _context.SpendFacts
                .AsNoTracking()
                .Where(f => f.OccurredAt >= from && f.OccurredAt <= to && f.Currency == currency)
                .ToListAsync();

            if (!spendFacts.Any())
            {
                return new SpendSummaryView { PeriodStart = from, PeriodEnd = to, Currency = currency };
            }
            
            var totalSpend = spendFacts.Sum(f => f.Amount);
            var breakdown = spendFacts.GroupBy(f => f.Channel)
                                         .Select(g => new BreakdownItem
                                         {
                                             Category = g.Key,
                                             Amount = g.Sum(f => f.Amount)
                                         })
                                         .ToList();

            return new SpendSummaryView
            {
                PeriodStart = from,
                PeriodEnd = to,
                TotalSpend = totalSpend,
                Currency = currency,
                BreakdownByChannel = breakdown
            };
        }

        public async Task<RevenueSummaryView> GetRevenueSummaryAsync(DateTimeOffset from, DateTimeOffset to, string currency)
        {
            var revenueFacts = await _context.RevenueFacts
                .AsNoTracking()
                .Where(f => f.OccurredAt >= from && f.OccurredAt <= to && f.Currency == currency)
                .ToListAsync();

            if (!revenueFacts.Any())
            {
                return new RevenueSummaryView { PeriodStart = from, PeriodEnd = to, Currency = currency };
            }
            
            var totalRevenue = revenueFacts.Sum(f => f.Direction == Models.Entities.Revenue.RevenueDirection.Inflow ? f.Amount : -f.Amount);
            var breakdown = revenueFacts.GroupBy(f => f.SourceType)
                                         .Select(g => new BreakdownItem
                                         {
                                             Category = g.Key.ToString(),
                                             Amount = g.Sum(f => f.Direction == Models.Entities.Revenue.RevenueDirection.Inflow ? f.Amount : -f.Amount)
                                         })
                                         .ToList();
            return new RevenueSummaryView
            {
                PeriodStart = from,
                PeriodEnd = to,
                TotalRevenue = totalRevenue,
                Currency = currency,
                BreakdownBySourceType = breakdown
            };
        }

        public Task<CashflowSummaryView> GetCashflowSummaryAsync(DateTimeOffset from, DateTimeOffset to)
        {
            // The PaymentConfirmationFact layer is currently deferred.
            // This method returns an empty summary to avoid compilation errors and indicate that the feature is not active.
            return Task.FromResult(new CashflowSummaryView
            {
                PeriodStart = from,
                PeriodEnd = to,
                CashIn = 0,
                CashOut = 0,
                NetCashflow = 0,
                Currency = "N/A"
            });
        }

        public async Task<VolumeTrendView> GetVolumeTrendsAsync(VolumeMetricType metricType, DateTimeOffset from, DateTimeOffset to)
        {
            var points = new List<TimeSeriesPoint>();
            
            switch (metricType)
            {
                case VolumeMetricType.TestCount:
                    points = await _context.Orders
                        .AsNoTracking()
                        .Where(o => o.CreatedAt >= from && o.CreatedAt <= to)
                        .GroupBy(o => o.CreatedAt.Date)
                        .Select(g => new TimeSeriesPoint { Timestamp = g.Key, Value = g.Count() })
                        .OrderBy(p => p.Timestamp)
                        .ToListAsync();
                    break;
                case VolumeMetricType.ConsumableVolume:
                    points = await _context.CostAttribution_UsageFacts
                        .AsNoTracking()
                        .Where(f => f.OccurredAt >= from && f.OccurredAt <= to)
                        .GroupBy(f => f.OccurredAt.Date)
                        .Select(g => new TimeSeriesPoint { Timestamp = g.Key, Value = g.Sum(f => f.Quantity) })
                        .OrderBy(p => p.Timestamp)
                        .ToListAsync();
                    break;
                default:
                    // Return an empty view for unsupported or unhandled metrics
                    return new VolumeTrendView
                    {
                        MetricName = metricType.ToString(),
                        PeriodStart = from,
                        PeriodEnd = to,
                        TimeSeriesPoints = new List<TimeSeriesPoint>()
                    };
            }

            return new VolumeTrendView
            {
                MetricName = metricType.ToString(),
                PeriodStart = from,
                PeriodEnd = to,
                TimeSeriesPoints = points
            };
        }
    }
}