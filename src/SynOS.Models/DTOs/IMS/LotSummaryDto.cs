using System;

namespace SynOS.Models.DTOs.IMS
{
    public class LotSummaryDto
    {
        public Guid LotId { get; set; }
        public Guid TubeId { get; set; }
        public string TubeName { get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; }
        public string LotNumber { get; set; }
        public DateTimeOffset ExpiryDate { get; set; }
        public int CurrentQuantity { get; set; }
        public DateTimeOffset ReceivedAt { get; set; }
        public bool IsActive { get; set; }
    }
}
