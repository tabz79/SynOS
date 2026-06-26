using System;

namespace TBZ.Middleware.Domain
{
    public class ReferralConversionFact
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public DateTime Date { get; set; }

        public string ReferralPartnerId { get; set; } = string.Empty;
        public int TotalReferredVisits { get; set; }
        public int ConvertedVisits { get; set; }
        public decimal Revenue { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
