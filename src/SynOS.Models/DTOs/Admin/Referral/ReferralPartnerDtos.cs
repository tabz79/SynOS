using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums.Referral;

namespace SynOS.Models.DTOs.Admin.Referral
{
    public class ReferralPartnerReadDto
    {
        public Guid ReferralPartnerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public PartnerType PartnerType { get; set; }
        public string? ContactInfo { get; set; }
        public decimal DefaultCommissionPercentage { get; set; }
        public CommissionCalculationBase CalculationBase { get; set; }
        public PartnerStatus Status { get; set; }
        public string? PaymentCollectionModel { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }

    public class ReferralPartnerCreateDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public PartnerType PartnerType { get; set; }

        public string? ContactInfo { get; set; }

        public decimal DefaultCommissionPercentage { get; set; }
        public CommissionCalculationBase CalculationBase { get; set; } = CommissionCalculationBase.AfterDiscounts;

        public string? PaymentCollectionModel { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ReferralPartnerUpdateDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public PartnerType PartnerType { get; set; }

        public string? ContactInfo { get; set; }
        
        public decimal DefaultCommissionPercentage { get; set; }
        public CommissionCalculationBase CalculationBase { get; set; }
        public string? PaymentCollectionModel { get; set; }
        public bool IsActive { get; set; }
    }
}
