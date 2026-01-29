using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Models.Enums;
using SynOS.Models.ReadModels;
using SynOS.Services.Security;
using SynOS.Services.Dashboard; // ADDED
using SynOS.Models.Entities.AR; // ADDED: Stage 1 Financials
using SynOS.Models.Entities.Payments; // ADDED: Stage 1 Financials

namespace SynOS.Services.Operational
{
    public interface IOperationalStatsProjector
    {
        Task ProjectPendingEventsAsync(Guid branchId);
    }

    public class OperationalStatsProjector : IOperationalStatsProjector
    {
        private readonly SynOSDbContext _context;
        private readonly IDashboardNotificationService _notificationService; // CHANGED
        private readonly ILogger<OperationalStatsProjector> _logger;
        private readonly IUserContext _userContext; 

        public OperationalStatsProjector(
            SynOSDbContext context,
            IDashboardNotificationService notificationService,
            ILogger<OperationalStatsProjector> logger,
            IUserContext userContext)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
            _userContext = userContext;
        }

        public async Task ProjectPendingEventsAsync(Guid branchId)
        {
            // 1. Fetch unprocessed events for this branch (Safety window: last 5 minutes to catch immediate consistency)
            // We use ProcessedProjectionEvents to filter.
            
            var recentEvents = await _context.BranchOperationalEvents
                .Where(e => e.BranchId == branchId.ToString() && e.OccurredAt > DateTime.UtcNow.AddMinutes(-5))
                .OrderBy(e => e.OccurredAt)
                .ToListAsync();

            foreach (var evt in recentEvents)
            {
                await ProcessEventAsync(evt);
            }
        }

        private async Task ProcessEventAsync(BranchOperationalEvent evt)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 2. Idempotency Check
                var isProcessed = await _context.ProcessedProjectionEvents
                    .AnyAsync(p => p.EventId == evt.EventId && p.ProjectionName == "OperationalStats");

                if (isProcessed) return;

                // Parse standard fields
                if (!Guid.TryParse(evt.BranchId, out var branchId)) return;
                var date = evt.OccurredAt.Date;
                Guid userId = Guid.Empty;
                if (evt.ActorType == "User" && !string.IsNullOrEmpty(evt.ActorName))
                {
                    Guid.TryParse(evt.ActorName, out userId);
                }

                // 3. Load/Create State
                var userStats = await GetOrCreateUserStats(userId, branchId, date);
                var branchStats = await GetOrCreateBranchStats(branchId, date);

                bool updated = false;

                // 4. Switch on Event Type
                if (Enum.TryParse<BranchEventType>(evt.EventType, out var type))
                {
                    switch (type)
                    {
                        case BranchEventType.VISIT_STARTED:
                            // REMOVED: Walk-in logic moved to Financial Events (Strict Validation)
                            break;

                        case BranchEventType.PAYMENT_RECEIVED:
                            // STAGE 1: Strict Fact Loading
                            if (evt.SourceId.HasValue && evt.SourceType == "PaymentConfirmedFact")
                            {
                                var fact = await _context.PaymentConfirmedFacts.FindAsync(evt.SourceId.Value);
                                if (fact != null)
                                {
                                    // Financial Metrics
                                    userStats.PaymentsTotal += fact.Amount; // Legacy Grand Total
                                    
                                    if (fact.Channel == "Cash")
                                    {
                                        userStats.PaymentsCashTotal += fact.Amount;
                                    }
                                    else if (fact.Channel == "UPI" || fact.Channel == "Card") // Online Bucket
                                    {
                                        userStats.PaymentsOnlineTotal += fact.Amount;
                                        userStats.PaymentsOnlineCount++;
                                    }

                                    // Walk-in Logic (Unique Visit Validation)
                                    // Find Visit ID via Reference
                                    // Note: This relies on mutable Payment existence, but only for Visit ID lookup.
                                    var payment = await _context.Payments
                                        .Include(p => p.Invoice)
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync(p => p.PaymentId == fact.ReferenceId);

                                    if (payment?.Invoice?.VisitId != null)
                                    {
                                        var visitId = payment.Invoice.VisitId;
                                        await CheckAndIncrementWalkInAsync(userStats, visitId, evt.SourceId.Value);
                                    }
                                    
                                    updated = true;
                                }
                            }
                            // Legacy Fallback (if SourceType missing or old event)? 
                            // For now, strict Stage 1 implies we only care about new events.
                            break;

                        case BranchEventType.RECEIVABLE_CREATED:
                            if (evt.SourceId.HasValue)
                            {
                                var fact = await _context.ReceivableFacts.FindAsync(evt.SourceId.Value);
                                if (fact != null)
                                {
                                    userStats.PrepaidBillsCount++;
                                    userStats.PrepaidBillsTotal += fact.Amount;
                                    
                                    await CheckAndIncrementWalkInAsync(userStats, fact.SourceVisitId, evt.SourceId.Value);
                                    updated = true;
                                }
                            }
                            break;

                        case BranchEventType.SAMPLE_COLLECTED:
                            branchStats.PendingReportsCount++;
                            updated = true;
                            break;

                        case BranchEventType.REPORT_SIGNED:
                            branchStats.PendingReportsCount--;
                            if (Guid.TryParse(evt.TokenId, out var reportId))
                            {
                                var report = await _context.Reports.FindAsync(reportId);
                                if (report != null && report.SignedAt.HasValue)
                                {
                                    if (report.SourceType == "Order") 
                                    {
                                        var sample = await _context.Samples
                                            .Where(s => s.OrderId == report.SourceId && s.CollectedAt.HasValue)
                                            .FirstOrDefaultAsync();
                                        
                                        if (sample != null)
                                        {
                                            var tat = (report.SignedAt.Value - sample.CollectedAt.Value).TotalMinutes;
                                            if (tat > 0)
                                            {
                                                userStats.ReportTatTotalMinutes += tat;
                                                userStats.ReportTatCount++;
                                                updated = true;
                                            }
                                        }
                                    }
                                }
                            }
                            updated = true;
                            break;
                    }
                }

