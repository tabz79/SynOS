using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities;

public class DeliveryAttempt
{
    [Key]
    public Guid AttemptId { get; set; }

    public Guid LogId { get; set; }
    [ForeignKey("LogId")]
    public DeliveryLog DeliveryLog { get; set; } = null!;

    public int Attempt { get; set; } = 1;

    public DateTimeOffset SentAt { get; set; } = DateTimeOffset.UtcNow;

    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;

    public string? ErrorMessage { get; set; }

    public string? ResponseData { get; set; } // JSON with provider response
}
