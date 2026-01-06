using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Discounts
{
    public class DiscountMaster
    {
        [Key]
        public Guid DiscountDefinitionId { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public DiscountType Type { get; set; }

        public DiscountScope Scope { get; set; }

        public AttributionType AttributionType { get; set; }

        public ValueMode ValueMode { get; set; }

        public decimal? MaxLimit { get; set; } // Nullable, "required when ValueMode = Editable" is business logic

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
