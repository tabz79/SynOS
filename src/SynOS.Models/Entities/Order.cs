using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Order
    {
        [Key]
        public Guid OrderId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [ForeignKey("VisitId")]
        public Visit? Visit { get; set; }

        [Required]
        public Guid TestId { get; set; } // Foreign key to the new Test entity
        [ForeignKey("TestId")]
        public Test Test { get; set; } = null!; // Navigation property to the new Test entity

        [Required]
        [StringLength(50)]
        public string TestCode { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = string.Empty;

        [Required]
        public SynOS.Models.Enums.OrderStatus Status { get; set; }

        // ADDED: Hardening
        public SynOS.Models.Enums.OrderCancellationReason? CancellationReason { get; set; }
        public DateTime? CancelledAt { get; set; }
        public Guid? CancelledByUserId { get; set; }

        [Column(TypeName = "decimal(12, 2)")]
        public decimal Price { get; set; }

        [Column(TypeName = "decimal(10, 2)")]
        public decimal Discount { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Guid? SpecimenId { get; set; }
        
        [ForeignKey("SpecimenId")]
        public virtual Specimen? Specimen { get; set; }

        public Guid? ParentOrderId { get; set; }

        public bool IsOutsourced { get; set; } = false;

        [StringLength(200)]
        public string? ReferenceLabName { get; set; }

        public DateTime? OutsourcedAt { get; set; }
    }
}
