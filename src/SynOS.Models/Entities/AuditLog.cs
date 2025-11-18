using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class AuditLog
    {
        [Key]
        public Guid AuditLogId { get; set; }

        [Required]
        public Guid UserId { get; set; }
        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        [StringLength(100)]
        public string Action { get; set; } = string.Empty;

        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [StringLength(500)]
        public string EntityType { get; set; } = string.Empty;

        public Guid? EntityId { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string Details { get; set; } = string.Empty;
    }
}
