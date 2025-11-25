using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class CriticalAlert
    {
        [Key]
        public Guid AlertId { get; set; }

        [Required]
        public Guid ResultId { get; set; }
        [ForeignKey("ResultId")]
        public virtual Result? Result { get; set; }

        [Required]
        [MaxLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string ParameterName { get; set; } = string.Empty;
        
        [Required]
        [Column(TypeName = "decimal(18,4)")]
        public decimal Value { get; set; }

        [Required]
        [MaxLength(50)]
        public string CriticalThreshold { get; set; } = string.Empty; // 'CriticalLow' or 'CriticalHigh'

        [Required]
        public Guid PatientId { get; set; }
        [ForeignKey("PatientId")]
        public virtual Patient? Patient { get; set; }

        [Required]
        public Guid VisitId { get; set; }
        [ForeignKey("VisitId")]
        public virtual Visit? Visit { get; set; }

        public Guid? ReferrerId { get; set; }
        [ForeignKey("ReferrerId")]
        public virtual Referrer? Referrer { get; set; }

        public DateTimeOffset TriggeredAt { get; set; } = DateTimeOffset.UtcNow;
        
        [MaxLength(500)]
        public string NotifiedTo { get; set; } = string.Empty;
        public DateTimeOffset? NotifiedAt { get; set; }

        public Guid? AcknowledgedByUserId { get; set; }
        [ForeignKey("AcknowledgedByUserId")]
        public virtual User? AcknowledgedBy { get; set; }
        public DateTimeOffset? AcknowledgedAt { get; set; }

        [MaxLength(50)]
        public string? AckMethod { get; set; }
        
        public string? AckNotes { get; set; }

        public DateTimeOffset? EscalatedAt { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
