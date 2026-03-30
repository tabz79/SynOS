using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ReportSnapshot
    {
        [Key]
        [ForeignKey("ReportVersion")]
        public Guid ReportVersionId { get; set; }

        public virtual ReportVersion ReportVersion { get; set; } = null!;

        [Required]
        public string SnapshotJson { get; set; } = string.Empty;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
