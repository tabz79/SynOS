using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums.Referral;

namespace SynOS.Models.Entities.Referral
{
    public class ReferralPartner
    {
        [Key]
        public Guid ReferralPartnerId { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public PartnerType PartnerType { get; set; }

        [StringLength(500)]
        public string? ContactInfo { get; set; }

        [Required]
        [StringLength(50)]
        public string PaymentCollectionModel { get; set; } = "LabCollects"; // "LabCollects" or "PartnerCollects"

        public decimal DefaultCommissionPercentage { get; set; } = 0;
        public CommissionCalculationBase CalculationBase { get; set; } = CommissionCalculationBase.AfterDiscounts;

        public bool IsActive { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
