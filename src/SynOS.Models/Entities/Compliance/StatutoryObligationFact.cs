using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums.Compliance;

namespace SynOS.Models.Entities.Compliance
{
    public class StatutoryObligationFact
    {
        [Key]
        public Guid StatutoryObligationFactId { get; set; }
        public AuthorityType AuthorityType { get; set; }
        public ObligationType ObligationType { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public DateTime LegalPeriodStart { get; set; }
        public DateTime LegalPeriodEnd { get; set; }
        public StatutorySourceType SourceType { get; set; }
        public Guid SourceFactId { get; set; }
        public DateTime RecordedAt { get; set; }
    }
}
