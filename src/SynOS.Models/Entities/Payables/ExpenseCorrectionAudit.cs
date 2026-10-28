using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payables
{
    [Table("ExpenseCorrectionAudits", Schema = "Payables")]
    public class ExpenseCorrectionAudit
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ExpenseId { get; set; }

        [Required]
        [StringLength(50)]
        public string ExpenseType { get; set; } = "DailyExpense"; // "DailyExpense" | "VendorPayable" | "MonthlyOverhead"

        [Column(TypeName = "decimal(18, 4)")]
        public decimal PreviousAmount { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal NewAmount { get; set; }

        [StringLength(100)]
        public string PreviousCategory { get; set; } = string.Empty;

        [StringLength(100)]
        public string NewCategory { get; set; } = string.Empty;

        [StringLength(50)]
        public string PreviousPaymentMethod { get; set; } = string.Empty;

        [StringLength(50)]
        public string NewPaymentMethod { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string Reason { get; set; } = string.Empty;

        [StringLength(1000)]
        public string Notes { get; set; } = string.Empty;

        [Column(TypeName = "nvarchar(max)")]
        public string? AuditDiffJson { get; set; }

        [Required]
        public Guid CorrectedByUserId { get; set; }

        [StringLength(150)]
        public string CorrectedByName { get; set; } = "Staff Desk";

        public DateTime CorrectedAt { get; set; } = DateTime.UtcNow;
    }
}
