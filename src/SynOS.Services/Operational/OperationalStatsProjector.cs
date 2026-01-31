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
            // AUDIT-ONLY MODE: Financial projections are event-driven. No polling-based mutation allowed.
            
            // 1. Get Actual Stats
            var statsToday = await _context.UserOperationalStats
                .FirstOrDefaultAsync(s => s.Date == DateTime.Today, cancellationToken);

            // 2. Get Processed Extensions Log Count
            var processedEventCount = await _context.ProcessedProjectionEvents
                .Where(p => p.ProjectionName == "OperationalStats" && p.ProcessedAt >= DateTime.Today)
                .CountAsync(cancellationToken);

            // 3. Audit Check (No Mutation)
            if (statsToday == null && processedEventCount > 0)
            {
                _logger.LogCritical("AUDIT FAILURE: UserOperationalStats Missing but {Count} Events Processed. Manual Replay Required.", processedEventCount);
            }
            else if (statsToday != null)
            {
                // Heuristic Check for Double Counting (e.g. 2400 instead of 1200)
                if (statsToday.PaymentsOnlineTotal == 2400 || statsToday.PaymentsOnlineTotal == 2100)
                {
                     _logger.LogCritical("AUDIT FAILURE: Suspicious Payment Total ({Total}) detected. Possible Double Counting. Manual Reset Required.", statsToday.PaymentsOnlineTotal);
                }
                
                // Zero-money check
                if (statsToday.WalkInsCount > 0 && statsToday.PaymentsTotal == 0)
                {
                     _logger.LogWarning("AUDIT WARNING: WalkIns detected ({Count}) but Zero Revenue. Potential Data Latency.", statsToday.WalkInsCount);
                }
            }
            
            // PREVIOUSLY: This method would force-delete stats or replay events.
            // NOW: Strictly Read-Only. We trust the Event Stream (ProcessEventAsync).
        }

        public async Task ProjectPendingEventsAsync(System.Threading.CancellationToken cancellationToken = default)
        {
            // 1. Fetch unprocessed events for ALL branches (Safety window: last 5 minutes to catch immediate consistency)
            // We use ProcessedProjectionEvents to filter.
            
            var lookbackTime = DateTime.UtcNow.AddHours(-24);
            
            var recentEvents = await _context.BranchOperationalEvents
                .Where(e => e.OccurredAt > lookbackTime)
                .OrderBy(e => e.OccurredAt)
                .ToListAsync(cancellationToken);

            foreach (var evt in recentEvents)
            {
                await ProcessEventAsync(evt);
            }
        }

        private async Task ProcessEventAsync(BranchOperationalEvent evt)
        {
            // PROVISIONAL FIX: Random Jitter to break Race Condition if multiple Worker Instances are running.
            // Logs indicate 2 workers starting. This delay allows one to win the Idempotency race.
            await Task.Delay(Random.Shared.Next(50, 300));

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 2. Idempotency Check (Event ID)
                var isProcessed = await _context.ProcessedProjectionEvents
                    .AnyAsync(p => p.EventId == evt.EventId && p.ProjectionName == "OperationalStats");

                if (isProcessed) return;

                bool updated = false;

                // Parse standard fields (Move UP for scope visibility)
                if (!Guid.TryParse(evt.BranchId, out var branchId)) return;
                var date = evt.OccurredAt.Date;
                Guid userId = Guid.Empty;
                if (evt.ActorType == "User" && !string.IsNullOrEmpty(evt.ActorName))
                {
                    Guid.TryParse(evt.ActorName, out userId);
                }

                // 3. Load/Create State (Move UP for scope visibility)
                var userStats = await GetOrCreateUserStats(userId, branchId, date);
                var branchStats = await GetOrCreateBranchStats(branchId, date);

                // 2b. Strict Deduplication (Source ID) - Prevent processing same Fact twice if multiple events reference it.
                if (evt.SourceId.HasValue)
                {
                     var isFactProcessed = await _context.ProcessedProjectionEvents
                        .Join(_context.BranchOperationalEvents,
                              ppe => ppe.EventId,
                              boe => boe.EventId,
                              (ppe, boe) => boe.SourceId)
                        .AnyAsync(sourceId => sourceId == evt.SourceId);
                     
                     if (isFactProcessed)
                     {
                         _logger.LogWarning("Projector: Duplicate Event for Fact {FactId} detected. Skipping Logic, marking as Processed. EventId: {EventId}", evt.SourceId, evt.EventId);
                         updated = true; // Mark as handled so we can clear the queue
                         goto MarkProcessed; // Skip logic, jump to save
                     }
                }

                // 4. Switch on Event Type
                // 4. Switch on Event Type
                if (Enum.TryParse<BranchEventType>(evt.EventType, out var type))
                {
                    switch (type)
                    {
                        case BranchEventType.VISIT_STARTED:
                            // REMOVED: Walk-in logic moved to Financial Events (Strict Validation)
                            break;

                        case BranchEventType.PAYMENT_RECEIVED:
                            // ARCHITECTURE LOCK: Stats aggregation is fact-driven only. 
                            // Any new aggregation source is an architectural violation.
                            // We ONLY listen to canonical RevenueFacts.

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
                                // HARD LOCK: DISABLED.
                                // We strictly ignore this event to prevent Double Counting.
                                // Only RevenueFact is authoritative.
                                _logger.LogWarning("Projector: Ignoring PaymentConfirmedFact {EventId} (Architecture Lock).", evt.EventId);
                                updated = true; // Mark processed to clear queue
                            }
                            // C. Payment Entity (Legacy Invoice Service)
                            else if (evt.SourceId.HasValue && evt.SourceType == "Payment") 
                            {
                                // HARD LOCK: DISABLED.
                                _logger.LogWarning("Projector: Ignoring Legacy Payment Event {EventId} (Architecture Lock).", evt.EventId);
                                updated = true; // Mark processed to clear queue
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

            MarkProcessed:
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
            // ARCHITECTURE LOCK: We check FACTS only. Reference to Mutable Tables (Payments, Invoices) is FORBIDDEN.
            
            // 1. Check Prior Receivables (Immutable Fact)
            var hasPriorReceivable = await _context.ReceivableFacts
                .AnyAsync(r => r.SourceVisitId == visitId && r.ReceivableFactId != currentFactId);
            
            if (hasPriorReceivable) return; // Already counted via receivable

            // 2. Check Prior Revenue Facts (Immutable Fact)
            // Note: RevenueFact.SourceReferenceId is the VisitId (string).
            var visitIdStr = visitId.ToString();
            
            var hasPriorRevenue = await _context.RevenueFacts
                .AnyAsync(f => f.SourceReferenceId == visitIdStr && f.RevenueFactId != currentFactId);

            if (hasPriorRevenue) return; // Already counted via revenue fact

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