using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class PaymentRequestDto
    {
        [Required]
        public decimal Amount { get; set; }

        [Required]
        public string Method { get; set; } = string.Empty;

        [Required]
        public string ReceiptNo { get; set; } = string.Empty;

        [Required]
        public Guid ReceivedByUserId { get; set; }
    }
}
