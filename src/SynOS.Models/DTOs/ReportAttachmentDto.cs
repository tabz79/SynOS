using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class ReportAttachmentDto
    {
        public Guid AttachmentId { get; set; }
        public Guid ReportId { get; set; }
        public string Type { get; set; }
        public string FileUrl { get; set; }
        public string DisplayName { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
