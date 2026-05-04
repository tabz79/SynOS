using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.Entities.IMS
{
    public class ImsStockMovement
    {
        [Key]
        public Guid MovementId { get; set; }

        // --- Legacy Tube-Based Foreign Keys ---
        public Guid? TubeId { get; set; } // Unchanged legacy field
        [ForeignKey("TubeId")]
        public virtual ImsTubeMaster? Tube { get; set; }

        public Guid? TubeLotId { get; set; } // Unchanged legacy field
        [ForeignKey("TubeLotId")]
        public virtual ImsTubeLot? TubeLot { get; set; }
        
        // --- New Consumable-Based Foreign Keys (Additive) ---
        public Guid? ConsumableId { get; set; } // Denormalized for reporting
        [ForeignKey("ConsumableId")]
        public virtual ImsConsumable? Consumable { get; set; }
        
        public Guid? ConsumableLotId { get; set; } // Legacy/GPT-4 Consumable Lot
        [ForeignKey("ConsumableLotId")]
        public virtual ImsConsumableLot? ConsumableLot { get; set; }

        public Guid? InventoryLotId { get; set; } // Reality-First Operational Lot
        [ForeignKey("InventoryLotId")]
        public virtual ImsInventoryLot? InventoryLot { get; set; }

        // --- Common Fields ---
        [Required]
        public int Quantity { get; set; } // Always positive

        [Required]
        public StockMovementType MovementType { get; set; }

        public MovementReferenceType? ReferenceType { get; set; }

        [StringLength(200)]
        public string? ReferenceId { get; set; } // SampleId, POId, reason, etc.

        public WastageReasonCode? ReasonCode { get; set; }

        public Guid RecordedByUserId { get; set; } // Renamed for clarity
        [ForeignKey("RecordedByUserId")]
        public virtual User RecordedByUser { get; set; }

        public DateTimeOffset MovedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}