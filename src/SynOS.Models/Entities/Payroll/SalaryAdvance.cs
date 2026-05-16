using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payroll
{
    [Table("SalaryAdvances")]
    public class SalaryAdvance
    {
        [Key]
        public Guid AdvanceId { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal Amount { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Adjusted, Recovered

        public string? Reason { get; set; }

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public Guid IssuedBy { get; set; }

        public Guid? AdjustedInPayrollRunId { get; set; } // Link to run where it was recovered

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
