using System;

namespace SynOS.Models.DTOs.IMS
{
    public class NearExpiryLotDto
    {
        public Guid LotId { get; set; }
        public string TubeName { get; set; }
        public string LotNumber { get; set; }
        public DateTimeOffset ExpiryDate { get; set; }
        public int CurrentQuantity { get; set; }
    }
}
