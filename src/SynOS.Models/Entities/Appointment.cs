using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public enum AppointmentStatus
    {
        Booked,
        Arrived,
        Completed,
        Cancelled,
        NoShow
    }

    public class Appointment
    {
        [Key]
        public Guid AppointmentId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient Patient { get; set; }

        [Required]
        public DateTime ScheduledFor { get; set; }

        [Required]
        [MaxLength(50)]
        public string Department { get; set; }

        [Required]
        public AppointmentStatus Status { get; set; } = AppointmentStatus.Booked;

        public string Notes { get; set; }

        public DateTime? ReminderSentAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
