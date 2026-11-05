using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class PaymentRequestDto
    {
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Payment amount must be greater than zero.")]
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

        /// <summary>
        /// When true (e.g. tender cash change withheld at desk due to drawer shortage), allows full physical cash amount to be recorded.
        /// </summary>
        public bool AllowOverpayment { get; set; } = false;

        public decimal? TenderedAmount { get; set; }
        public decimal? ChangeReturned { get; set; }
    }
}

