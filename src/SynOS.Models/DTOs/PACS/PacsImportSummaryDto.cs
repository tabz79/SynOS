using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.PACS
{
    public class PacsImportSummaryDto
    {
        public Guid RadiologyStudyId { get; set; }
        public string StudyInstanceUid { get; set; } = string.Empty;
        public string StudyTitle { get; set; } = string.Empty;
        public int SeriesCount { get; set; }
        public int ImagesImported { get; set; }
        public int ImagesSkipped { get; set; }
        public List<string> Warnings { get; set; } = new List<string>();
        public long DurationMs { get; set; }
        public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
    }
}
