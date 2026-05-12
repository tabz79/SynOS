using System;

namespace SynOS.Models.DTOs.Reception
{
    public class IntakeRegisterPatientRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public DateTime? Dob { get; set; }
    }

    public class IntakeRegisterPatientResponse
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
    }
}