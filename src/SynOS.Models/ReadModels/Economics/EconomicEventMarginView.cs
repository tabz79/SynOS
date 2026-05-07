using System;

namespace SynOS.Models.ReadModels.Economics
{
    /// <summary>
    /// Represents the gross margin for a specific economic event.
    /// This is a read-only projection, not an entity.
    /// </summary>
    public class EconomicEventMarginView
    {
        public Guid EventId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal OperationalMargin { get; set; } // Calculated as TotalRevenue - TotalCost
        public string Currency { get; set; } = string.Empty;
    }
}
