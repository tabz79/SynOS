using System;

namespace SynOS.Models.DTOs.ReadModels.Spend
{
    /// <summary>
    /// A read-only projection of a SpendFact, enriched with human-readable context.
    /// This is an interpretation layer model and is NOT persisted as truth.
    /// It never introduces new truth, only derives meaning from existing facts.
    /// </summary>
    public class SpendRecordView
    {
        public Guid SpendFactId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public DateTimeOffset OccurredAt { get; set; }
        public string Channel { get; set; }
        
        /// <summary>
        /// A best-effort lookup of the counterparty's name (e.g., Supplier or Employee name).
        /// May be null if the counterparty is not found or not applicable.
        /// </summary>
        public string? CounterpartyName { get; set; }
        
        /// <summary>
        /// A simple, human-readable description generated from the fact's data.
        /// </summary>
        public string Description { get; set; }
    }
}
