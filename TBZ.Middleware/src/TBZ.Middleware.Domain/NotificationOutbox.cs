using System;

namespace TBZ.Middleware.Domain
{
    public class NotificationOutbox
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public Guid NotificationMessageId { get; set; }
        public NotificationMessage? NotificationMessage { get; set; }
        public NotificationStatus Status { get; set; } = NotificationStatus.Pending;
        public int Attempts { get; set; } = 0;
        public DateTime? NextRetry { get; set; }
        public DateTime? LockedUntil { get; set; }
        public string? WorkerId { get; set; }
        public string? LastError { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
