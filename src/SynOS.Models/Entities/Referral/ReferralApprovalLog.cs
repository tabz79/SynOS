using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Referral
{
    public class ReferralApprovalLog
    {
        [Key]
        public Guid LogId { get; set; }

        [Required]
        public Guid PartnerId { get; set; }

        [ForeignKey("PartnerId")]
        public virtual ReferralPartner? Partner { get; set; }

        [Required]
        public Guid ApprovedByUserId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal CommissionPercentageAssigned { get; set; }

        [Required]
        public int BackfilledVisitCount { get; set; }

        [Required]
        public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

        [MaxLength(500)]
        public string? Note { get; set; }
    }
}
