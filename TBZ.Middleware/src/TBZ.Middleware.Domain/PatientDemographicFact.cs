using System;

namespace TBZ.Middleware.Domain
{
    public class PatientDemographicFact
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string AgeGroup { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string PatientLocation { get; set; } = string.Empty;
        public string PatientPincode { get; set; } = string.Empty;

        public int PatientCount { get; set; }
        public decimal Revenue { get; set; }
        public int TestCount { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
