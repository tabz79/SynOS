using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ReferenceRange
    {
        [Key]
        public Guid ReferenceRangeId { get; set; } // Renamed from RangeId

        [Required]
        public Guid ParameterId { get; set; }
        [ForeignKey("ParameterId")]
        public virtual Parameter Parameter { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string AgeGroup { get; set; } = "ALL";

        public int? AgeMin { get; set; }
        public int? AgeMax { get; set; }

        [Required]
        [StringLength(10)]
        public string Sex { get; set; } = "ALL";

        [Column(TypeName = "decimal(18, 4)")]
        public decimal? RefLow { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal? RefHigh { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal? CriticalLow { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal? CriticalHigh { get; set; }

        [StringLength(200)]
        public string? TextRange { get; set; }

        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow; // Added
    }
}
