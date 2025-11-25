using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class CriticalAudit
    {
        [Key]
        public Guid AuditId { get; set; }

        [Required]
        public Guid AlertId { get; set; }
        [ForeignKey("AlertId")]
        public virtual CriticalAlert? Alert { get; set; }

        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        public Guid? ActedByUserId { get; set; }
        [ForeignKey("ActedByUserId")]
        public virtual User? ActedBy { get; set; }

        public DateTimeOffset ActedAt { get; set; } = DateTimeOffset.UtcNow;

        public string? Details { get; set; }
    }
}
