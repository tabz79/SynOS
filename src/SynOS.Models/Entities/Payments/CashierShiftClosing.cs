using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payments
{
    public class CashierShiftClosing
    {
        [Key]
        public Guid ShiftClosingId { get; set; } = Guid.NewGuid();

        public Guid BranchId { get; set; }

        public Guid UserId { get; set; }

        public DateTime ShiftDate { get; set; }

        [Required]
        [StringLength(50)]
        public string ShiftName { get; set; } = "Day";

        [Column(TypeName = "decimal(12, 2)")]
        public decimal OpeningFloat { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12, 2)")]
        public decimal SystemExpectedCash { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12, 2)")]
        public decimal PhysicalCountedCash { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12, 2)")]
        public decimal Variance { get; set; } = 0.00m;

        public string? DenominationsJson { get; set; }

        public string? ActivitySummaryJson { get; set; }

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Submitted";

        public string? HandoverNotes { get; set; }

        public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;

        public Guid? VerifiedByUserId { get; set; }

        public DateTimeOffset? VerifiedAt { get; set; }
    }
}
