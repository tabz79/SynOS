using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class PriceConfig
    {
        [Key]
        public Guid PriceId { get; set; }

        [Required]
        public Guid TestId { get; set; }
        [ForeignKey("TestId")]
        public virtual Test Test { get; set; } = null!;

        [Column(TypeName = "decimal(5, 2)")]
        public decimal? DiscountPercent { get; set; } = 0;

        [Column(TypeName = "decimal(5, 2)")]
        public decimal? ReferrerRatePercent { get; set; } = 100;

        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow; // Added
    }
}
