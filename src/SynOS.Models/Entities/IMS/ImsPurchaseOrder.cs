using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.Entities.IMS
{
    public class ImsPurchaseOrder
    {
        [Key]
        public Guid POId { get; set; }

        [Required]
        public Guid SupplierId { get; set; }
        [ForeignKey("SupplierId")]
        public virtual ImsSupplier Supplier { get; set; }

        [Required]
        public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        
        public virtual ICollection<ImsPOItem> POItems { get; set; } = new List<ImsPOItem>();
    }
}