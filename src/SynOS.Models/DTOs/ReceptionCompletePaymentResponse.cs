using System;

namespace SynOS.Models.DTOs
{
    public class ReceptionCompletePaymentResponse
    {
        public Guid VisitId { get; set; }
        public Guid InvoiceId { get; set; }
        public string InvoiceStatus { get; set; } = string.Empty;
        public decimal PaidAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public LastPaymentDto LastPayment { get; set; } = new();
        public string VisitStatus { get; set; } = string.Empty;
    }

    public class LastPaymentDto
    {
        public Guid PaymentId { get; set; }
        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty;
        public string? ReceiptNo { get; set; }
        public DateTime ReceivedAt { get; set; }
    }
}
