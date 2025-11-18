using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class PartialPayment
    {
        [Key]
        public Guid PartialId { get; set; }

        [Required]
        public Guid InvoiceId { get; set; }

        [ForeignKey("InvoiceId")]
        public Invoice? Invoice { get; set; }

        [Column(TypeName = "decimal(12, 2)")]
        public decimal Amount { get; set; }

        [Required]
        [StringLength(50)]
        public string Method { get; set; } = string.Empty;

        public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    }
}
