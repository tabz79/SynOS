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
        public Guid DiscountDefinitionId { get; set; } // Links to DiscountMaster (Traceability)

        public bool IsActive { get; set; } = true; // ADDED: Hardening
        
        public Guid? ReplacedDiscountFactId { get; set; } // ADDED: Explicit Supersession Trail

        // Snapshot of the RULE (Immutable once applied)
        public SynOS.Models.Enums.DiscountType Type { get; set; }
        
        [Column(TypeName = "decimal(18, 2)")]
        public decimal Value { get; set; } // Percentage or Flat Amount

        [Column(TypeName = "decimal(18, 2)")]
        public decimal? MaxLimit { get; set; }

        // Snapshot of the RESULT (Mutable/Recomputed by Engine)
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
