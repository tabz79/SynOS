using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.AR
{
    /// <summary>
    /// Immutable fact representing money owed to the lab by a referral partner.
    /// Append-only. No lifecycle logic.
    /// </summary>
    public sealed class ReceivableFact
    {
        [Key]
        public Guid ReceivableFactId { get; init; }

        [Required]
        public Guid SourceVisitId { get; init; }

        [Required]
        public Guid ReferralPartnerId { get; init; }

        [Required]
        [Column(TypeName = "decimal(18,4)")]
        public decimal Amount { get; init; }

        [Required]
        [StringLength(3)]
        public string Currency { get; init; }

        public DateTimeOffset OccurredAt { get; init; }

        public DateTimeOffset RecordedAt { get; init; }

        public DateTimeOffset? SettledAt { get; set; } // Mutable settlement status
    }
}
