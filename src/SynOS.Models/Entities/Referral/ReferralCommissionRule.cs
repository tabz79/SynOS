using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.Referral;

namespace SynOS.Models.Entities.Referral
{
    public class ReferralCommissionRule
    {
        [Key]
        public Guid RuleId { get; set; }

        [Required]
        public Guid ReferralPartnerId { get; set; }
        [ForeignKey("ReferralPartnerId")]
        public ReferralPartner? ReferralPartner { get; set; }

        [Required]
        public Guid TestId { get; set; }
        [ForeignKey("TestId")]
        public Test? Test { get; set; }

        [Required]
        public CommissionType CommissionType { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal CommissionValue { get; set; }

        public DateOnly EffectiveFrom { get; set; }
        
        public bool IsActive { get; set; }
    }
}
