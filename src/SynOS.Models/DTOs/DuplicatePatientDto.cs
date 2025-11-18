using System;

namespace SynOS.Models.DTOs
{
    public class DuplicatePatientDto
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public int MatchPercentage { get; set; }
    }
}
