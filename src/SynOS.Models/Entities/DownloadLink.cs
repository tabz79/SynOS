using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities;

public class DownloadLink
{
    [Key]
    public Guid LinkId { get; set; }

    public Guid ReportId { get; set; }
    [ForeignKey("ReportId")]
    public Report Report { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Token { get; set; } = null!;

    public Guid CreatedBy { get; set; }
    [ForeignKey("CreatedBy")]
    public User CreatedByUser { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? DownloadedAt { get; set; }

    public int DownloadCount { get; set; } = 0;

    public int MaxDownloads { get; set; } = 3;

    public bool IsActive { get; set; } = true;
}
