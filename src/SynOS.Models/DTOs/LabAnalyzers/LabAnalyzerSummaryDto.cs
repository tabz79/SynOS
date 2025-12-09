using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class LabAnalyzerSummaryDto
    {
        public Guid AnalyzerId { get; set; }
        public string Name { get; set; } = null!;
        public string Model { get; set; } = null!;
        public string Manufacturer { get; set; } = null!;
        public string ConnectionType { get; set; } = null!;
        public bool IsEnabled { get; set; }
        public string? Notes { get; set; }
    }
}
