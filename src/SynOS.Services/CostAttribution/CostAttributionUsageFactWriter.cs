using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Events.CostAttribution;
using SynOS.Models.Entities.CostAttribution;

namespace SynOS.Services.CostAttribution
{
    public class CostAttributionUsageFactWriter : ICostAttributionUsageFactWriter
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<CostAttributionUsageFactWriter> _logger;

        public CostAttributionUsageFactWriter(SynOSDbContext context, ILogger<CostAttributionUsageFactWriter> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task WriteUsageFactAsync(
            CostAttribution_UsagePolicyVersion resolvedPolicyVersion,
            CostingTriggerEvent eventPayload,
            decimal? unitCost = null,
            decimal? totalCost = null,
            string? accuracyFlag = null)
        {
            // IDEMPOTENCY CHECK:
            // Ensure a fact for this specific event source and inventory item does not already exist.
            var factExists = await _context.CostAttribution_UsageFacts
                .AsNoTracking()
                .AnyAsync(f =>
                    f.SourceEventId == eventPayload.SourceEventId &&
                    f.SourceEventType == eventPayload.SourceEventType &&
                    f.InventoryItemId == resolvedPolicyVersion.UsagePolicy.InventoryItemId);

            if (factExists)
            {
                _logger.LogInformation(
                    "Usage Fact for SourceEventId {SourceEventId} and InventoryItemId {InventoryItemId} already exists. Skipping creation.",
                    eventPayload.SourceEventId,
                    resolvedPolicyVersion.UsagePolicy.InventoryItemId);
                return;
            }

            // CREATE AND WRITE THE IMMUTABLE FACT:
            var newFact = new CostAttribution_UsageFact
            {
                UsageFactId = Guid.NewGuid(),
                TestId = eventPayload.TestId,
                InventoryItemId = resolvedPolicyVersion.UsagePolicy.InventoryItemId,
                BranchId = eventPayload.BranchId,
                Quantity = resolvedPolicyVersion.Quantity, // Direct copy
                Unit = resolvedPolicyVersion.Unit,         // Direct copy
                OccurredAt = eventPayload.OccurredAt,
                RecordedAt = DateTimeOffset.UtcNow,        // System-generated timestamp
                SourceEventId = eventPayload.SourceEventId,
                SourceEventType = eventPayload.SourceEventType,
                UnitCost = unitCost,
                TotalCost = totalCost,
                AccuracyFlag = accuracyFlag
            };

            await _context.CostAttribution_UsageFacts.AddAsync(newFact);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Successfully wrote new Usage Fact {UsageFactId} for SourceEventId {SourceEventId}.",
                newFact.UsageFactId,
                newFact.SourceEventId);
        }
    }
}
