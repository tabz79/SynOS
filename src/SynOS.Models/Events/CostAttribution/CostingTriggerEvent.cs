using System;
using SynOS.Models.Entities.CostAttribution;

namespace SynOS.Models.Events.CostAttribution
{
    /// <summary>
    /// Defines the minimal data contract for an operational event that may have
    /// resource consumption associated with it. This event is published to trigger
    /// the Policy-to-Fact materialization process in the Cost Attribution Engine.
    /// </summary>
    public class CostingTriggerEvent
    {
        /// <summary>
        /// A unique identifier for the specific operational action that occurred.
        /// (e.g., the primary key of the TestExecution record, or a unique SampleCollectionId).
        /// This is the anchor for ensuring idempotency.
        /// </summary>
        public Guid SourceEventId { get; set; }

        /// <summary>
        /// The type of the source event, used by the handler to understand the context.
        /// This corresponds to the previously defined CostAttribution_SourceEventType enum.
        /// </summary>
        public CostAttribution_SourceEventType SourceEventType { get; set; }

        /// <summary>
        /// The unique identifier for the Test that this event is associated with.
        /// This is a primary key for resolving the applicable Usage Policy.
        /// </summary>
        public Guid TestId { get; set; }

        /// <summary>
        /// The unique identifier for the Branch where the event occurred.
        /// This is required to resolve the correct, branch-specific Usage Policy Version.
        /// </summary>
        public Guid BranchId { get; set; }

        /// <summary>
        /// The real-world timestamp of when the operational action was completed.
        /// This is used to select the correct policy version based on its
        /// EffectiveFrom/EffectiveTo dates.
        /// </summary>
        public DateTimeOffset OccurredAt { get; set; }
    }
}
