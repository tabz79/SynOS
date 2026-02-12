using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Enums;
using SynOS.Models.ReadModels;

namespace SynOS.Services.Operational
{
    public class OperationalEventWriter : IOperationalEventWriter
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<OperationalEventWriter> _logger;

        private readonly INotifier _notifier;

        public OperationalEventWriter(SynOSDbContext context, ILogger<OperationalEventWriter> logger, INotifier notifier)
        {
            _context = context;
            _logger = logger;
            _notifier = notifier;
        }

        public async Task WriteEventAsync(
            BranchEventType eventType,
            string branchId,
            string visitId,
            string tokenId,
            string summaryText,
            string actorType = "System",
            string? actorName = null,
            bool saveChanges = true,
            Guid? sourceId = null,
            string? sourceType = null,
            TimelineVisibility visibility = TimelineVisibility.Hide,
            Guid? intentId = null,
            string? metadata = null)
        {
            try
            {
                // 2️⃣ Instrument Event Writer
                _logger.LogCritical("EVENT_WRITE for VisitId {VisitId}, Context {ContextId}", visitId, _context.ContextId);

                var evt = new BranchOperationalEvent
                {
                    EventId = Guid.NewGuid(),
                    EventType = eventType.ToString(),
                    OccurredAt = DateTime.UtcNow, // MANDATORY: UTC
                    BranchId = branchId,
                    VisitId = visitId,
                    TokenId = tokenId,
                    SummaryText = summaryText,
                    ActorType = actorType,
                    ActorName = actorName,
                    SourceId = sourceId,
                    SourceType = sourceType,
                    
                    // Operational Timeline
                    Visibility = visibility,
                    IntentId = intentId,
                    Metadata = metadata
                };

                _context.BranchOperationalEvents.Add(evt);

                if (saveChanges)
                {
                    await _context.SaveChangesAsync();

                    // 3️⃣ Real-Time Signal to Dashboard
                    try 
                    {
                        // Fire-and-forget notification (don't await deeply or block)
                        // If saveChanges was false (transactional wrapper), the caller should trigger this manually?
                        // For now, we only trigger if we saved.
                        await _notifier.NotifyDashboardRefresh(branchId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to notify dashboard refresh.");
                    }
                }
            }
            catch (Exception ex)
            {
                // NEVER throw. Situational awareness must not block core ops.
                _logger.LogError(ex, "Failed to write BranchOperationalEvent. Type: {EventType}, VisitId: {VisitId}", eventType, visitId);
            }
        }
    }
}
