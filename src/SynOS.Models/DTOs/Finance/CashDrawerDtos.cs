using System;

namespace SynOS.Models.DTOs.Finance
{
    public class DisburseRefundRequestDto
    {
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public string? Notes { get; set; }
    }

    public class CashDrawerLedgerItemDto
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string Type { get; set; } = string.Empty; // "PATIENT_CASH" | "B2B_CASH" | "DAILY_EXPENSE" | "PATIENT_REFUND" | "DRAWER_FLOAT"
        public string Category { get; set; } = string.Empty; // "Inflow" | "Outflow"
        public string ReferenceNo { get; set; } = string.Empty;
        public string? Token { get; set; }
        public string Particulars { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal? TenderedAmount { get; set; }
        public decimal? ChangeReturned { get; set; }
        public decimal InflowAmount { get; set; }
        public decimal OutflowAmount { get; set; }
        public decimal RunningBalance { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public string? Notes { get; set; }
    }

    public class ShiftDenominationsDto
    {
        public int Count500 { get; set; }
        public int Count200 { get; set; }
        public int Count100 { get; set; }
        public int Count50 { get; set; }
        public int Count20 { get; set; }
        public int Count10 { get; set; }
        public decimal Coins { get; set; }

        public decimal CalculateTotal()
        {
            return (Count500 * 500m) +
                   (Count200 * 200m) +
                   (Count100 * 100m) +
                   (Count50 * 50m) +
                   (Count20 * 20m) +
                   (Count10 * 10m) +
                   Coins;
        }
    }

    public class SubmitShiftClosingRequestDto
    {
        public decimal OpeningFloat { get; set; } = 0.00m;
        public decimal PhysicalCountedCash { get; set; }
        public ShiftDenominationsDto? Denominations { get; set; }
        public string? HandoverNotes { get; set; }
        public Guid? SupervisorUserId { get; set; }
        public string? ShiftName { get; set; } = "Day";
        public decimal? AdjustedExpectedCash { get; set; }
        public string? ActivitySummaryJson { get; set; }
        public string? CorrectionsJson { get; set; }
        public string? OpeningFloatSource { get; set; }
    }

    public class VerifyShiftClosingRequestDto
    {
        public string? Notes { get; set; }
    }
}
