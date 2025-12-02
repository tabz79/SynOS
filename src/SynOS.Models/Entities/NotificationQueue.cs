using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities;

public class NotificationQueue
{
    [Key]
    public Guid QueueId { get; set; }

    public NotificationType Type { get; set; }

    public Guid TargetId { get; set; } // usually DeliveryLogs.LogId or ReportId

    [Required]
    [MaxLength(200)]
    public string Recipient { get; set; } = null!; // phone or email

    [Required]
    public string Content { get; set; } = null!; // message body or JSON payload

    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;

    public int RetryCount { get; set; } = 0;

    public int MaxRetries { get; set; } = 3;

    public DateTimeOffset? NextRetryAt { get; set; }

    public DateTimeOffset? SentAt { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
