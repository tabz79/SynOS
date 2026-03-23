using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ReportVersion
    {
        [Key]
        public Guid ReportVersionId { get; set; }

        [Required]
        public Guid ReportId { get; set; }
        [ForeignKey("ReportId")]
        public virtual Report Report { get; set; }

        [Required]
        public int VersionNumber { get; set; }

        [MaxLength(1024)]
        public string? PdfPath { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public Guid? SignedByUserId { get; set; }
        [ForeignKey("SignedByUserId")]
        public virtual User? SignedBy { get; set; }

        public DateTimeOffset? SignedAt { get; set; }
        public virtual ReportSnapshot? Snapshot { get; set; }
    }
}
