using System;

namespace SynOS.Models.DTOs.IMS
{
    public class OpeningStockDto
    {
        public Guid ConsumableId { get; set; }
        public decimal Quantity { get; set; }
        public string BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public Guid BranchId { get; set; }
    }
}
