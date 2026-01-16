using System;

namespace SynOS.Models.DTOs.Dashboard
{
    public class TodaysSummaryDto
    {
        public int WalkInsToday { get; set; }
        public decimal PaymentsCollected { get; set; }
        public int PendingReports { get; set; }
        public double AvgReportTimeMinutes { get; set; }
    }
}
