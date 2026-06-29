using System;

namespace TBZ.Middleware.Domain
{
    public class NotificationMessage
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string? CorrelationId { get; set; }
        public string Channel { get; set; } = string.Empty; // e.g. "WhatsApp", "Email", "SMS", "Push"
        public string Recipient { get; set; } = string.Empty;
        public string TemplateName { get; set; } = string.Empty;
        public string VariablesJson { get; set; } = "{}"; // JSON dictionary of parameters
        public string? MessageId { get; set; } // Provider-supplied message ID (e.g. WAMID)
        public string? ConversationId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SentAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime? FailedAt { get; set; }
    }
}
