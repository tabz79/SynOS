using System;
using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class RevenueSummaryDto
    {
        public string LabId { get; set; } = string.Empty;
        public List<DailyRevenueDto> DailyData { get; set; } = new();
    }

    public class DailyRevenueDto
    {
        public DateTime Date { get; set; }
        public decimal RevenueCollected { get; set; }
        public int PaymentsCount { get; set; }
        public int BillsCreated { get; set; }
        public decimal AvgBillValue { get; set; }
    }
}
