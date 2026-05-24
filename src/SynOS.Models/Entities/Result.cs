using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Result
    {
        [Key]
        public Guid ResultId { get; set; }

        [Required]
        public Guid OrderId { get; set; }
        [ForeignKey("OrderId")]
        public virtual Order? Order { get; set; }

        [Required]
        [MaxLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Value { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Unit { get; set; }

        [MaxLength(1000)]
        public string? ReferenceRange { get; set; }

        [MaxLength(10)]
        public string? Flag { get; set; } // H, L, HH, LL

        public string? TechComments { get; set; }

        public Guid EnteredByUserId { get; set; }
        [ForeignKey("EnteredByUserId")]
        public virtual User? EnteredBy { get; set; }
        
        public DateTime EnteredAt { get; set; } = DateTime.UtcNow;

        public Guid? VerifiedByUserId { get; set; }
        [ForeignKey("VerifiedByUserId")]
        public virtual User? VerifiedBy { get; set; }
        public DateTime? VerifiedAt { get; set; }

        public Guid? SignedByUserId { get; set; }
        [ForeignKey("SignedByUserId")]
        public virtual User? SignedBy { get; set; }
        public DateTime? SignedAt { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft, AwaitingVerification, Verified, Signed

        public Guid? SupersededByResultId { get; set; }
        
        public bool IsOverridden { get; set; } = false;

        public string? OverrideReason { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
