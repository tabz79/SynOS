using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class LabAnalyzerTestMapping : BaseEntity
    {
        [Key]
        public Guid MappingId { get; set; }

        public Guid AnalyzerId { get; set; }
        public LabAnalyzer Analyzer { get; set; } = null!;

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

        public bool IsEnabled { get; set; } = true;
    }
}
