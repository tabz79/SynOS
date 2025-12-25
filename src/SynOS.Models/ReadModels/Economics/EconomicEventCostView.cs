using System;
using System.Collections.Generic;

namespace SynOS.Models.ReadModels.Economics
{
    /// <summary>
    /// Represents the cost components for a specific economic event.
    /// This is a read-only projection, not an entity.
    /// </summary>
    public class EconomicEventCostView
    {
        public Guid EventId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal TotalCost { get; set; }
        public string Currency { get; set; } = string.Empty;
        public List<ItemCostDetailView> Details { get; set; } = new List<ItemCostDetailView>();
    }

    /// <summary>
    /// Represents the cost detail of a single item within an economic event.
    /// </summary>
    public class ItemCostDetailView
    {
        public string ItemName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string QuantityUnit { get; set; } = string.Empty;
        public decimal UnitCost { get; set; }
        public decimal TotalItemCost { get; set; }
    }
}
