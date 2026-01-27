using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Revenue
{
    public class CorrectionFact
    {
        [Key]
        public Guid CorrectionId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [Required]
        public Guid InvoiceId { get; set; }

        [Required]
        public CorrectionType CorrectionType { get; set; }

        public Guid? TargetEntityId { get; set; } // Reference to OrderId or DiscountFactId

        // REMOVED: DeltaAmount (Moved to PriceAdjustmentFact)
        // REMOVED: FinancialRole (Implicitly AuditOnly)

        [Column(TypeName = "decimal(18, 2)")]
        public decimal PreviousAmount { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal NewAmount { get; set; }

        [Required]
        public Guid CreatedBy { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [StringLength(500)]
        public string? Reason { get; set; }

        public bool IsReversal { get; set; } = false;
        
        public string? PayloadJson { get; set; } // For audit details
    }
}
