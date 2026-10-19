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
        public Guid ReceivableFactId { get; set; }

        [Required]
        public Guid SourceVisitId { get; set; }

        public DebtorType DebtorType { get; set; } = DebtorType.Partner;

        public Guid DebtorId { get; set; }

        [StringLength(200)]
        public string DebtorName { get; set; } = string.Empty;

        [StringLength(150)]
        public string? ClaimReference { get; set; }

        public Guid? ReferralPartnerId { get; set; }

        [ForeignKey("ReferralPartnerId")]
        public SynOS.Models.Entities.Referral.ReferralPartner? ReferralPartner { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,4)")]
        public decimal Amount { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountReceived { get; set; } = 0;

        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "INR";

        public DateTimeOffset OccurredAt { get; set; }

        public DateTimeOffset RecordedAt { get; set; }

        public DateTimeOffset? SettledAt { get; set; } // Mutable settlement status
    }
}
