using System;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class AnalyzerImportResultDto
    {
        public Guid InboxId { get; set; }
        public Guid AnalyzerId { get; set; }
        public Guid? OrderId { get; set; }
        public string? ParameterCode { get; set; }
        public Guid? ResultId { get; set; }
        public string Status { get; set; }           // e.g. "Imported", "AlreadyImported", "Error"
        public string? Message { get; set; }         // any info / error note
    }
}
