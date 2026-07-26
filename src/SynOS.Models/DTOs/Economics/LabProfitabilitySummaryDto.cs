using System;

namespace SynOS.Models.DTOs.Economics
{
    public class LabProfitabilitySummaryDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // --- CASH BASIS (Truth) ---
        public decimal TotalRevenueCash { get; set; }
        public decimal CashCollected { get; set; }
        public decimal OnlineCollected { get; set; }
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
        public System.Collections.Generic.List<DepartmentProfitabilityDto> DepartmentProfitability { get; set; } = new System.Collections.Generic.List<DepartmentProfitabilityDto>();
        public System.Collections.Generic.List<PartnerRoiDto> TopPartnerRoi { get; set; } = new System.Collections.Generic.List<PartnerRoiDto>();
    }

    public class PartnerRoiDto
    {
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public decimal TotalRevenueGenerated { get; set; }
        public decimal TotalCommissionEarned { get; set; }
        public int PatientCount { get; set; }
        public decimal GrowthPercentage { get; set; }
    }

    public class DepartmentProfitabilityDto
    {
        public string DepartmentName { get; set; } = string.Empty;
        public decimal BilledRevenue { get; set; }
        public decimal CashCollected { get; set; }
        public decimal DirectCost { get; set; }
        public decimal NetProfit => CashCollected > 0 ? (CashCollected - DirectCost) : (BilledRevenue - DirectCost);
        public decimal MarginPercentage => (CashCollected > 0 ? CashCollected : BilledRevenue) > 0 
            ? (NetProfit / (CashCollected > 0 ? CashCollected : BilledRevenue)) * 100 
            : 0;
        public decimal ProfitMultiplier { get; set; } = 1.0m;
        public int TotalTestsCompleted { get; set; }
    }
}
