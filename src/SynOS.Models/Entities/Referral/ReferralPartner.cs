using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums.Referral;
using System.ComponentModel.DataAnnotations.Schema;

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

        [Column(TypeName = "decimal(18, 4)")]
        public decimal DefaultCommissionPercentage { get; set; } = 0;
        public CommissionCalculationBase CalculationBase { get; set; } = CommissionCalculationBase.AfterDiscounts;

        public PartnerStatus Status { get; set; } = PartnerStatus.Draft;
        
        [StringLength(50)]
        public string? PaymentCollectionModel { get; set; } // Default model for this partner (e.g. LabCollects, PartnerCollects)

        [StringLength(200)]
        public string? ClinicName { get; set; }

        [StringLength(100)]
        public string? Location { get; set; } // City or Area

        public Guid? ApprovedByUserId { get; set; }
        public DateTimeOffset? ApprovedAt { get; set; }

        public bool IsActive { get; set; } // Deprecated in favor of Status, but kept for compatibility

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
