using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("OutboxEvents")]
    public class OutboxEvent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public int EventVersion { get; set; } = 1;

        [Required]
        [StringLength(100)]
        public string EventType { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string AggregateType { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string AggregateId { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string LabId { get; set; } = string.Empty;

        [StringLength(50)]
        public string? BranchId { get; set; }

        [Required]
        public string PayloadJson { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? SentAt { get; set; }

        public int RetryCount { get; set; } = 0;

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Sent, Failed, DeadLetter
    }
}
