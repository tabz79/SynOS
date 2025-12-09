using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class UpdateAnalyzerTestMappingDto : CreateAnalyzerTestMappingDto
    {
        public bool IsEnabled { get; set; }
    }
}
