using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    [Table("IMS_InventoryLots")]
    public class ImsInventoryLot
    {
        [Key]
        public Guid LotId { get; set; }

        public Guid? ItemId { get; set; } // Foreign Key to IMS_InventoryItem
        [ForeignKey("ItemId")]
        public virtual ImsInventoryItem? Item { get; set; }

        [Required]
        [StringLength(100)]
        public string BatchNumber { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal ContainerSize { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal CurrentQuantity { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal UnitCostSnapshot { get; set; } // Copied once at receive time

        public DateTimeOffset? ExpiryDate { get; set; }

        [Required]
        public Guid BranchId { get; set; }
        [ForeignKey("BranchId")]
        public virtual Branch Branch { get; set; }

        public bool IsActive { get; set; } = true;
        
        public DateTimeOffset ReceivedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
