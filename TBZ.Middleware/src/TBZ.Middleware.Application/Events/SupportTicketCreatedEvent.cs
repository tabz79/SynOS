using System;

namespace TBZ.Middleware.Application.Events
{
    public class SupportTicketCreatedEvent
    {
        public Guid EventId { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string PayloadJson { get; set; } = string.Empty;
        public DateTimeOffset OccurredAt { get; set; }
    }
}
