using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.IMS
{
    public class ReceiveStockDto
    {
        [Required]
        public Guid ItemId { get; set; }

        [Required]
        [Range(0.0001, double.MaxValue, ErrorMessage = "Quantity must be greater than zero")]
        public decimal Quantity { get; set; }

        public DateTimeOffset? ExpiryDate { get; set; }

        [Required]
        [StringLength(100)]
        public string BatchNumber { get; set; }

        [Required]
        public Guid BranchId { get; set; }
        
        public decimal UnitCost { get; set; }
        
        public Guid? SupplierId { get; set; }

        public Guid? POId { get; set; }

        public Guid? POItemId { get; set; }
    }
}
