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
}
