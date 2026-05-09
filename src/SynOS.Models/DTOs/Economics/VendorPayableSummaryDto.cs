using System;

namespace SynOS.Models.DTOs.Economics
{
    public class VendorPayableSummaryDto
    {
        public Guid VendorId { get; set; }
        public string VendorName { get; set; } = string.Empty;
        public decimal TotalOutstanding { get; set; }
        public int BillCount { get; set; }
        public DateTime? OldestDueDate { get; set; }
        public decimal Aging_0_7 { get; set; }
        public decimal Aging_7_30 { get; set; }
        public decimal Aging_30_Plus { get; set; }
    }
}
