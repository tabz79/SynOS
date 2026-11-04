namespace SynOS.Models.DTOs.Dashboard
{
    public class RevenueStatsDto
    {
        public int? WalkInsToday { get; set; }
        public decimal? PaymentsCollected { get; set; }
        
        // Granular Splits
        public decimal? PaymentsCashTotal { get; set; }
        public decimal? PaymentsOnlineTotal { get; set; }
        public int? PaymentsOnlineCount { get; set; }
        public int? PrepaidBillsCount { get; set; }
        public decimal? PrepaidBillsTotal { get; set; }
        
        // Cash Drawer & Expense Aggregates (Dual Pool vs Individual)
        public decimal? DailyExpensesCashTotal { get; set; }
        public decimal? DailyExpensesCashPool { get; set; }
        public decimal? DailyExpensesCashIndividual { get; set; }
        public decimal? CashDrawerBalance { get; set; }
        public decimal? CashDrawerBalancePool { get; set; }
        public decimal? CashDrawerBalanceIndividual { get; set; }
        public decimal? PaymentsCashPool { get; set; }
        
        // These are not calculated by InvoiceService but required by DTO contract (can be 0)
        public int? PendingReports { get; set; } 
        public double? AvgReportTimeMinutes { get; set; }
    }
}