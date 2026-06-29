using System;

namespace TBZ.Middleware.Domain
{
    public class PatientVisitFact
    {
        public Guid VisitId { get; set; } // Primary Key
        public Guid PatientId { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public DateTime VisitDate { get; set; }
        
        public string TestsJson { get; set; } = "[]"; // e.g. ["CBC", "LFT"]
        public decimal AmountPaid { get; set; }
        public string ReferringDoctorOrPartner { get; set; } = string.Empty;
        public Guid? ReferralPartnerId { get; set; }
        public Guid? ReferringDoctorId { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
