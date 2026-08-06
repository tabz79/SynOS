using System;

namespace SynOS.Models.Entities.PACS
{
    public class PacsImportAuditLog
    {
        public Guid AuditLogId { get; set; } = Guid.NewGuid();
        public Guid RadiologyStudyId { get; set; }
        public Guid CreatedBy { get; set; }
        public string StudyInstanceUid { get; set; } = string.Empty;
        public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
        public int SeriesCount { get; set; }
        public int ImagesImported { get; set; }
        public int ImagesSkipped { get; set; }
        public int WarningCount { get; set; }
        public string? WarningsJson { get; set; }
        public string Status { get; set; } = "Success";
        public string? FailureReason { get; set; }
        public long DurationMs { get; set; }
    }
}
