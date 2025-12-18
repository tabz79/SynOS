using System.Collections.Generic;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.DTOs.IMS
{
    public class WastageSummaryDto
    {
        public StockMovementType MovementType { get; set; }
        public Guid? ConsumableId { get; set; }
        public string ConsumableName { get; set; }
        public ConsumableCategory ConsumableCategory { get; set; }
        public int TotalQuantity { get; set; }
        public decimal TotalCost { get; set; }
    }
}
