using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.HealthCards
{
    public class HealthCardUsageLedger
    {
        [Key]
        public Guid UsageId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CardId { get; set; }

        [ForeignKey("CardId")]
        public PatientHealthCard? Card { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [ForeignKey("VisitId")]
        public Visit? Visit { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal GrossAmount { get; set; }

        [StringLength(20)]
        public string DiscountType { get; set; } = "Percentage";

        [Column(TypeName = "decimal(18, 2)")]
        public decimal DiscountValue { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal DiscountAmount { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal NetAmount { get; set; }

        public DateTime BilledAt { get; set; } = DateTime.UtcNow;

        public Guid? BilledByUserId { get; set; }

        [StringLength(100)]
        public string? BilledByUserName { get; set; }
    }
}
