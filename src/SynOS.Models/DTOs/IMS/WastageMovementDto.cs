using System;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.DTOs.IMS
{
    public class WastageMovementDto
    {
        public Guid MovementId { get; set; }
        public Guid? ConsumableId { get; set; }
        public string ConsumableName { get; set; }
        public string? ConsumableCategory { get; set; }
        public int Quantity { get; set; }
        public decimal? CostPerUnit { get; set; }
        public StockMovementType MovementType { get; set; }
        public WastageReasonCode? ReasonCode { get; set; }
        public DateTimeOffset MovedAt { get; set; }
    }
}
