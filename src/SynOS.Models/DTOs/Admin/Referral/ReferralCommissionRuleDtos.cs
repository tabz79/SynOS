using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums.Referral;

namespace SynOS.Models.DTOs.Admin.Referral
{
    public class ReferralCommissionRuleReadDto
    {
        public Guid RuleId { get; set; }
        public Guid ReferralPartnerId { get; set; }
        public Guid TestId { get; set; }
        public CommissionType CommissionType { get; set; }
        public decimal CommissionValue { get; set; }
        public DateOnly EffectiveFrom { get; set; }
        public bool IsActive { get; set; }
    }

    public class ReferralCommissionRuleCreateDto
    {
        [Required]
        public Guid TestId { get; set; }

        [Required]
        public CommissionType CommissionType { get; set; }

        [Required]
        [Range(0, (double)decimal.MaxValue)]
        public decimal CommissionValue { get; set; }

        [Required]
        public DateOnly EffectiveFrom { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class ReferralCommissionRuleUpdateDto
    {
        [Required]
        public CommissionType CommissionType { get; set; }

        [Required]
        [Range(0, (double)decimal.MaxValue)]
        public decimal CommissionValue { get; set; }

        [Required]
        public DateOnly EffectiveFrom { get; set; }
        
        public bool IsActive { get; set; }
    }
}
