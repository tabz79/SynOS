using System;

namespace SynOS.Models.DTOs
{
    public class ReportVersionDto
    {
        public Guid ReportVersionId { get; set; }
        public Guid ReportId { get; set; }
        public int VersionNumber { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public Guid SignedByUserId { get; set; }
        public DateTimeOffset SignedAt { get; set; }
    }
}
