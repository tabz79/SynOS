using System;
using System.Threading.Tasks;
using SynOS.Models.Entities.CostAttribution;

namespace SynOS.Services.CostAttribution
{
    public interface ICostAttributionPolicyResolver
    {
        /// <summary>
        /// Resolves the single active UsagePolicyVersion for a given context.
        /// </summary>
        /// <param name="testId">The ID of the Test.</param>
        /// <param name="inventoryItemId">The ID of the InventoryItem.</param>
        /// <param name="branchId">The ID of the Branch.</param>
        /// <param name="occurredAt">The timestamp of the event for which to resolve the policy.</param>
        /// <returns>The resolved UsagePolicyVersion, or null if no active policy applies.</returns>
        Task<CostAttribution_UsagePolicyVersion?> ResolvePolicyVersionAsync(
            Guid testId,
            Guid inventoryItemId,
            Guid branchId,
            DateTimeOffset occurredAt);
    }
}
