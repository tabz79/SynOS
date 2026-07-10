using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("SupportTickets")]
    public class SupportTicket
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string LabId { get; set; } = "LAB001";

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Priority { get; set; } = "Medium";

        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = "General";

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Submitted"; // Submitted, Under Review, In Progress, Waiting for Customer, Resolved, Closed

        [MaxLength(500)]
        public string? StatusMessage { get; set; }

        public Guid? DiagnosticBundleId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
    }
}
