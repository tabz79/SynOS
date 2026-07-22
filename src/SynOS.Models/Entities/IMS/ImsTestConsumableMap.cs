using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.Entities.IMS
{
    public class ImsTestConsumableMap
    {
        [Key]
        public Guid MapId { get; set; }

        [Required]
        public Guid TestId { get; set; }
        [ForeignKey("TestId")]
        public virtual Test Test { get; set; }

        [Required]
        public Guid ConsumableId { get; set; }
        [ForeignKey("ConsumableId")]
        public virtual ImsConsumable Consumable { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,4)")]
        public decimal QuantityPerTest { get; set; } = 1m;

        [Column(TypeName = "decimal(18,4)")]
        public decimal? DisplayQuantity { get; set; }

        [MaxLength(50)]
        public string? DisplayUnit { get; set; }

        [Required]
        public ConsumableUsageType UsageType { get; set; } = ConsumableUsageType.Consumption;
    }
}
