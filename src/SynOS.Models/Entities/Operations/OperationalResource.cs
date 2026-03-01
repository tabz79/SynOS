using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Operations
{
    public class OperationalResource : BaseEntity
    {
        [Key]
        public Guid OperationalResourceId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty; // "Phlebotomist", "Pathologist"

        [Required]
        [MaxLength(50)]
        public string Department { get; set; } = string.Empty; // "Pathology", "Radiology"

        [Required]
        public Guid BranchId { get; set; } // ADDED Phase 1A

        public bool IsOnline { get; set; }
        public bool IsActive { get; set; } // "On Duty" toggle
        public DateTime? LastHeartbeat { get; set; }

        [MaxLength(100)]
        public string? PhysicalStation { get; set; } // "Desk 1", "Room 302"

        public Guid? ActiveSessionId { get; set; } // ADDED for Single Operational Session
        public DateTime? LastSessionIssuedAt { get; set; } // ADDED for Single Operational Session

        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
