using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class SplitPaymentItemDto
    {
        public decimal Amount { get; set; }
        public string Method { get; set; } = "Cash";
    }

    public class ReceptionCompletePaymentRequest
    {
        public Guid VisitId { get; set; }
        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty;
        public string? ReceiptNo { get; set; }
        public string? Notes { get; set; }

        // POS Tender & Drawer Shortage Extensions
        public bool AllowOverpayment { get; set; } = false;
        public decimal? TenderedAmount { get; set; }
        public decimal? ChangeReturned { get; set; }
        public decimal? ChangeDue { get; set; }
        public bool IsChangeRetainedAsDue { get; set; }

        // POS Multi-Method / Split Payments (e.g. Cash + UPI)
        public List<SplitPaymentItemDto>? SplitPayments { get; set; }
    }
}
