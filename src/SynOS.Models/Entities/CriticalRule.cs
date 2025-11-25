using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class CriticalRule
    {
        [Key]
        public Guid RuleId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,4)")]
        public decimal? CriticalLow { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal? CriticalHigh { get; set; }

        public int EscalationMinutes { get; set; } = 30;

        public bool RequireAcknowledgment { get; set; } = true;

        [MaxLength(200)]
        public string NotificationChannels { get; set; } = "SMS,EMAIL";

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
