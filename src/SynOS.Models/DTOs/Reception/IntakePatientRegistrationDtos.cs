using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Reception
{
    public class IntakeRegisterPatientRequest
    {
        [Required]
        [StringLength(200, ErrorMessage = "Patient name cannot exceed 200 characters.")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters.")]
        public string Phone { get; set; } = string.Empty;

        [StringLength(20)]
        public string? Gender { get; set; }

        public DateTime? Dob { get; set; }
        public bool? IsDateOfBirthKnown { get; set; }
    }

    public class IntakeRegisterPatientResponse
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
    }
}