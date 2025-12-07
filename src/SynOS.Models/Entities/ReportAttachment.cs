using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ReportAttachment
    {
        [Key]
        public Guid AttachmentId { get; set; }

        [Required]
        public Guid ReportId { get; set; }

        public Report Report { get; set; }

        [Required]
        [StringLength(50)]
        public string Type { get; set; } // 'ReportPdf', 'ImagePdf', 'ImageZip', 'ViewerLink'

        public string FileUrl { get; set; }

        [Required]
        [StringLength(200)]
        public string DisplayName { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
