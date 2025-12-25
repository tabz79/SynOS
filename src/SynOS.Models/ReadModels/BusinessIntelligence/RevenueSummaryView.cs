using System;
using System.Collections.Generic;

namespace SynOS.Models.ReadModels.BusinessIntelligence
{
    public class RevenueSummaryView
    {
        public DateTimeOffset PeriodStart { get; set; }
        public DateTimeOffset PeriodEnd { get; set; }
        public decimal TotalRevenue { get; set; }
        public string Currency { get; set; } = string.Empty;
        public List<BreakdownItem> BreakdownBySourceType { get; set; } = new List<BreakdownItem>();
    }
}
