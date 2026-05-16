using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.Payables;

namespace SynOS.Models.Entities.Payables
{
    [Table("ReferenceLabPayables", Schema = "Payables")]
    public class ReferenceLabPayable
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [StringLength(200)]
        public string ReferenceLabName { get; set; }

        public Guid? ReferenceLabId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [Required]
        public Guid TestId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountDue { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountPaid { get; set; }

        [Required]
        public ReferencePayableStatus Status { get; set; } = ReferencePayableStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public Guid CreatedBy { get; set; }

        public bool IsPricingResolved { get; set; } = false;
        public DateTime? SettledAt { get; set; }
    }
}
