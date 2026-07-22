using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.Entities.IMS
{
    public class ImsStockRequest
    {
        [Key]
        public Guid RequestId { get; set; }

        [Required]
        public Guid ConsumableId { get; set; }

        [ForeignKey("ConsumableId")]
        public virtual ImsConsumable Consumable { get; set; }

        [Required]
        public Guid BranchId { get; set; }

        [ForeignKey("BranchId")]
        public virtual Branch Branch { get; set; }

        [Required]
        public int Quantity { get; set; }

        [Required]
        public Guid RequestedByUserId { get; set; }

        [ForeignKey("RequestedByUserId")]
        public virtual User RequestedByUser { get; set; }

        public DateTimeOffset RequestedAt { get; set; } = DateTimeOffset.UtcNow;

        [MaxLength(100)]
        public string? RequestedFromScreen { get; set; }

        [MaxLength(100)]
        public string? RequesterRole { get; set; }

        [Required]
        public ImsRequestStatus Status { get; set; } = ImsRequestStatus.Pending;

        public Guid? FulfilledByUserId { get; set; }

        [ForeignKey("FulfilledByUserId")]
        public virtual User? FulfilledByUser { get; set; }

        public DateTimeOffset? FulfilledAt { get; set; }
    }
}
