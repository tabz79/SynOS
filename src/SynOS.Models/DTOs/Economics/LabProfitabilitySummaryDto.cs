using System;

namespace SynOS.Models.DTOs.Economics
{
    public class LabProfitabilitySummaryDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // --- CASH BASIS (Truth) ---
        public decimal TotalRevenueCash { get; set; }
        public decimal TotalExpensesCash => 
            ConsumableCashOutflow + 
            OutsourcedTestCashOutflow + 
            ReferralCashOutflow + 
            PayrollCashOutflow + 
            OverheadCashOutflow;

        public decimal ConsumableCashOutflow { get; set; }
        public decimal OutsourcedTestCashOutflow { get; set; }
        public decimal ReferralCashOutflow { get; set; }
        public decimal PayrollCashOutflow { get; set; }
        public decimal OverheadCashOutflow { get; set; }

        public decimal NetCashPosition => TotalRevenueCash - TotalExpensesCash;

        // --- ACCRUAL BASIS (Obligations) ---
        public decimal TotalRevenueAccrual { get; set; }
        public decimal TotalExpensesAccrual { get; set; }
        public decimal NetAccrualPosition => TotalRevenueAccrual - TotalExpensesAccrual;

        // --- DASHBOARD HELPERS ---
        public decimal OperationalNetPosition => NetAccrualPosition;
        public decimal CashInflow => TotalRevenueCash;
        public decimal PendingCollections => TotalRevenueAccrual - TotalRevenueCash;
        public decimal TotalPayoutLiability => TotalExpensesAccrual - TotalExpensesCash;

        public decimal CashMarginPercentage => TotalRevenueCash > 0 ? (NetCashPosition / TotalRevenueCash) * 100 : 0;
        public decimal AccrualMarginPercentage => TotalRevenueAccrual > 0 ? (NetAccrualPosition / TotalRevenueAccrual) * 100 : 0;

        public string Currency { get; set; } = "INR";
    }
}
