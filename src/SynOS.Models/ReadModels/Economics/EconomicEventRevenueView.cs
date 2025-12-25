using System;
using System.Collections.Generic;

namespace SynOS.Models.ReadModels.Economics
{
    /// <summary>
    /// Represents the revenue components for a specific economic event.
    /// This is a read-only projection, not an entity.
    /// </summary>
    public class EconomicEventRevenueView
    {
        public Guid EventId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
        public string Currency { get; set; } = string.Empty;
        public List<ItemRevenueDetailView> Details { get; set; } = new List<ItemRevenueDetailView>();
    }

    /// <summary>
    /// Represents the revenue detail of a single item within an economic event.
    /// </summary>
    public class ItemRevenueDetailView
    {
        public string ItemName { get; set; } = string.Empty; // e.g., "Test Name"
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string PaymentMode { get; set; } = string.Empty;
    }
}
