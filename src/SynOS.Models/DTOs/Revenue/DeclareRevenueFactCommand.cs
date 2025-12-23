using System;
using SynOS.Models.Entities.Revenue;

namespace SynOS.Models.DTOs.Revenue
{
    /// <summary>
    /// Command to declare a single immutable RevenueFact.
    /// This is a pure data carrier for the write-only Revenue Engine.
    /// </summary>
    public class DeclareRevenueFactCommand
    {
        public Guid? RevenueFactId { get; set; } // Optional, system generates if not provided
        public DateTimeOffset OccurredAt { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = null!; // Non-nullable, enforce with Required attribute in API if needed
        public RevenueDirection Direction { get; set; }
        public RevenueSourceType SourceType { get; set; }
        public string SourceReferenceId { get; set; } = null!; // Opaque ID, non-nullable
        public PaymentMode PaymentMode { get; set; }
        public Guid DeclaredByUserId { get; set; }
        public string? Notes { get; set; }
        public string? ExternalTransactionId { get; set; }
    }
}
