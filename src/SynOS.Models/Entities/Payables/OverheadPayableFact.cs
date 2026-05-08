using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.Payables;

namespace SynOS.Models.Entities.Payables
{
    [Table("OverheadPayableFacts", Schema = "Payables")]
    public class OverheadPayableFact
    {
        [Key]
        public Guid OverheadPayableId { get; set; }

        [Required]
        public OverheadExpenseCategory Category { get; set; }

        [Required]
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountDue { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountPaid { get; set; } = 0;

        [Required]
        public VendorPayableStatus Status { get; set; } = VendorPayableStatus.Pending;

        public DateTime DueDate { get; set; }

        public DateTime? SettledAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Guid CreatedBy { get; set; }
    }
}
