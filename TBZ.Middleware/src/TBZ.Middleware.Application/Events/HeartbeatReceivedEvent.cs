using System;

namespace TBZ.Middleware.Application.Events
{
    public class HeartbeatReceivedEvent
    {
        public Guid EventId { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string? BranchId { get; set; }
        public DateTimeOffset OccurredAt { get; set; }
        public string PayloadJson { get; set; } = string.Empty;
    }
}
