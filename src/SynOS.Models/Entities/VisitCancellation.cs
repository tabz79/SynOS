using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class VisitCancellation
    {
        [Key]
        public Guid CancelId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [ForeignKey("VisitId")]
        public Visit? Visit { get; set; }

        [Required]
        [StringLength(200)]
        public string Reason { get; set; } = string.Empty;

        [Column(TypeName = "nvarchar(max)")]
        public string Notes { get; set; } = string.Empty;

        [Required]
        public Guid CancelledByUserId { get; set; }

        [ForeignKey("CancelledByUserId")]
        public User? CancelledBy { get; set; }

        public DateTime CancelledAt { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmountPaid { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ImmediateRefundPaid { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BalancePendingRefund { get; set; }

        [StringLength(50)]
        public string RefundStatus { get; set; } = "None"; // "None" | "Settled" | "Pending" | "PartiallySettled"

        [StringLength(50)]
        public string? ImmediateRefundMethod { get; set; }

        public DateTime? FinalSettledAt { get; set; }

        public Guid? FinalSettledByUserId { get; set; }

        [ForeignKey("FinalSettledByUserId")]
        public User? FinalSettledBy { get; set; }

        [StringLength(64)]
        public string? SettlementReceiptNo { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? SettlementNotes { get; set; }
    }
}
