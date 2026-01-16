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

        public OperationalEventWriter(SynOSDbContext context, ILogger<OperationalEventWriter> logger)
        {
            _context = context;
            _logger = logger;
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
            string? sourceType = null)
        {
            try
            {
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
                    SourceType = sourceType
                };

                _context.BranchOperationalEvents.Add(evt);

                if (saveChanges)
                {
                    await _context.SaveChangesAsync();
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
