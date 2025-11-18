using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Invoice
    {
        [Key]
        public Guid InvoiceId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [ForeignKey("VisitId")]
        public Visit? Visit { get; set; }

        [Column(TypeName = "decimal(12, 2)")]
        public decimal GrossAmount { get; set; }

        [Column(TypeName = "decimal(12, 2)")]
        public decimal DiscountAmount { get; set; }

        [Column(TypeName = "decimal(12, 2)")]
        public decimal NetAmount { get; set; }

        [Column(TypeName = "decimal(12, 2)")]
        public decimal TaxAmount { get; set; }

        [Column(TypeName = "decimal(12, 2)")]
        public decimal Total { get; set; }

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        public DateTime DueDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<PartialPayment> PartialPayments { get; set; } = new List<PartialPayment>();
    }
}
