using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.Payables;

namespace SynOS.Models.Entities.Payables
{
    [Table("OverheadExpenses", Schema = "Payables")]
    public class OverheadExpense
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public OverheadExpenseCategory Category { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal Amount { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        public DateTime ExpenseDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public Guid CreatedBy { get; set; }
    }
}
