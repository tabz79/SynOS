using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Payables
{
    [Table("EmployeePayables", Schema = "Payables")]
    public class EmployeePayable
    {
        [Key]
        public Guid EmployeePayableId { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid PayrollRunId { get; set; }

        [Required]
        public Guid PayrollPeriodId { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal GrossSalary { get; set; }

        // Deductions
        [Column(TypeName = "decimal(18, 4)")]
        public decimal PFDeduction { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal ESIDeduction { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal TDSDeduction { get; set; } // Manual Override

        [Column(TypeName = "decimal(18, 4)")]
        public decimal OtherDeductions { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal NetPayable { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountPaid { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Due"; // Due, PartiallyPaid, Settled

        public DateTime? SettledAt { get; set; }

        public string? Remarks { get; set; }
        
        // Stability Snapshots (Audit Trail)
        [Column(TypeName = "decimal(18, 4)")]
        public decimal SnapshotBaseSalary { get; set; }
        
        [Column(TypeName = "decimal(18, 4)")]
        public decimal SnapshotPFRate { get; set; }
        
        [Column(TypeName = "decimal(18, 4)")]
        public decimal SnapshotESIRate { get; set; }
        
        public TaxCalculationMode SnapshotTDSMode { get; set; }
        
        [Column(TypeName = "decimal(18, 4)")]
        public decimal SnapshotTDSValue { get; set; }
        
        [Column(TypeName = "decimal(18, 2)")]
        public decimal LopDaysCount { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
