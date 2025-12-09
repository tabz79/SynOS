using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class CreateAnalyzerTestMappingDto
    {
        [Required]
        [MaxLength(50)]
        public string AnalyzerTestCode { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string SynosTestCode { get; set; } = null!;

        [MaxLength(20)]
        public string? UnitsOverride { get; set; }

        public decimal? RefLowOverride { get; set; }

        public decimal? RefHighOverride { get; set; }
    }
}
