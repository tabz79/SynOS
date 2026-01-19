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

                if (isProcessed) return; // Already done

                // Parse standard fields
                if (!Guid.TryParse(evt.BranchId, out var branchId)) return;
                var date = evt.OccurredAt.Date; // UTC Date
                Guid userId = Guid.Empty;
                if (evt.ActorType == "User" && !string.IsNullOrEmpty(evt.ActorName))
                {
                    Guid.TryParse(evt.ActorName, out userId); // Assuming ActorName holds UserId as per Writer logic
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
                            userStats.WalkInsCount++;
                            updated = true;
                            break;

                        case BranchEventType.PAYMENT_RECEIVED:
                            // Rule: Load Payment by SourceId. 
                            if (evt.SourceId.HasValue)
                            {
                                var payment = await _context.Payments.FindAsync(evt.SourceId.Value);
                                if (payment != null)
                                {
                                    // CRITICAL: Filter virtual payments (Flow B)
                                    if (payment.Method != "PartnerAccount")
                                    {
                                        userStats.PaymentsTotal += payment.Amount;
                                        updated = true;
                                    }
                                    else
                                    {
                                        // It's a valid event, but we don't count it.
                                        // We still need to mark it processed.
                                        updated = true; // Trigger save of idempotency record
                                    }
                                }
                            }
                            break;

                        case BranchEventType.SAMPLE_COLLECTED:
                            branchStats.PendingReportsCount++;
                            updated = true;
                            break;

                        case BranchEventType.REPORT_SIGNED:
                            branchStats.PendingReportsCount--;
                            
                            // TAT Calculation
                            // TokenId holds ReportId in OperationsEngine
                            if (Guid.TryParse(evt.TokenId, out var reportId))
                            {
                                var report = await _context.Reports.FindAsync(reportId);
                                if (report != null && report.SignedAt.HasValue)
                                {
                                    // Need Sample Collected Time.
                                    // Report -> Visit -> Orders -> Samples?
                                    // Report.SourceId links to Order or Test.
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
                            updated = true; // Even if TAT fails, we decremented Pending
                            break;
                    }
                }

                if (updated)
                {
                    userStats.LastUpdated = DateTime.UtcNow;
                    branchStats.LastUpdated = DateTime.UtcNow;
                    
                    // 5. Mark Processed
                    _context.ProcessedProjectionEvents.Add(new ProcessedProjectionEvent
                    {
                        EventId = evt.EventId,
                        ProjectionName = "OperationalStats",
                        ProcessedAt = DateTime.UtcNow
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // 6. SignalR Push
                    if (userId != Guid.Empty)
                    {
                        await PushUpdateAsync(userId, branchId, date);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error projecting event {EventId}", evt.EventId);
                // Do not rethrow, just log. Next retry might succeed.
            }
        }

        private async Task<UserOperationalStats> GetOrCreateUserStats(Guid userId, Guid branchId, DateTime date)
        {
            // Fix: Use FindAsync which checks Local cache first, preventing identity resolution conflicts
            // Assuming PK is Composite: UserId, BranchId, Date (in that order based on common sense, but verified in DbContext usually)
            // If FindAsync fails due to wrong PK order, we fall back to manual query but with tracking check.
            
            // Best Practice Safe Pattern:
            // 1. Check Local manually to be 100% sure what we have
            var localStats = _context.UserOperationalStats.Local
                .FirstOrDefault(x => x.UserId == userId && x.BranchId == branchId && x.Date == date);
            
            if (localStats != null) return localStats;

            // 2. Check Database
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
            // Re-fetch to ensure clean state
            var uStats = await _context.UserOperationalStats.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId && x.BranchId == branchId && x.Date == date);
            var bStats = await _context.BranchOperationalStats.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Date == date);

            if (uStats == null || bStats == null) return;

            var summary = new TodaysSummaryDto
            {
                WalkInsToday = uStats.WalkInsCount,
                PaymentsCollected = uStats.PaymentsTotal,
                PendingReports = bStats.PendingReportsCount,
                AvgReportTimeMinutes = uStats.ReportTatCount > 0 
                    ? Math.Round(uStats.ReportTatTotalMinutes / uStats.ReportTatCount, 2) 
                    : 0
            };

            await _notificationService.NotifyReceptionSummaryUpdateAsync(userId.ToString(), summary);
        }
    }
}