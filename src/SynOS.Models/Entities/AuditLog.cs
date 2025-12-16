using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class AuditLog
    {
        [Key]
        public Guid AuditId { get; set; }

        public Guid? ActorUserId { get; set; } // Nullable for system actions
        [ForeignKey("ActorUserId")]
        public virtual User? ActorUser { get; set; }

        [Required]
        [StringLength(100)]
        public string Action { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string ResourceType { get; set; } = string.Empty;

        public Guid? ResourceId { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? Payload { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
