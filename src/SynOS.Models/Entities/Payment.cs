using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Payment
    {
        [Key]
        public Guid PaymentId { get; set; }

        [Required]
        public Guid InvoiceId { get; set; }

        [ForeignKey("InvoiceId")]
        public Invoice Invoice { get; set; }

        [Column(TypeName = "decimal(10, 2)")]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(50)]
        public string Method { get; set; }

        [Required]
        [MaxLength(50)]
        public string ReceiptNo { get; set; }

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public int ReceivedByUserId { get; set; }

        [ForeignKey("ReceivedByUserId")]
        public User ReceivedBy { get; set; }
    }
}
