using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.IMS
{
    public class ReceiveStockDto
    {
        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        [Required]
        public DateTimeOffset ExpiryDate { get; set; }

        [Required]
        [StringLength(50)]
        public string LotNumber { get; set; }

        [Required]
        public Guid BranchId { get; set; }
    }
}
