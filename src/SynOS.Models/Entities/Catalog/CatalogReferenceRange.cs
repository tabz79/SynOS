using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogReferenceRange
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(50)]
        public string TestCode { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string Sex { get; set; } = "ALL"; // ALL, Male, Female

        public int? AgeMin { get; set; }
        public int? AgeMax { get; set; }

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

        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow.Date;
        public DateTime? EffectiveTo { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
