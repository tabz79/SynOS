using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Revenue
{
    /// <summary>
    /// Represents an immutable fact about a discount applied to an Invoice.
    /// This fact is created when a discount is applied during the invoicing process.
    /// </summary>
    public class DiscountFact
    {
        [Key]
        public Guid DiscountFactId { get; set; }

        [Required]
        public Guid InvoiceId { get; set; }

        [Required]
        public Guid DiscountDefinitionId { get; set; } // Links to DiscountMaster

        [Required]
        [Column(TypeName = "decimal(12, 2)")]
        public decimal GrossAmount { get; set; } // Amount before discount

        [Required]
        [Column(TypeName = "decimal(12, 2)")]
        public decimal DiscountAmount { get; set; } // Actual discount applied

        [Required]
        [Column(TypeName = "decimal(12, 2)")]
        public decimal NetAmountAfterDiscount { get; set; } // GrossAmount - DiscountAmount

        [Required]
        [StringLength(256)]
        public string AppliedBy { get; set; } = string.Empty; // User or system that applied the discount

        [Required]
        public DateTime AppliedAt { get; set; } // When the discount was applied

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // When this fact was recorded
    }
}
