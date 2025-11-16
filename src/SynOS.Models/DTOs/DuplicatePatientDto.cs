using System;

namespace SynOS.Models.DTOs
{
    public class DuplicatePatientDto
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string PhoneNumber { get; set; }
        public int MatchPercentage { get; set; }
    }
}
