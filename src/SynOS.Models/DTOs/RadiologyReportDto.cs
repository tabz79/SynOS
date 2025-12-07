using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyReportDto
    {
        public Guid ReportId { get; set; }
        public Guid RadiologyStudyId { get; set; }
        public string Findings { get; set; }
        public string Impression { get; set; }
        public string AdditionalNotes { get; set; }
        public string ReportStatus { get; set; }
        public Guid? SignedByUserId { get; set; }
        public string SignedByUserName { get; set; }
        public DateTimeOffset? SignedAt { get; set; }
        public List<ReportAttachmentDto> Attachments { get; set; } = new List<ReportAttachmentDto>();
    }
}
