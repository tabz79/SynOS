using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class ManualResultEnqueueResponseDto
    {
        public Guid InboxId { get; set; }
        public Guid AnalyzerId { get; set; }
        public string Status { get; set; } = null!;
        public string? PatientIdentifier { get; set; }
        public string? AnalyzerTestCode { get; set; }
        public string? ResultValue { get; set; }
        public string? Units { get; set; }
    }
}
