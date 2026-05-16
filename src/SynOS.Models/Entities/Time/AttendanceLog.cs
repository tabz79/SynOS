using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Time
{
    [Table("AttendanceLogs")]
    public class AttendanceLog
    {
        [Key]
        public Guid AttendanceId { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        public DateTime ClockIn { get; set; }
        public DateTime? ClockOut { get; set; }

        [StringLength(50)]
        public string? ShiftType { get; set; } // e.g., "Morning", "Night", "General"

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Present"; // Present, Late, HalfDay, Absent

        [Required]
        [StringLength(20)]
        public string Source { get; set; } = "Manual"; // Manual, Biometric

        public string? EntrySourceId { get; set; } // Device ID or User ID who entered

        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
