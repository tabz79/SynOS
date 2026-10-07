using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class PaymentRequestDto
    {
        [Required]
        public decimal Amount { get; set; }

        public string? Method { get; set; }

        // Alias for compatibility with external payloads
        public string? PaymentMethod
        {
            get => Method;
            set => Method = value;
        }

        public string? PaymentMode
        {
            get => Method;
            set => Method = value;
        }

        public string? Notes { get; set; }

        public string? ReceiptNo { get; set; }

        public Guid ReceivedByUserId { get; set; }
    }
}

