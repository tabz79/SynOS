using System;

namespace TBZ.Middleware.Domain
{
    public class StoredEvent
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; } // Key domain identifier, must be UNIQUE
        public string LabId { get; set; } = string.Empty;
        public string? BranchId { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string AggregateType { get; set; } = string.Empty;
        public string AggregateId { get; set; } = string.Empty;
        public string PayloadJson { get; set; } = string.Empty;
        public long Sequence { get; set; }
        public DateTime OccurredAt { get; set; }
        public DateTime ReceivedAt { get; set; }
    }
}
