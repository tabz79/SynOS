using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // ADDED
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Discounts
{
    public class DiscountMaster
    {
        [Key]
        public Guid DiscountDefinitionId { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty; // Unique Code (e.g. SUMMER20)

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        public decimal Value { get; set; } // The percentage or flat amount

        public DiscountType Type { get; set; }

        public DiscountScope Scope { get; set; }

        public AttributionType AttributionType { get; set; }

        public ValueMode ValueMode { get; set; }

        public decimal? MaxLimit { get; set; } // Nullable, "required when ValueMode = Editable" is business logic

        public bool IsActive { get; set; }

        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
