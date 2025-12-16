using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Admin
{
    public class PriceConfigDto
    {
        public Guid PriceId { get; set; }
        public decimal? DiscountPercent { get; set; }
        public decimal? ReferrerRatePercent { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreatePriceConfigDto
    {
        [Range(0, 100)]
        public decimal? DiscountPercent { get; set; } = 0;

        [Range(0, 100)]
        public decimal? ReferrerRatePercent { get; set; } = 100;

        [Required]
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public bool IsActive { get; set; } = true; // Added
    }

    public class UpdatePriceConfigDto : CreatePriceConfigDto
    {
        public bool IsActive { get; set; }
    }
}
