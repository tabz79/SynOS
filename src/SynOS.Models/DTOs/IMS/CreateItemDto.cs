using System;

namespace SynOS.Models.DTOs.IMS
{
    public class CreateItemDto
    {
        public string Name { get; set; }
        public string ItemCode { get; set; }
        public string UnitOfMeasure { get; set; }
        public decimal LowStockThreshold { get; set; }
        public string Category { get; set; }
        public string ServiceArea { get; set; } = "Laboratory";
        public string? Modality { get; set; }
    }
}
