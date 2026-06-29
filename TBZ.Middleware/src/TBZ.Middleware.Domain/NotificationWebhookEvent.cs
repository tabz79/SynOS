using System;

namespace TBZ.Middleware.Domain
{
    public class NotificationWebhookEvent
    {
        public Guid Id { get; set; }
        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
        public string? MessageId { get; set; }
        public string? Status { get; set; }
        public string? Phone { get; set; }
        public string? ConversationId { get; set; }
        public string RawJson { get; set; } = string.Empty;
    }
}
