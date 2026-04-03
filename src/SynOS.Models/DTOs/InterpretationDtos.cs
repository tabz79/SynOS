using System;

namespace SynOS.Models.DTOs
{
    public class SaveInterpretationRequestDto
    {
        public string Summary { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class ReportInterpretationDto
    {
        public Guid ReportId { get; set; }
        public string Summary { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public Guid CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
