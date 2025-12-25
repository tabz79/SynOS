using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.SpendEngine
{
    public class SpendLineItemFact
    {
        [Key]
        public Guid SpendLineItemFactId { get; init; }

        // Opaque identifier reference to the parent SpendFact. No DB-level FK.
        public Guid SpendFactId { get; init; }

        // Opaque identifier reference to the specific Purchase Order Item. No DB-level FK.
        public Guid PurchaseOrderItemId { get; init; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal Quantity { get; init; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal UnitPrice { get; init; }

        [Required]
        [StringLength(3)] // ISO 4217 currency code
        public string Currency { get; init; } = string.Empty;

        public DateTimeOffset OccurredAt { get; init; }
        public DateTimeOffset RecordedAt { get; init; } = DateTimeOffset.UtcNow;
    }
}
