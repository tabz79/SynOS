using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    public class ImsTubeLot
    {
        [Key]
        public Guid LotId { get; set; }

        [Required]
        public Guid TubeId { get; set; }
        [ForeignKey("TubeId")]
        public virtual ImsTubeMaster Tube { get; set; }

        [Required]
        public Guid BranchId { get; set; }
        [ForeignKey("BranchId")]
        public virtual Branch Branch { get; set; }

        [Required]
        [StringLength(50)]
        public string LotNumber { get; set; }

        public DateTimeOffset ExpiryDate { get; set; }

        public int CurrentQuantity { get; set; }

        public DateTimeOffset ReceivedAt { get; set; } = DateTimeOffset.UtcNow;

        public Guid? POItemId { get; set; } // Nullable FK to ImsPOItem
        [ForeignKey("POItemId")]
        public virtual ImsPOItem? POItem { get; set; } // Nullable navigation property

        [Column(TypeName = "decimal(10, 2)")] // Store cost with 2 decimal places
        public decimal? CostPerUnit { get; set; } // Nullable, copied from POItem at receive time

        [NotMapped]
        public bool IsActive => CurrentQuantity > 0 && ExpiryDate >= DateTimeOffset.UtcNow;
    }
}
