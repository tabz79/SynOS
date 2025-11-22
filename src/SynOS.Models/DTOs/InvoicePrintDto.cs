using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class InvoicePrintDto
    {
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime InvoiceDate { get; set; }
        public PatientPrintDto Patient { get; set; } = new();
        public List<OrderItemPrintDto> Items { get; set; } = new();
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string PrintFormat { get; set; } = "ESC/POS";
        public string PrintPayload { get; set; } = string.Empty;
    }

    public class OrderItemPrintDto
    {
        public string TestName { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }
}
