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
        /// <summary>
        /// Unique identifier for this payment confirmation event.
        /// </summary>
        public Guid PaymentId { get; }

        /// <summary>
        /// The direction of the money movement (In or Out).
        /// </summary>
        public PaymentDirection Direction { get; }

        /// <summary>
        /// The amount of money that moved.
        /// </summary>
        public decimal Amount { get; }

        /// <summary>
        /// A generic identifier for the other party in the transaction 
        /// (e.g., PatientId, SupplierId, EmployeeId).
        /// </summary>
        public Guid CounterpartyId { get; }

        /// <summary>
        /// Optional: A generic reference to a related entity (e.g., InvoiceId, POId, VisitId).
        /// </summary>
        public Guid? ReferenceId { get; }

        /// <summary>
        /// The timestamp when the money actually moved (e.g., bank confirmation time).
        /// </summary>
        public DateTimeOffset OccurredAt { get; }

        /// <summary>
        /// The system timestamp when this fact was recorded.
        /// </summary>
        public DateTimeOffset RecordedAt { get; }

        /// <summary>
        /// Optional: The channel through which the payment was made (e.g., "Bank", "Cash", "UPI").
        /// </summary>
        public string? Channel { get; }

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
