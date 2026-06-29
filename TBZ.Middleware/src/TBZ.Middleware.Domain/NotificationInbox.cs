using System;

namespace TBZ.Middleware.Domain
{
    public class NotificationInbox
    {
        public Guid Id { get; set; }
        public string Sender { get; set; } = string.Empty; // Recipient's phone or identifier
        public string? MessageId { get; set; }
        public string Channel { get; set; } = "WhatsApp";
        public string Body { get; set; } = string.Empty;
        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
        public string RawPayload { get; set; } = string.Empty;
        public bool Processed { get; set; } = false;
        public DateTime? ProcessedAt { get; set; }
    }
}
