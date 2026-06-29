using System;

namespace TBZ.Middleware.Application.DTOs
{
    public class NotificationResult
    {
        public bool Success { get; set; }
        public Guid NotificationMessageId { get; set; }
        public string? MessageId { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
