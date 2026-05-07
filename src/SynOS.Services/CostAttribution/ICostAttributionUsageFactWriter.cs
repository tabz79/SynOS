using System.Threading.Tasks;
using SynOS.Models.Events.CostAttribution;
using SynOS.Models.Entities.CostAttribution;

namespace SynOS.Services.CostAttribution
{
    /// <summary>
    /// Defines a service for writing immutable, append-only Usage Facts.
    /// </summary>
    public interface ICostAttributionUsageFactWriter
    {
        /// <summary>
        /// Creates and saves a new Usage Fact based on a resolved policy and a trigger event.
        /// This operation is idempotent and will not create duplicate facts for the same source event.
        /// </summary>
        /// <param name="resolvedPolicyVersion">The active policy version that was resolved for this event.</param>
        /// <param name="eventPayload">The event payload containing the contextual information for the trigger.</param>
        Task WriteUsageFactAsync(
            CostAttribution_UsagePolicyVersion resolvedPolicyVersion,
            CostingTriggerEvent eventPayload,
            decimal? unitCost = null,
            decimal? totalCost = null,
            string? accuracyFlag = null);
    }
}
