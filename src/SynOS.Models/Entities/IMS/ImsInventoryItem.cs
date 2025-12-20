using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    [Table("IMS_InventoryItems")]
    public class ImsInventoryItem
    {
        [Key]
        public Guid ItemId { get; set; }

        // This entity serves as the pure, abstract identity for any inventory item.
        // Descriptive and behavioral properties belong on other entities like ImsConsumable.
        [Required]
        [StringLength(50)]
        public string ItemCode { get; set; } // A unique, human-readable code

        [Required]
        [StringLength(200)]
        public string Name { get; set; }
    }
}
