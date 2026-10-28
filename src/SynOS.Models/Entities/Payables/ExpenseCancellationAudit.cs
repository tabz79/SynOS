using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payables
{
    [Table("ExpenseCancellationAudits", Schema = "Payables")]
    public class ExpenseCancellationAudit
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ExpenseId { get; set; }

        [Required]
        [StringLength(50)]
        public string ExpenseType { get; set; } = "DailyExpense"; // "DailyExpense" | "VendorPayable" | "MonthlyOverhead"

        [Column(TypeName = "decimal(18, 4)")]
        public decimal CancelledAmount { get; set; }

        [StringLength(100)]
        public string Category { get; set; } = string.Empty;

        [StringLength(50)]
        public string PaymentMethod { get; set; } = string.Empty;

        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string Reason { get; set; } = string.Empty;

        [StringLength(1000)]
        public string Notes { get; set; } = string.Empty;

        public bool IsDrawerRefunded { get; set; } = true;

        [Required]
        public Guid CancelledByUserId { get; set; }

        [StringLength(150)]
        public string CancelledByName { get; set; } = "Staff Desk";

        public DateTime CancelledAt { get; set; } = DateTime.UtcNow;
    }
}
