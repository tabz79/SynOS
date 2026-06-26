using System;

namespace TBZ.Middleware.Domain
{
    public class ReferralPartnerFact
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public DateTime Date { get; set; }

        public string ReferralPartnerId { get; set; } = string.Empty;
        public string ReferralPartnerName { get; set; } = string.Empty;
        public string ReferralPartnerLocation { get; set; } = string.Empty;

        public int PatientCount { get; set; }
        public decimal RevenueGenerated { get; set; }
        public int TestCount { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
