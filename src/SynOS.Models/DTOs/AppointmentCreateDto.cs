using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class AppointmentCreateDto
    {
        [Required]
        public Guid PatientId { get; set; }

        [Required]
        public DateTime ScheduledFor { get; set; }

        [Required]
        public string Department { get; set; }

        public string Notes { get; set; }
    }
}