                if (updated)
                {
                    userStats.LastUpdated = DateTime.UtcNow;
                    branchStats.LastUpdated = DateTime.UtcNow;
                    
                    _context.ProcessedProjectionEvents.Add(new ProcessedProjectionEvent
                    {
                        EventId = evt.EventId,
                        ProjectionName = "OperationalStats",
                        ProcessedAt = DateTime.UtcNow
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    if (userId != Guid.Empty)
                    {
                        await PushUpdateAsync(userId, branchId, date);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error projecting event {EventId}", evt.EventId);
            }
        }

        private async Task CheckAndIncrementWalkInAsync(UserOperationalStats stats, Guid visitId, Guid currentFactId)
        {
            // Definition: "Unique Visit where a Payment/Receivable was Accepted".
            // We check if ANY prior financial fact exists for this visit.
            
            // 1. Check Receivables
            var hasPriorReceivable = await _context.ReceivableFacts
                .AnyAsync(r => r.SourceVisitId == visitId && r.ReceivableFactId != currentFactId);
            
            if (hasPriorReceivable) return; // Already counted via receivable

            // 2. Check Payments
            var paymentIds = _context.Payments
                .Where(p => p.Invoice.VisitId == visitId)
                .Select(p => p.PaymentId);

            var hasPriorPayment = await _context.PaymentConfirmedFacts
                .AnyAsync(f => paymentIds.Contains(f.ReferenceId.Value) && f.PaymentId != currentFactId); // ReferenceId is nullable but in this flow always set

            if (hasPriorPayment) return; // Already counted via payment

            // If no prior facts, this is the first (statistically unique visit validation)
            stats.WalkInsCount++;
        }

        private async Task<UserOperationalStats> GetOrCreateUserStats(Guid userId, Guid branchId, DateTime date)
        {
            var localStats = _context.UserOperationalStats.Local
                .FirstOrDefault(x => x.UserId == userId && x.BranchId == branchId && x.Date == date);
            
            if (localStats != null) return localStats;

            var stats = await _context.UserOperationalStats
                .FirstOrDefaultAsync(x => x.UserId == userId && x.BranchId == branchId && x.Date == date);

            if (stats == null)
            {
                stats = new UserOperationalStats
                {
                    UserId = userId,
                    BranchId = branchId,
                    Date = date,
                    LastUpdated = DateTime.UtcNow
                };
                _context.UserOperationalStats.Add(stats);
            }
            return stats;
        }

        private async Task<BranchOperationalStats> GetOrCreateBranchStats(Guid branchId, DateTime date)
        {
            var localStats = _context.BranchOperationalStats.Local
                .FirstOrDefault(x => x.BranchId == branchId && x.Date == date);

            if (localStats != null) return localStats;

            var stats = await _context.BranchOperationalStats
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Date == date);

            if (stats == null)
            {
                stats = new BranchOperationalStats
                {
                    BranchId = branchId,
                    Date = date,
                    LastUpdated = DateTime.UtcNow
                };
                _context.BranchOperationalStats.Add(stats);
            }
            return stats;
        }

        private async Task PushUpdateAsync(Guid userId, Guid branchId, DateTime date)
        {
            var uStats = await _context.UserOperationalStats.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId && x.BranchId == branchId && x.Date == date);
            var bStats = await _context.BranchOperationalStats.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Date == date);

            if (uStats == null || bStats == null) return;

            var summary = new TodaysSummaryDto
            {
                WalkInsToday = uStats.WalkInsCount,
                PaymentsCollected = uStats.PaymentsTotal,
                PaymentsCashTotal = uStats.PaymentsCashTotal,
                PaymentsOnlineTotal = uStats.PaymentsOnlineTotal,
                PaymentsOnlineCount = uStats.PaymentsOnlineCount,
                PrepaidBillsCount = uStats.PrepaidBillsCount,
                PrepaidBillsTotal = uStats.PrepaidBillsTotal,
                PendingReports = bStats.PendingReportsCount,
                AvgReportTimeMinutes = uStats.ReportTatCount > 0 
                    ? Math.Round(uStats.ReportTatTotalMinutes / uStats.ReportTatCount, 2) 
                    : 0
            };

            await _notificationService.NotifyReceptionSummaryUpdateAsync(userId.ToString(), summary);
        }
    }
}