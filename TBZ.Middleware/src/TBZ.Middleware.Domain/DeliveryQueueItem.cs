using System;

namespace TBZ.Middleware.Domain
{
    public class DeliveryQueueItem
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string MessageType { get; set; } = string.Empty;
        public string PayloadJson { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // "Pending", "Sent", "Failed"
        public DateTime CreatedAt { get; set; }
        public DateTime? SentAt { get; set; }
    }
}
