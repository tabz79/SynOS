using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Revenue
{
    public class PriceAdjustmentFact
    {
        [Key]
        public Guid AdjustmentId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [Required]
        public Guid InvoiceId { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal DeltaAmount { get; set; } // Signed Value (+/-)

        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        public Guid CreatedBy { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
