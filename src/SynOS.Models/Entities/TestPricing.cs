using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("TestPricing")]
    public class TestPricing
    {
        [Key]
        public Guid PricingId { get; set; }

        [Required]
        public Guid TestId { get; set; }
        [ForeignKey("TestId")]
        public virtual Test Test { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(10, 2)")]
        public decimal BasePrice { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid CreatedByUserId { get; set; }
    }
}
