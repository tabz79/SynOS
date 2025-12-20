using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Entities.IMS;

namespace SynOS.Models.Entities.CostAttribution
{
    [Table("CostAttribution_UsageFacts")]
    public class CostAttribution_UsageFact
    {
        [Key]
        public Guid UsageFactId { get; set; }

        [Required]
        public Guid TestId { get; set; }

        [Required]
        public Guid InventoryItemId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal Quantity { get; set; }

        [Required]
        [StringLength(50)]
        public string Unit { get; set; }

        [Required]
        public DateTimeOffset OccurredAt { get; set; }

        [Required]
        public Guid SourceEventId { get; set; }

        [Required]
        public CostAttribution_SourceEventType SourceEventType { get; set; }

        [Required]
        public Guid BranchId { get; set; }

        [Required]
        public DateTimeOffset RecordedAt { get; set; } = DateTimeOffset.UtcNow;

        public Guid? CorrectsUsageFactId { get; set; }

        [StringLength(500)]
        public string? CorrectionReason { get; set; }
    }
}
