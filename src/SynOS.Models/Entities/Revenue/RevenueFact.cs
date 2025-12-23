using System;

namespace SynOS.Models.Entities.Revenue
{
    /// <summary>
    /// Represents a single, immutable fact of a cash inflow within the Revenue Engine.
    /// This is a Truth Engine entity, designed to be append-only.
    /// </summary>
    public sealed class RevenueFact
    {
        public Guid RevenueFactId { get; init; }
        public DateTimeOffset OccurredAt { get; init; }
        public DateTimeOffset DeclaredAt { get; init; }
        public decimal Amount { get; init; }
        public string Currency { get; init; }
        public RevenueDirection Direction { get; init; }
        public RevenueSourceType SourceType { get; init; }
        public string SourceReferenceId { get; init; }
        public PaymentMode PaymentMode { get; init; }
        public Guid DeclaredByUserId { get; init; }
        public string? Notes { get; init; }
        public string? ExternalTransactionId { get; init; }
    }
}
