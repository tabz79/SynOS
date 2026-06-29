using System;
using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class PatientListItemDto
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string MobileNumber { get; set; } = string.Empty;
        public string TestsOrdered { get; set; } = string.Empty; // Comma separated list of top/recent tests for display
        public string ReferringDoctorOrPartner { get; set; } = string.Empty;
        public int TotalVisits { get; set; }
        public DateTime? LastVisitDate { get; set; }
        public decimal LifetimeRevenue { get; set; }
    }

    public class PatientDetailsDto
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string MobileNumber { get; set; } = string.Empty;
        public string ReferringDoctorOrPartner { get; set; } = string.Empty;
        public int TotalVisits { get; set; }
        public decimal LifetimeRevenue { get; set; }
        public DateTime? FirstVisitDate { get; set; }
        public DateTime? LastVisitDate { get; set; }
        public List<PatientVisitDto> Visits { get; set; } = new();
    }

    public class PatientVisitDto
    {
        public Guid VisitId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime VisitDate { get; set; }
        public List<string> Tests { get; set; } = new();
        public decimal AmountPaid { get; set; }
    }
}
