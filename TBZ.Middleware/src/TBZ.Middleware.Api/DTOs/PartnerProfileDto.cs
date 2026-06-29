using System;
using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class ReferralPartnerProfileDto
    {
        public PartnerSummaryDto Summary { get; set; } = new();
        public List<MonthlyTrendDto> MonthlyRevenueTrend { get; set; } = new();
        public List<MonthlyTrendDto> MonthlyPatientTrend { get; set; } = new();
        public List<MonthlyTrendDto> AverageBillTrend { get; set; } = new();
        public Dictionary<string, int> GenderDistribution { get; set; } = new();
        public Dictionary<string, int> AgeDistribution { get; set; } = new();
        public List<TestCountDto> TopTests { get; set; } = new();
        public List<PatientRevenueSummaryDto> Top10PatientsByRevenue { get; set; } = new();
        public List<ReferredPatientDto> CompletePatientDirectory { get; set; } = new();
        public List<ReferredVisitDto> RecentPatientTimeline { get; set; } = new();
    }

    public class PartnerSummaryDto
    {
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public string PartnerLocation { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
        public int Patients { get; set; }
        public decimal AverageBill { get; set; }
        public int RepeatPatients { get; set; }
        public int FirstTimePatients { get; set; }
        public DateTime? LastActivity { get; set; }
        public int? DaysSinceLastReferral { get; set; }
        public int TotalUniquePatients { get; set; }
        public int ActivePatientsLast90Days { get; set; }
        public int InactivePatients90PlusDays { get; set; }
        public double AverageDaysBetweenReferrals { get; set; }
        public string HighestValuePatientName { get; set; } = string.Empty;
        public decimal HighestValuePatientRevenue { get; set; }
        public string MostRecentPatientName { get; set; } = string.Empty;
        public DateTime? MostRecentPatientDate { get; set; }
    }

    public class MonthlyTrendDto
    {
        public string Month { get; set; } = string.Empty; // e.g. "2026-06"
        public decimal Value { get; set; }
    }

    public class TestCountDto
    {
        public string TestCode { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class PatientRevenueSummaryDto
    {
        public Guid PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
    }

    public class ReferredPatientDto
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string MobileNumber { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public int TotalVisits { get; set; }
        public decimal LifetimeRevenue { get; set; }
        public DateTime? FirstVisit { get; set; }
        public DateTime? LastVisit { get; set; }
        public string LastTestsOrdered { get; set; } = string.Empty;
    }

    public class ReferredVisitDto
    {
        public DateTime VisitDate { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public List<string> TestsOrdered { get; set; } = new();
        public decimal AmountPaid { get; set; }
    }
}
