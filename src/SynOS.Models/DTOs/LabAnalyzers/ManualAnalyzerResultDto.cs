using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class ManualAnalyzerResultDto
    {
        public string RawMessage { get; set; } = null!;

        [MaxLength(100)]
        public string? PatientIdentifier { get; set; }

        [MaxLength(50)]
        public string? AnalyzerTestCode { get; set; }

        public string? ResultValue { get; set; }

        [MaxLength(20)]
        public string? Units { get; set; }

        [MaxLength(50)]
        public string? Flags { get; set; }

        public DateTimeOffset? MeasuredAt { get; set; }
    }
}
