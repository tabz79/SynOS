using System;

namespace TBZ.Middleware.Domain
{
    public class TrendFact
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public DateTime Date { get; set; }

        public string EntityType { get; set; } = string.Empty; // "Test", "Department", "Doctor", "ReferralPartner"
        public string EntityKey { get; set; } = string.Empty;

        public int Count { get; set; }
        public decimal Revenue { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
