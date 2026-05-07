using System;

namespace SynOS.Models.DTOs.Economics
{
    public class LabProfitabilitySummaryDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public decimal TotalCashInflow { get; set; }

        // Outflows (Strict Cash Flow)
        public decimal ConsumableCashOutflow { get; set; }
        public decimal OutsourcedTestCashOutflow { get; set; }
        public decimal ReferralCashOutflow { get; set; }
        public decimal PayrollCashOutflow { get; set; }
        public decimal OverheadCashOutflow { get; set; }

        public decimal TotalCashOutflow => 
            ConsumableCashOutflow + 
            OutsourcedTestCashOutflow + 
            ReferralCashOutflow + 
            PayrollCashOutflow + 
            OverheadCashOutflow;

        public decimal NetOperationalPosition => TotalCashInflow - TotalCashOutflow;

        public string Currency { get; set; } = "INR";
    }
}
