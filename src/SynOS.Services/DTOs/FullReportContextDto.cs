using System;
using SynOS.Models.DTOs.Reporting;

namespace SynOS.Services.DTOs
{
    public class FullReportContextDto
    {
        public ReportStructureDto Report { get; set; } = null!;
        public ReportDataModel ReportData { get; set; } = null!;
        public InterpretationDto? Interpretation { get; set; }
    }

    public class InterpretationDto
    {
        public string Summary { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }
}
