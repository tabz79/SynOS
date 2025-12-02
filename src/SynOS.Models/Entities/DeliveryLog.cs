using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities;

public class DeliveryLog
{
    [Key]
    public Guid LogId { get; set; }

    public Guid ReportId { get; set; }
    [ForeignKey("ReportId")]
    public Report Report { get; set; } = null!;

    public DeliveryMethod DeliveryMethod { get; set; }

    [MaxLength(20)]
    public string? RecipientPhone { get; set; }

    [MaxLength(200)]
    public string? RecipientEmail { get; set; }

    public Guid DeliveredBy { get; set; }
    [ForeignKey("DeliveredBy")]
    public User DeliveredByUser { get; set; } = null!;

    public DateTimeOffset DeliveredAt { get; set; } = DateTimeOffset.UtcNow;

    public DeliveryStatus Status { get; set; } = DeliveryStatus.Pending; // Default to Pending

    public string? TrackingInfo { get; set; } // JSON with delivery details (provider message id, etc.)

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<DeliveryAttempt> DeliveryAttempts { get; set; } = new List<DeliveryAttempt>();
}
