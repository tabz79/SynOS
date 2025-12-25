using System;
using System.Collections.Generic;

namespace SynOS.Models.ReadModels.BusinessIntelligence
{
    public class SpendSummaryView
    {
        public DateTimeOffset PeriodStart { get; set; }
        public DateTimeOffset PeriodEnd { get; set; }
        public decimal TotalSpend { get; set; }
        public string Currency { get; set; } = string.Empty;
        public List<BreakdownItem> BreakdownByChannel { get; set; } = new List<BreakdownItem>();
    }

    public class BreakdownItem
    {
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }
}
