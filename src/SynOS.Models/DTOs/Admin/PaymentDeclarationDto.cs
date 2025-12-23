/*
using System;
using SynOS.Models.Entities.Payments; // Required for PaymentDirection

namespace SynOS.Models.DTOs.Admin
{
    /// <summary>
    /// **[SEALED MANUAL DTO]**
    /// Represents the data required for a human/admin to manually declare that a payment
    /// has already been completed.
    /// </summary>
    /// <remarks>
    /// **INTENT LOCK & GUARDRAILS:**
    /// - This DTO is a data container for declaring a **past truth**.
    /// - It is NOT a command to execute a payment.
    /// - It should NOT contain workflow fields, status flags, or any data intended for business logic.
    /// - It directly feeds the creation of an immutable `PaymentConfirmedFact`.
    /// </remarks>
    public class PaymentDeclarationDto
    {
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public string Direction { get; set; }
        public Guid CounterpartyId { get; set; }
        public Guid? ReferenceId { get; set; }
        public DateTimeOffset OccurredAt { get; set; }
        public string? Channel { get; set; }
    }
}
*/