using System;

namespace TBZ.Middleware.Domain
{
    public enum BusinessSourceType
    {
        WalkIn,
        Doctor,
        ReferralPartner,
        Campaign,
        Corporate,
        Other
    }

    public class BusinessSourceFact
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public BusinessSourceType SourceType { get; set; }
        public string SourceId { get; set; } = string.Empty;
        public string SourceName { get; set; } = string.Empty;
        public bool IsFirstVisit { get; set; }

        public int PatientCount { get; set; }
        public decimal RevenueGenerated { get; set; }
        public int TestCount { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
