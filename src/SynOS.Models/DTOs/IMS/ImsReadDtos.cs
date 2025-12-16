using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.IMS
{
    public class StockSummaryDto
    {
        public List<StockItemDto> StockItems { get; set; } = new List<StockItemDto>();
    }

    public class StockItemDto
    {
        public Guid TubeId { get; set; }
        public string TubeCode { get; set; }
        public string TubeName { get; set; }
        public int CurrentQuantity { get; set; }
        public int AlertQuantity { get; set; }
        public bool IsBelowAlertThreshold { get; set; }
    }

    public class LowStockAlertDto
    {
        public Guid TubeId { get; set; }
        public string TubeCode { get; set; }
        public string TubeName { get; set; }

        public int CurrentQuantity { get; set; }
        public int AlertQuantity { get; set; }
    }
}
