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
using SynOS.Models.Entities.Revenue; // ADDED: Revenue Engine Link

namespace SynOS.Services.Operational
{
    public interface IOperationalStatsProjector
    {
        Task EnsureStateConsistencyAsync(System.Threading.CancellationToken cancellationToken);
        Task ProjectPendingEventsAsync(System.Threading.CancellationToken cancellationToken = default);
    }

    public class OperationalStatsProjector : IOperationalStatsProjector
    {
        private readonly SynOSDbContext _context;
        private readonly IDashboardNotificationService _notificationService; // CHANGED
        private readonly ILogger<OperationalStatsProjector> _logger;

        public OperationalStatsProjector(
            SynOSDbContext context,
            IDashboardNotificationService notificationService,
            ILogger<OperationalStatsProjector> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task EnsureStateConsistencyAsync(CancellationToken cancellationToken)
        {
            // Self-Healing: If Stats are empty (or Zero) for today, but we have processed events, we have a "Split Brain".
            
            // 1. Get Actual Stats
            var statsToday = await _context.UserOperationalStats
                .FirstOrDefaultAsync(s => s.Date == DateTime.Today, cancellationToken);

            // 2. Get Processed Extensions Log Count
            var processedEventCount = await _context.ProcessedProjectionEvents
                .Where(p => p.ProjectionName == "OperationalStats" && p.ProcessedAt >= DateTime.Today)
                .CountAsync(cancellationToken);

            bool needsReset = false;

            if (statsToday == null && processedEventCount > 0)
            {
                _logger.LogWarning("Consistency Check: No Stats found for today (Null Row), but {Count} events processed.", processedEventCount);
                needsReset = true;
            }
            else if (statsToday != null)
            {
                 // Check for "Partial Zombie" State (WalkIns detected but Money is Zero - likely logic mismatch)
                 // We do this checking regardless of processedEventCount because we might have purged logs before but failed to reset stats.
                 
                 if (statsToday.WalkInsCount == 0 && statsToday.PaymentsTotal == 0 && processedEventCount > 0)
                 {
                      _logger.LogWarning("Consistency Check: Stats exist but are ALL ZERO (WalkIns=0, Total=0). Stale State.", processedEventCount);
                      needsReset = true;
                 }
                 else if (statsToday.WalkInsCount > 0 && statsToday.PaymentsTotal == 0)
                 {
                      _logger.LogWarning("Consistency Check: PARTIAL STATE DETECTED (WalkIns={WalkIns}, Payments=0). Force-Resetting to correct data.", statsToday.WalkInsCount);
                      needsReset = true;
                 }
            }
            
            // Check for SILENT FAILURE (No logs, but events exist) - e.g. after a purge
            if (!needsReset && processedEventCount == 0)
            {
                var eventsToday = await _context.BranchOperationalEvents
                    .CountAsync(e => e.OccurredAt >= DateTime.UtcNow.Date.AddHours(-1) && e.OccurredAt < DateTime.UtcNow.AddDays(1), cancellationToken); // Check recent window
                
                if (eventsToday > 0)
                {
                    _logger.LogWarning("Consistency Check: SILENT FAILURE DETECTED. {Count} events exist, but 0 processed logs. Force-Replay required.", eventsToday);
                    needsReset = true;
                }
            }

            if (needsReset)
            {
                if (processedEventCount > 0)
                {
                    _logger.LogWarning("Consistency Check: PURGING {Count} projection logs to force Replay.", processedEventCount);
                    var entries = await _context.ProcessedProjectionEvents
                        .Where(p => p.ProjectionName == "OperationalStats" && p.ProcessedAt >= DateTime.Today)
                        .ToListAsync(cancellationToken);
                    _context.ProcessedProjectionEvents.RemoveRange(entries);
                }
                
                // CRITICAL: Reset the Stats Row to 0 before Replay to avoid Double Counting (since logic is +=)
                if (statsToday != null)
                {
                    _logger.LogWarning("Consistency Check: RESETTING UserOperationalStats to 0.");
                    statsToday.WalkInsCount = 0;
                    statsToday.PaymentsTotal = 0;
                    statsToday.PaymentsCashTotal = 0;
                    statsToday.PaymentsOnlineTotal = 0;
                    statsToday.PaymentsOnlineCount = 0;
                    statsToday.PrepaidBillsCount = 0;
                    statsToday.PrepaidBillsTotal = 0;
                    statsToday.ReportTatTotalMinutes = 0;
                    statsToday.ReportTatCount = 0;
                }
                
                await _context.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("Consistency Check: Purge & Reset complete. Projector will now Replay events.");
            }
        }

        public async Task ProjectPendingEventsAsync(System.Threading.CancellationToken cancellationToken = default)
        {
            // 1. Fetch unprocessed events for ALL branches (Safety window: last 5 minutes to catch immediate consistency)
            // We use ProcessedProjectionEvents to filter.
            
            var recentEvents = await _context.BranchOperationalEvents
                .Where(e => e.OccurredAt > DateTime.UtcNow.AddHours(-24))
                .OrderBy(e => e.OccurredAt)
                .ToListAsync(cancellationToken);

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
                            // STRATEGY: Support "RevenueFact" (New), "PaymentConfirmedFact" (ReceptionFlow), and "Payment" (Legacy Invoice)
                            
                            // A. Revenue Fact (Preferred - Future)
                            if (evt.SourceId.HasValue && evt.SourceType == "RevenueFact")
                            {
                                var fact = await _context.RevenueFacts.FindAsync(evt.SourceId.Value);
                                if (fact != null)
                                {
                                     userStats.PaymentsTotal += fact.Amount;
                                     if (fact.PaymentMode == PaymentMode.Cash || fact.PaymentMode == PaymentMode.Other) 
                                     {
                                         // Default 'Other' to Cash to recover legacy/untrimmed data
                                         userStats.PaymentsCashTotal += fact.Amount;
                                     }
                                     else if (fact.PaymentMode == PaymentMode.UPI || fact.PaymentMode == PaymentMode.Card || fact.PaymentMode == PaymentMode.BankTransfer) {
                                         userStats.PaymentsOnlineTotal += fact.Amount;
                                         userStats.PaymentsOnlineCount++;
                                     }
                                     await CheckAndIncrementWalkInAsync(userStats, Guid.Parse(fact.SourceReferenceId), evt.SourceId.Value);
                                     updated = true;
                                }
                            }
                            // B. Payment Confirmed Fact (Reception Flow Service)
                            else if (evt.SourceId.HasValue && evt.SourceType == "PaymentConfirmedFact")
                            {
                                var fact = await _context.PaymentConfirmedFacts.FindAsync(evt.SourceId.Value);
                                if (fact != null)
                                {
                                    _logger.LogWarning("Projecting PaymentConfirmedFact {FactId}. Amount: {Amount}. Channel: '{Channel}'", fact.PaymentId, fact.Amount, fact.Channel);

                                    userStats.PaymentsTotal += fact.Amount;
                                    
                                    var channelNorm = fact.Channel?.Trim().ToLowerInvariant();
                                    
                                    if (channelNorm == "cash") 
                                    {
                                        userStats.PaymentsCashTotal += fact.Amount;
                                    }
                                    else if (channelNorm == "upi" || channelNorm == "card") 
                                    {
                                        userStats.PaymentsOnlineTotal += fact.Amount;
                                        userStats.PaymentsOnlineCount++;
                                    }
                                    else 
                                    {
                                        _logger.LogWarning("PaymentConfirmedFact {FactId} has unknown Channel '{Channel}'. Skipping split totals.", fact.PaymentId, fact.Channel);
                                    }
                                    
                                    // Need Visit ID. PaymentConfirmedFact has ReferenceId -> Payment -> Invoice -> Visit
                                    if (Guid.TryParse(evt.VisitId, out var visitIdFromEvent))
                                    {
                                        await CheckAndIncrementWalkInAsync(userStats, visitIdFromEvent, evt.SourceId.Value);
                                        updated = true;
                                    }
                                }
                                else
                                {
                                     _logger.LogError("PaymentConfirmedFact {FactId} NOT FOUND during projection!", evt.SourceId.Value);
                                }
                            }
                            // C. Payment Entity (Legacy Invoice Service)
                            else if (evt.SourceId.HasValue && evt.SourceType == "Payment") 
                            {
                                 var payment = await _context.Payments
                                     .Include(p => p.Invoice)
                                     .FirstOrDefaultAsync(p => p.PaymentId == evt.SourceId.Value);

                                 if (payment != null)
                                 {
                                     _logger.LogWarning("Projecting Legacy Payment {PaymentId}. Amount: {Amount}. Method: '{Method}'", payment.PaymentId, payment.Amount, payment.Method);

                                     userStats.PaymentsTotal += payment.Amount;
                                     
                                     var methodNorm = payment.Method?.Trim().ToLowerInvariant();

                                     // LOGIC UPDATE: Default to Cash for Null/Empty/0/Unknown to ensure visibility
                                     if (string.IsNullOrEmpty(methodNorm) || methodNorm == "cash" || methodNorm == "0") 
                                     {
                                        userStats.PaymentsCashTotal += payment.Amount;
                                     }
                                     else if (methodNorm == "upi" || methodNorm == "card" || methodNorm == "1" || methodNorm == "2") 
                                     {
                                         userStats.PaymentsOnlineTotal += payment.Amount;
                                         userStats.PaymentsOnlineCount++;
                                     }
                                     else
                                     {
                                         // Catch-all: If it's something weird (e.g. "Check"), treat as Cash for now to avoid "Zero Money" bug.
                                         _logger.LogWarning("Legacy Payment {PaymentId} has Method '{Method}'. Defaulting to CASH to ensure visibility.", payment.PaymentId, payment.Method);
                                         userStats.PaymentsCashTotal += payment.Amount;
                                     }

                                     if (payment.Invoice?.VisitId != null)
                                     {
                                         await CheckAndIncrementWalkInAsync(userStats, payment.Invoice.VisitId, evt.SourceId.Value);
                                     }
                                     updated = true;
                                 }
                            }
                            break;

                        case BranchEventType.RECEIVABLE_CREATED:
                            if (evt.SourceId.HasValue)
                            {
                                var fact = await _context.ReceivableFacts.FindAsync(evt.SourceId.Value);
                                if (fact != null)
                                {
                                    _logger.LogWarning("Projecting Receivable {FactId}. Amount: {Amount}. Current Total: {CurrentTotal}", fact.ReceivableFactId, fact.Amount, userStats.PrepaidBillsTotal);
                                    
                                    userStats.PrepaidBillsCount++;
                                    userStats.PrepaidBillsTotal += fact.Amount;
                                    
                                    await CheckAndIncrementWalkInAsync(userStats, fact.SourceVisitId, evt.SourceId.Value);
                                    updated = true;
                                    
                                    _logger.LogWarning("New Total: {NewTotal}. WalkIns: {WalkIns}", userStats.PrepaidBillsTotal, userStats.WalkInsCount);
                                }
                                else
                                {
                                    _logger.LogError("ReceivableFact {FactId} NOT FOUND during projection", evt.SourceId.Value);
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
            await _notificationService.NotifyActionQueueUpdatedAsync(userId.ToString());
        }
    }
}