using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Referral
{
    public class ReferralPayableFact
    {
        [Key]
        public Guid ReferralPayableFactId { get; init; }

        public Guid ReferralPartnerId { get; init; }

        public decimal Amount { get; init; }

        public string Currency { get; init; } = string.Empty;

        public Guid SourceVisitId { get; init; }

        public DateTime OccurredAt { get; init; }

        public DateTime RecordedAt { get; init; } = DateTime.UtcNow;
    }
}
