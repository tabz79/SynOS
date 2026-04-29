using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Reporting
{
    public class ReportStructureDto
    {
        public Guid ReportId { get; set; }
        public Guid SourceId { get; set; }
        public string Status { get; set; } = string.Empty;
        public PatientHeaderDto Patient { get; set; } = new();
        public List<ReportGroupDto> Groups { get; set; } = new();
        public List<ReportNoteDto> Notes { get; set; } = new();
        public string Department { get; set; } = string.Empty;
        public DateTimeOffset? SignedAt { get; set; }
        public string? SignedBy { get; set; }
        public bool CanEditValues { get; set; }
        public bool IsPhysicallyVerified { get; set; }
    }

    public class PatientHeaderDto
    {
        public string Name { get; set; } = string.Empty;
        public string MRN { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
    }

    public class ReportGroupDto
    {
        public string GroupName { get; set; } = string.Empty;
        public int Order { get; set; }
        public List<ReportParameterDto> Parameters { get; set; } = new();
    }

    public class ReportParameterDto
    {
        public Guid? ResultId { get; set; }
        public string ParameterName { get; set; } = string.Empty;
        public string ParameterCode { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public string ReferenceRange { get; set; } = string.Empty;
        public string Flag { get; set; } = "Normal"; // Normal, High, Low, Critical
        public string? Methodology { get; set; }
        public bool IsOverridden { get; set; }
        public string? OverrideReason { get; set; }
        public bool IsCalculated { get; set; }
        public bool IsAbnormal { get; set; }
    }

    public class ReportNoteDto
    {
        public string Type { get; set; } = string.Empty; // ClinicalSignificance, MethodDetails, etc.
        public string Content { get; set; } = string.Empty;
    }
}
