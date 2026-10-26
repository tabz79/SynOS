using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class BatchEditVisitDto
    {
        // Patient Demographics Updates
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public int? Age { get; set; }
        public string? AgeUnit { get; set; } // "Years", "Months", "Days"
        public string? Gender { get; set; } // "Male", "Female", "Other"
        public string? Mobile { get; set; }

        // Referral & Doctor Updates
        public Guid? ReferralPartnerId { get; set; }
        public Guid? SecondaryPartnerId { get; set; }
        public string? ReferrerText { get; set; }

        // Payer / Billing Mode
        public string? BillingMode { get; set; } // "Standard", "PrepaidPartner", "Insurance", "Corporate"

        // Test Basket Operations
        public List<string> AddTestCodes { get; set; } = new List<string>();
        public List<Guid> RemoveOrderIds { get; set; } = new List<Guid>();

        // Discount Updates
        public bool UpdateDiscount { get; set; } = false;
        public string? DiscountType { get; set; } // "Percentage" | "Flat"
        public decimal? DiscountValue { get; set; }
        public string? DiscountReason { get; set; }

        // Financial Settlement Reconciliation
        // Difference = Staged Revised Net - Previously Paid
        // If Negative: Cash refund owed to patient
        // If Positive: Additional payment collected from patient
        // If Zero: Pure administrative adjustment
        public decimal SettlementDifference { get; set; } = 0;
        public string? PaymentMethod { get; set; } // "Cash", "UPI", "Card"
        public string? PaymentReference { get; set; }

        // Mandatory Operational Justification
        public string Reason { get; set; } = string.Empty;
    }

    public class BatchEditVisitResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public Guid VisitId { get; set; }
        public string Token { get; set; } = string.Empty;
        public decimal RevisedNetTotal { get; set; }
        public decimal SettlementDifference { get; set; }
        public string SettlementAction { get; set; } = "None"; // "RefundIssued" | "AdditionalPaymentRecorded" | "None"
        public List<string> AffectedTubes { get; set; } = new List<string>();
        public bool ReSignRequired { get; set; } = false;
    }
}
