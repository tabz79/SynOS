using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.DTOs.Admin
{
    public class DiscountDto
    {
        public Guid DiscountDefinitionId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DiscountType Type { get; set; }
        public decimal Value { get; set; }
        public decimal? MaxLimit { get; set; }
        public bool IsActive { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateDiscountDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DiscountType Type { get; set; }

        [Required]
        public decimal Value { get; set; }

        public decimal? MaxLimit { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }

    public class UpdateDiscountDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public decimal Value { get; set; }

        public decimal? MaxLimit { get; set; }

        public bool IsActive { get; set; }

        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }
}