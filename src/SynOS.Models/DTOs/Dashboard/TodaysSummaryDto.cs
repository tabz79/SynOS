using System;

namespace SynOS.Models.DTOs.Dashboard
{
    public class TodaysSummaryDto
    {
        public int? WalkInsToday { get; set; }
        public decimal? PaymentsCollected { get; set; } // Grand Total
        public decimal? PaymentsCashTotal { get; set; }
        public decimal? PaymentsOnlineTotal { get; set; }
        public int? PaymentsOnlineCount { get; set; }
        public int? PrepaidBillsCount { get; set; }
        public decimal? PrepaidBillsTotal { get; set; }
        public decimal? DailyExpensesCashTotal { get; set; }
        public decimal? DailyExpensesCashPool { get; set; }
        public decimal? DailyExpensesCashIndividual { get; set; }
        public decimal? CashDrawerBalance { get; set; }
        public decimal? CashDrawerBalancePool { get; set; }
        public decimal? CashDrawerBalanceIndividual { get; set; }
        public decimal? PaymentsCashPool { get; set; }
        public int? PendingReports { get; set; }
        public double? AvgReportTimeMinutes { get; set; }

        // Mapped Phlebotomy Stats
        public int? PendingCollections { get; set; }
        public int? CompletedCollections { get; set; }
        public int? TestsRunning { get; set; }
        public Guid? BranchId { get; set; }
    }
}
