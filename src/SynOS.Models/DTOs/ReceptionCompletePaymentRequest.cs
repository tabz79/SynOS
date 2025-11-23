using System;

namespace SynOS.Models.DTOs
{
    public class ReceptionCompletePaymentRequest
    {
        public Guid VisitId { get; set; }
        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty;
        public string? ReceiptNo { get; set; }
        public string? Notes { get; set; }
    }
}
