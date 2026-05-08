using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Economics
{
    public class PartnerReceivableSummaryDto
    {
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; }
        public decimal TotalOutstanding { get; set; }
        public int BillCount { get; set; }
        public DateTime? OldestDueDate { get; set; }
        
        // Aging buckets
        public decimal Aging_0_7 { get; set; }
        public decimal Aging_7_30 { get; set; }
        public decimal Aging_30_Plus { get; set; }

        public string Status => TotalOutstanding > 0 ? "Pending" : "Settled";
    }
}
