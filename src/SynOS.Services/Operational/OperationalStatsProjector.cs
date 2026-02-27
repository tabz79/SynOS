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
using SynOS.Services.Operational; // ADDED

namespace SynOS.Services.Operational
{
    public interface IOperationalStatsProjector
    {
        Task EnsureStateConsistencyAsync(System.Threading.CancellationToken cancellationToken);
        Task ProjectPendingEventsAsync(System.Threading.CancellationToken cancellationToken = default);
        Task ProjectSingleEventAsync(Guid eventId, System.Threading.CancellationToken cancellationToken = default);
    }

    public class OperationalStatsProjector : IOperationalStatsProjector
    {
        private readonly SynOSDbContext _context;
        private readonly INotifier _notifier; // CHANGED
        private readonly ILogger<OperationalStatsProjector> _logger;

        public OperationalStatsProjector(
            SynOSDbContext context,
            INotifier notifier,
            ILogger<OperationalStatsProjector> logger)
        {
            _context = context;
            _notifier = notifier;
            _logger = logger;
        }

        public async Task EnsureStateConsistencyAsync(CancellationToken cancellationToken)
        {
            // AUDIT-ONLY MODE: Financial projections are event-driven. No polling-based mutation allowed.
            
            // 1. Get Actual Stats
            var statsToday = await _context.UserOperationalStats
                .FirstOrDefaultAsync(s => s.Date == DateTime.Today, cancellationToken);

            // 2. Get Processed Events that actually OCCURRED today
            // Joining with BranchOperationalEvents to ensure we don't flag backlog processing as a today-mismatch.
            var today = DateTime.Today;
            var processedTodayEventsCount = await _context.ProcessedProjectionEvents
                .Where(p => p.ProjectionName == "OperationalStats")
                .Join(_context.BranchOperationalEvents,
                      ppe => ppe.EventId,
                      boe => boe.EventId,
                      (ppe, boe) => boe)
                .Where(boe => boe.OccurredAt >= today)
                .CountAsync(cancellationToken);
            
            // 3. Audit Check (No Mutation)
            if (statsToday == null && processedTodayEventsCount > 0)
            {
                _logger.LogWarning("AUDIT FAILURE: UserOperationalStats record for today is missing, but {Count} events occurring today were processed. Manual Replay Required.", processedTodayEventsCount);
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
                .Where(e => e.OccurredAt > lookbackTime && 
                            !_context.ProcessedProjectionEvents.Any(p => p.EventId == e.EventId && p.ProjectionName == "OperationalStats"))
                .OrderBy(e => e.OccurredAt)
                .ToListAsync(cancellationToken);

            foreach (var evt in recentEvents)
            {
                await ProcessEventAsync(evt);
            }
        }

        public async Task ProjectSingleEventAsync(Guid eventId, System.Threading.CancellationToken cancellationToken = default)
        {
            var evt = await _context.BranchOperationalEvents.FirstOrDefaultAsync(e => e.EventId == eventId, cancellationToken);
            if (evt != null)
            {
                await ProcessEventAsync(evt);
            }
        }

        private async Task ProcessEventAsync(BranchOperationalEvent evt)
        {
            // Parse standard fields
            if (!Guid.TryParse(evt.BranchId, out var branchId)) return;
            var date = evt.OccurredAt.Date;
            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                
                // 2. Idempotency Check (Event ID)
                var isProcessed = await _context.ProcessedProjectionEvents
                    .AnyAsync(p => p.EventId == evt.EventId && p.ProjectionName == "OperationalStats");

                if (isProcessed) return;

                _logger.LogInformation("[ProjectorDebug] Processing Event Type: {Type}, BranchId: {BranchId}, SourceId: {SourceId}, SourceType: {SourceType}, VisitId: {VisitId}", 
                    evt.EventType, branchId, evt.SourceId, evt.SourceType, evt.VisitId);

                bool updated = false;

                // Strict Actor Attribution: Always resolve AssignedReceptionistId from Visit
                Guid receptionistId = Guid.Empty;
                if ((!string.IsNullOrEmpty(evt.VisitId)))
                {
                    var visit = await _context.Visits.FindAsync(Guid.Parse(evt.VisitId));
                    if (visit != null && visit.AssignedReceptionistId != Guid.Empty && visit.AssignedReceptionistId.HasValue)
                    {
                        receptionistId = visit.AssignedReceptionistId.Value;
                    }
                }

                if (receptionistId == Guid.Empty && evt.ActorType == "User" && !string.IsNullOrEmpty(evt.ActorName))
                {
                    Guid.TryParse(evt.ActorName, out receptionistId);
                }
                
                Guid userId = receptionistId;

                // 3. Load/Create State
                var userStats = await GetOrCreateUserStats(userId, branchId, date);
                var branchStats = await GetOrCreateBranchStats(branchId, date);
                var visitState = (!string.IsNullOrEmpty(evt.VisitId)) ? await GetOrCreateVisitStateAsync(Guid.Parse(evt.VisitId), userId, branchId) : null;

                // 2b. Strict Deduplication (Source ID)
                if (evt.SourceId.HasValue)
                {
                     // INSTRUMENTATION: Log the join specifically as it was a known crash point
                     _logger.LogInformation("[ProjectorDebug] Checking Fact Deduplication for SourceId: {SourceId}", evt.SourceId);
                     
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
                if (Enum.TryParse<BranchEventType>(evt.EventType, out var type))
                {
                    switch (type)
                    {
                        case BranchEventType.VISIT_STARTED:
                            userStats.WalkInsCount++;
                            branchStats.WalkInsCount++;
                            if (visitState != null) visitState.WalkInActive = true;
                            updated = true;
                            break;

                        case BranchEventType.VISIT_CANCELLED:
                            if (visitState != null)
                            {
                                // Cascade Reversal in O(1)
                                if (visitState.WalkInActive)
                                {
                                    userStats.WalkInsCount--;
                                    branchStats.WalkInsCount--;
                                }
                                userStats.TestsRunningCount -= visitState.TestsRunningCount;
                                branchStats.TestsRunningCount -= visitState.TestsRunningCount;
                                
                                userStats.PendingCollectionsCount -= visitState.PendingCollectionsCount;
                                branchStats.PendingCollectionsCount -= visitState.PendingCollectionsCount;
                                
                                userStats.CompletedCollectionsCount -= visitState.CompletedCollectionsCount;
                                branchStats.CompletedCollectionsCount -= visitState.CompletedCollectionsCount;
                                
                                userStats.PendingReportsCount -= visitState.PendingReportsCount;
                                branchStats.PendingReportsCount -= visitState.PendingReportsCount;

                                _context.VisitOperationalStates.Remove(visitState);
                                visitState = null; 
                            }
                            updated = true;
                            break;

                        case BranchEventType.PAYMENT_RECEIVED:
                            if (evt.SourceId.HasValue && evt.SourceType == "RevenueFact")
                            {
                                var fact = await _context.RevenueFacts.FindAsync(evt.SourceId.Value);
                                if (fact != null)
                                {
                                     userStats.PaymentsTotal += fact.Amount;
                                     branchStats.PaymentsTotal += fact.Amount;

                                     if (fact.PaymentMode == PaymentMode.Cash || fact.PaymentMode == PaymentMode.Other) 
                                     {
                                         userStats.PaymentsCashTotal += fact.Amount;
                                         branchStats.PaymentsCashTotal += fact.Amount;
                                     }
                                     else if (fact.PaymentMode == PaymentMode.UPI || fact.PaymentMode == PaymentMode.Card || fact.PaymentMode == PaymentMode.BankTransfer) {
                                         userStats.PaymentsOnlineTotal += fact.Amount;
                                         branchStats.PaymentsOnlineTotal += fact.Amount;
                                         userStats.PaymentsOnlineCount++;
                                         branchStats.PaymentsOnlineCount++;
                                     }
                                     updated = true;
                                }
                            }
                            break;

                        case BranchEventType.PAYMENT_VOIDED:
                            if (evt.SourceId.HasValue && evt.SourceType == "RevenueFact")
                            {
                                var fact = await _context.RevenueFacts.FindAsync(evt.SourceId.Value);
                                if (fact != null)
                                {
                                     userStats.PaymentsTotal -= fact.Amount;
                                     branchStats.PaymentsTotal -= fact.Amount;

                                     if (fact.PaymentMode == PaymentMode.Cash || fact.PaymentMode == PaymentMode.Other) 
                                     {
                                         userStats.PaymentsCashTotal -= fact.Amount;
                                         branchStats.PaymentsCashTotal -= fact.Amount;
                                     }
                                     else if (fact.PaymentMode == PaymentMode.UPI || fact.PaymentMode == PaymentMode.Card || fact.PaymentMode == PaymentMode.BankTransfer) {
                                         userStats.PaymentsOnlineTotal -= fact.Amount;
                                         branchStats.PaymentsOnlineTotal -= fact.Amount;
                                         userStats.PaymentsOnlineCount--;
                                         branchStats.PaymentsOnlineCount--;
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
                                    userStats.PrepaidBillsCount++;
                                    branchStats.PrepaidBillsCount++;
                                    userStats.PrepaidBillsTotal += fact.Amount;
                                    branchStats.PrepaidBillsTotal += fact.Amount;
                                    updated = true;
                                }
                            }
                            break;

                        case BranchEventType.RECEIVABLE_VOIDED:
                            if (evt.SourceId.HasValue)
                            {
                                var fact = await _context.ReceivableFacts.FindAsync(evt.SourceId.Value);
                                if (fact != null)
                                {
                                    userStats.PrepaidBillsCount--;
                                    branchStats.PrepaidBillsCount--;
                                    userStats.PrepaidBillsTotal -= fact.Amount;
                                    branchStats.PrepaidBillsTotal -= fact.Amount;
                                    updated = true;
                                }
                            }
                            break;

                        case BranchEventType.TEST_ADDED:
                            userStats.TestsRunningCount++;
                            branchStats.TestsRunningCount++;
                            if (visitState != null) visitState.TestsRunningCount++;
                            updated = true;
                            break;

                        case BranchEventType.TEST_REMOVED:
                        case BranchEventType.RESULT_VERIFIED:
                            userStats.TestsRunningCount--;
                            branchStats.TestsRunningCount--;
                            if (visitState != null) visitState.TestsRunningCount--;
                            updated = true;
                            break;

                        case BranchEventType.SPECIMEN_ORDERED:
                            userStats.PendingCollectionsCount++;
                            branchStats.PendingCollectionsCount++;
                            if (visitState != null) visitState.PendingCollectionsCount++;
                            updated = true;
                            break;

                        case BranchEventType.SPECIMEN_COLLECTED:
                            userStats.PendingCollectionsCount--;
                            branchStats.PendingCollectionsCount--;
                            if (visitState != null) visitState.PendingCollectionsCount--;

                            userStats.CompletedCollectionsCount++;
                            branchStats.CompletedCollectionsCount++;
                            if (visitState != null) visitState.CompletedCollectionsCount++;
                            updated = true;
                            break;

                        case BranchEventType.SPECIMEN_DELETED:
                            userStats.PendingCollectionsCount--;
                            branchStats.PendingCollectionsCount--;
                            if (visitState != null) visitState.PendingCollectionsCount--;
                            updated = true;
                            break;
                            
                        case BranchEventType.SPECIMEN_REJECTED:
                            userStats.CompletedCollectionsCount--;
                            branchStats.CompletedCollectionsCount--;
                            if (visitState != null) visitState.CompletedCollectionsCount--;
                            
                            userStats.PendingCollectionsCount++;
                            branchStats.PendingCollectionsCount++;
                            if (visitState != null) visitState.PendingCollectionsCount++;
                            updated = true;
                            break;

                        case BranchEventType.REPORT_CREATED:
                            userStats.PendingReportsCount++;
                            branchStats.PendingReportsCount++;
                            if (visitState != null) visitState.PendingReportsCount++;
                            updated = true;
                            break;

                        case BranchEventType.REPORT_SIGNED:
                            userStats.PendingReportsCount--;
                            branchStats.PendingReportsCount--;
                            if (visitState != null) visitState.PendingReportsCount--;

                            if (evt.SourceId.HasValue)
                            {
                                var report = await _context.Reports.FindAsync(evt.SourceId.Value);
                                if (report != null && report.SignedAt.HasValue)
                                {
                                    var collectedAt = await _context.Specimens
                                        .Where(s => s.VisitId.ToString() == evt.VisitId && s.CollectedAt.HasValue)
                                        .Select(s => s.CollectedAt)
                                        .FirstOrDefaultAsync();

                                    if (collectedAt.HasValue)
                                    {
                                        var duration = (report.SignedAt.Value - collectedAt.Value).TotalMinutes;
                                        if (duration > 0)
                                        {
                                            userStats.ReportTatTotalMinutes += duration;
                                            userStats.ReportTatCount++;
                                            branchStats.ReportTatTotalMinutes += duration;
                                            branchStats.ReportTatCount++;
                                        }
                                    }
                                }
                            }
                            updated = true;
                            break;

                        case BranchEventType.REPORT_REVERTED:
                            userStats.PendingReportsCount++;
                            branchStats.PendingReportsCount++;
                            if (visitState != null) visitState.PendingReportsCount++;
                            
                            if (evt.SourceId.HasValue)
                            {
                                var report = await _context.Reports.FindAsync(evt.SourceId.Value);
                                if (report != null && report.SignedAt.HasValue)
                                {
                                    var collectedAt = await _context.Specimens
                                        .Where(s => s.VisitId.ToString() == evt.VisitId && s.CollectedAt.HasValue)
                                        .Select(s => s.CollectedAt)
                                        .FirstOrDefaultAsync();

                                    if (collectedAt.HasValue)
                                    {
                                        var duration = (report.SignedAt.Value - collectedAt.Value).TotalMinutes;
                                        if (duration > 0)
                                        {
                                            userStats.ReportTatTotalMinutes -= duration;
                                            userStats.ReportTatCount--;
                                            branchStats.ReportTatTotalMinutes -= duration;
                                            branchStats.ReportTatCount--;
                                        }
                                    }
                                }
                            }
                            updated = true;
                            break;
                    }
                }

            MarkProcessed:
                // ALways mark as processed to prevent infinite loops on unhandled events.
                _context.ProcessedProjectionEvents.Add(new ProcessedProjectionEvent
                {
                    EventId = evt.EventId,
                    ProjectionName = "OperationalStats",
                    ProcessedAt = DateTime.UtcNow
                });

                if (updated)
                {
                    userStats.LastUpdated = DateTime.UtcNow;
                    branchStats.LastUpdated = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (updated)
                {
                    await PushUpdateAsync(userId, branchId, date);
                    
                    // 5. Lifecycle Cleanup: Evict snapshot if visit is terminal (all active counters zero)
                    if (visitState != null && 
                        visitState.PendingReportsCount == 0 && 
                        visitState.PendingCollectionsCount == 0 && 
                        visitState.TestsRunningCount == 0)
                    {
                        _context.VisitOperationalStates.Remove(visitState);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "FATAL CRASH in OperationalStatsProjector. ProcessEventAsync failed. EventId: {EventId}, Type: {Type}, StackTrace: {StackTrace}", 
                    evt.EventId, evt.EventType, ex.ToString());
                throw;
            }
        }

        private async Task CheckAndIncrementWalkInAsync(UserOperationalStats stats, Guid visitId, Guid currentFactId)
        {
            try
            {
                // 1. Check Prior Receivables
                var hasPriorReceivable = await _context.ReceivableFacts
                    .AnyAsync(r => r.SourceVisitId == visitId && r.ReceivableFactId != currentFactId);
                
                if (hasPriorReceivable) return;

                // 2. Check Prior Revenue Facts
                var visitIdStr = visitId.ToString();
                var hasPriorRevenue = await _context.RevenueFacts
                    .AnyAsync(f => f.SourceReferenceId == visitIdStr && f.RevenueFactId != currentFactId);

                if (hasPriorRevenue) return;

                stats.WalkInsCount++;
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "FATAL CRASH in CheckAndIncrementWalkInAsync. VisitId: {VisitId}, FactId: {FactId}, Full Exception: {Ex}", 
                    visitId, currentFactId, ex.ToString());
                throw;
            }
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

        private async Task<VisitOperationalState> GetOrCreateVisitStateAsync(Guid visitId, Guid receptionistId, Guid branchId)
        {
            var localState = _context.VisitOperationalStates.Local.FirstOrDefault(v => v.VisitId == visitId);
            if (localState != null) return localState;

            var state = await _context.VisitOperationalStates.FirstOrDefaultAsync(v => v.VisitId == visitId);
            if (state == null)
            {
                state = new VisitOperationalState
                {
                    VisitId = visitId,
                    AssignedReceptionistId = receptionistId,
                    BranchId = branchId,
                    Date = DateTime.UtcNow.Date // Local anchor
                };
                _context.VisitOperationalStates.Add(state);
            }
            return state;
        }

        private async Task PushUpdateAsync(Guid userId, Guid branchId, DateTime date)
        {
            // Trigger the global dashboard refresh using the accurate, newly saved read-models.
            // PASS userId to ensure targeted push to private desktop
            await _notifier.NotifyRealitySummaryUpdateAsync(branchId.ToString(), userId);
        }
    }
}
