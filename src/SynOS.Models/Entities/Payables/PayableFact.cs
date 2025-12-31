using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payables
{
    public class PayableFact
    {
        [Key]
        public Guid PayableFactId { get; init; }

        [Required]
        public Guid ReferralPartnerId { get; init; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountOwed { get; init; }

        [Required]
        [StringLength(3)] // ISO 4217 currency code
        public string Currency { get; init; } = string.Empty;

        // The SpendFact that generated this Payable
        [Required]
        public Guid SourceSpendFactId { get; init; }

        [Required]
        public Guid SourcePaymentId { get; init; } // The PaymentId that ultimately triggered this payable

        public DateOnly DueDate { get; init; }

        [Required]
        [StringLength(20)]
        public string Status { get; init; } = "Due"; // e.g., "Due", "Paid", "Settled"

        public DateTimeOffset OccurredAt { get; init; }
        public DateTimeOffset RecordedAt { get; init; } = DateTimeOffset.UtcNow;
    }
}
