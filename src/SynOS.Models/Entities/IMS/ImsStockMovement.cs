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

        [Required]
        public Guid TubeId { get; set; } // Denormalized for reporting
        [ForeignKey("TubeId")]
        public virtual ImsTubeMaster Tube { get; set; }

        [Required]
        public Guid LotId { get; set; }
        [ForeignKey("LotId")]
        public virtual ImsTubeLot TubeLot { get; set; }

        [Required]
        public int Quantity { get; set; } // Always positive

        [Required]
        public StockMovementType MovementType { get; set; }

        [StringLength(200)]
        public string ReferenceId { get; set; } // SampleId, reason for wastage, etc.

        public Guid MovedByUserId { get; set; }
        [ForeignKey("MovedByUserId")]
        public virtual User MovedByUser { get; set; }

        public DateTimeOffset MovedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
