using System;

namespace TBZ.Middleware.Domain
{
    public class PatientIntelligenceFact
    {
        public Guid PatientId { get; set; } // Primary Key
        public string LabId { get; set; } = string.Empty;
        public string MRN { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public DateTime? DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string MobileNumber { get; set; } = string.Empty;
        
        public string ReferringDoctorOrPartner { get; set; } = string.Empty;
        public Guid? ReferralPartnerId { get; set; }
        public Guid? ReferringDoctorId { get; set; }
        public int TotalVisits { get; set; }
        public decimal LifetimeRevenue { get; set; }
        public DateTime? FirstVisitDate { get; set; }
        public DateTime? LastVisitDate { get; set; }
        
        public string LastVisitedBranchId { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
