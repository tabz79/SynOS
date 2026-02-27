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
        
        // These are not calculated by InvoiceService but required by DTO contract (can be 0)
        public int? PendingReports { get; set; } 
        public double? AvgReportTimeMinutes { get; set; }
    }
}