using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class PaymentRequestDto
    {
        [Required]
        public decimal Amount { get; set; }

        [Required]
        public string Method { get; set; }

        [Required]
        public string ReceiptNo { get; set; }
    }
}
