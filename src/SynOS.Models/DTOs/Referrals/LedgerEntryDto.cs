using System;

namespace SynOS.Models.DTOs.Referrals
{
    public class LedgerEntryDto
    {
        public DateTimeOffset EventDate { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal RunningBalance { get; set; }
    }
}
