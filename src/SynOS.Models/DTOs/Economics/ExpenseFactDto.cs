using System;

namespace SynOS.Models.DTOs.Economics
{
    public class ExpenseFactDto
    {
        public Guid SpendFactId { get; set; }
        public DateTime OccurredAt { get; set; }
        public string Category { get; set; } = string.Empty;
        public string CategoryLabel { get; set; } = string.Empty;
        public string PayeeName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string PaymentMode { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }
}
