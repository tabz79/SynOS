using System;

namespace SynOS.Models.Entities.Payments
{
    /// <summary>
    /// **[SEALED FACT BOUNDARY]**
    /// Represents a single, immutable fact that a payment was confirmed.
    /// This is a Truth declaration, NOT an engine or workflow.
    /// It simply states "money has moved" without triggering other processes yet.
    /// </summary>
    /// <remarks>
    /// **INTENT LOCK & GUARDRAILS:**
    /// - This entity is **immutable by design** and append-only.
    /// - It is constructed by a manual declaration controller, NOT inferred by a service.
    /// - It must NOT contain business logic, validation, or workflow fields.
    /// - It must NOT trigger downstream engines directly.
    /// </remarks>
    public sealed class PaymentConfirmedFact
    {
        public Guid PaymentId { get; init; }
        public PaymentDirection Direction { get; init; }
        public decimal Amount { get; init; }
        public Guid CounterpartyId { get; init; }
        public Guid? ReferenceId { get; init; }
        public DateTimeOffset OccurredAt { get; init; }
        public DateTimeOffset RecordedAt { get; init; }
        public string? Channel { get; init; }

        public PaymentConfirmedFact(
            Guid paymentId,
            PaymentDirection direction,
            decimal amount,
            Guid counterpartyId,
            DateTimeOffset occurredAt,
            DateTimeOffset recordedAt,
            Guid? referenceId = null,
            string? channel = null)
        {
            PaymentId = paymentId;
            Direction = direction;
            Amount = amount;
            CounterpartyId = counterpartyId;
            OccurredAt = occurredAt;
            RecordedAt = recordedAt;
            ReferenceId = referenceId;
            Channel = channel;
        }
    }
}
