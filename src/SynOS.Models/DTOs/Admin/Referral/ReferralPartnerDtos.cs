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
        public string? PaymentCollectionModel { get; set; } // "LabCollects" or "PartnerCollects"
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

        [StringLength(500)]
        public string? ContactInfo { get; set; }

        [Required]
        public string PaymentCollectionModel { get; set; } = "LabCollects";

        public bool IsActive { get; set; } = true;
    }

    public class ReferralPartnerUpdateDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public PartnerType PartnerType { get; set; }

        [StringLength(500)]
        public string? ContactInfo { get; set; }

        [Required]
        public string PaymentCollectionModel { get; set; } = "LabCollects";
        
        public bool IsActive { get; set; }
    }
}
