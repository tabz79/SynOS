using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    public class ImsConsumableLot
    {
        [Key]
        public Guid LotId { get; set; }

        [Required]
        public Guid ConsumableId { get; set; }
        [ForeignKey("ConsumableId")]
        public virtual ImsConsumable Consumable { get; set; }

        [Required]
        [StringLength(50)]
        public string BatchNumber { get; set; }

        public DateTimeOffset? ExpiryDate { get; set; }

        [Required]
        public int Quantity { get; set; }

        [Column(TypeName = "decimal(10, 2)")]
        public decimal? CostPerUnit { get; set; }

        [Required]
        public Guid BranchId { get; set; }
        [ForeignKey("BranchId")]
        public virtual Branch Branch { get; set; }

        public DateTimeOffset ReceivedAt { get; set; }

        public bool IsActive { get; set; } = true;
        
        // For one-way data migration traceability
        public Guid? LegacyTubeLotId { get; set; }
    }
}
