using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.AR
{
    /// <summary>
    /// Immutable fact representing money owed to the lab by a debtor (Referral Partner, Insurance / TPA, or Corporate Account).
    /// Append-only. No lifecycle logic.
    /// </summary>
    public sealed class ReceivableFact
    {
        [Key]
        public Guid ReceivableFactId { get; init; }

        [Required]
        public Guid SourceVisitId { get; init; }

        public DebtorType DebtorType { get; init; } = DebtorType.Partner;

        public Guid DebtorId { get; init; }

        [StringLength(200)]
        public string DebtorName { get; init; } = string.Empty;

        [StringLength(150)]
        public string? ClaimReference { get; init; }

        public Guid? ReferralPartnerId { get; init; }

        [ForeignKey("ReferralPartnerId")]
        public SynOS.Models.Entities.Referral.ReferralPartner? ReferralPartner { get; init; }

        [Required]
        [Column(TypeName = "decimal(18,4)")]
        public decimal Amount { get; init; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountReceived { get; set; } = 0;

        [Required]
        [StringLength(3)]
        public string Currency { get; init; } = "INR";

        public DateTimeOffset OccurredAt { get; init; }

        public DateTimeOffset RecordedAt { get; init; }

        public DateTimeOffset? SettledAt { get; set; } // Mutable settlement status
    }
}
