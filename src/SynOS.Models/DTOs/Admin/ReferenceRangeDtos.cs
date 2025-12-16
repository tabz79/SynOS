using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Admin
{
    public class ReferenceRangeDto
    {
        public Guid RangeId { get; set; }
        public string AgeGroup { get; set; }
        public int? AgeMin { get; set; }
        public int? AgeMax { get; set; }
        public string Sex { get; set; }
        public decimal? RefLow { get; set; }
        public decimal? RefHigh { get; set; }
        public decimal? CriticalLow { get; set; }
        public decimal? CriticalHigh { get; set; }
        public string? TextRange { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateReferenceRangeDto
    {
        [Required]
        [StringLength(50)]
        public string AgeGroup { get; set; } = "ALL";

        public int? AgeMin { get; set; }
        public int? AgeMax { get; set; }

        [Required]
        [StringLength(10)]
        public string Sex { get; set; } = "ALL";

        public decimal? RefLow { get; set; }
        public decimal? RefHigh { get; set; }
        public decimal? CriticalLow { get; set; }
        public decimal? CriticalHigh { get; set; }

        [StringLength(200)]
        public string? TextRange { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }

    public class UpdateReferenceRangeDto : CreateReferenceRangeDto
    {
        public bool IsActive { get; set; }
    }
}
