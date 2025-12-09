using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class AnalyzerTestMappingSummaryDto
    {
        public Guid MappingId { get; set; }
        public Guid AnalyzerId { get; set; }
        public string AnalyzerName { get; set; } = null!; // To display analyzer name in UI
        public string AnalyzerTestCode { get; set; } = null!;
        public string SynosTestCode { get; set; } = null!;
        public string? UnitsOverride { get; set; }
        public decimal? RefLowOverride { get; set; }
        public decimal? RefHighOverride { get; set; }
        public bool IsEnabled { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
