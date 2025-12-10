using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class ResultChangeAudit
    {
        [Key]
        public Guid AuditId { get; set; }

        public Guid ResultId { get; set; }
        public Result Result { get; set; } = null!;

        [Required]
        [MaxLength(50)] // Max length of result value string
        public string OldValue { get; set; } = null!;

        [Required]
        [MaxLength(50)] // Max length of result value string
        public string NewValue { get; set; } = null!;

        public Guid ChangedByUserId { get; set; }
        public User ChangedByUser { get; set; } = null!; // Assuming ApplicationUser is User

        public DateTimeOffset ChangedAt { get; set; } = DateTimeOffset.UtcNow;

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = null!;

        [MaxLength(50)]
        public string? Source { get; set; }
    }
}
