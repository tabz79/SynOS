using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.Entities.IMS
{
    [Table("IMS_InventoryUsageProfiles")]
    public class ImsInventoryUsageProfile
    {
        [Key]
        [ForeignKey("Consumable")]
        public Guid ConsumableId { get; set; }

        public ItemType ItemType { get; set; }
        
        public ConsumptionBasis ConsumptionBasis { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal DefaultQuantityPerEvent { get; set; }
        
        [Required]
        [StringLength(50)]
        public string QuantityUnit { get; set; }

        public bool AllowsFractionalConsumption { get; set; }
        
        public bool RequiresLotTracking { get; set; }
        
        public bool AffectsTestCost { get; set; }

        // Navigation property
        public virtual ImsConsumable Consumable { get; set; }
    }
}
