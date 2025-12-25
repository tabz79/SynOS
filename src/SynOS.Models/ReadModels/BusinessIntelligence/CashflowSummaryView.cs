using System;

namespace SynOS.Models.ReadModels.BusinessIntelligence
{
    public class CashflowSummaryView
    {
        public DateTimeOffset PeriodStart { get; set; }
        public DateTimeOffset PeriodEnd { get; set; }
        public decimal CashIn { get; set; }
        public decimal CashOut { get; set; }
        public decimal NetCashflow { get; set; }
        public string Currency { get; set; } = string.Empty;
    }
}
