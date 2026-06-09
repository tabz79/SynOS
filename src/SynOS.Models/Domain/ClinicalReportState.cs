using System;
using System.Collections.Generic;

namespace SynOS.Models.Domain
{
    public class ClinicalReportState
    {
        public Guid ReportId { get; set; }
        public Guid SourceId { get; set; }
        public Guid? ReportTemplateId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public DateTimeOffset? SignedAt { get; set; }
        public string? SignedBy { get; set; }

        public PatientInfoState Patient { get; set; } = new();
        public List<ResultGroupState> Results { get; set; } = new();
        public List<ReportNoteState> Notes { get; set; } = new();

        public string Comments { get; set; } = string.Empty;
        public string Interpretation { get; set; } = string.Empty;
        public string Recommendations { get; set; } = string.Empty;

        public List<SignatureState> Signatures { get; set; } = new();
        public VerificationState Verification { get; set; } = new();

        public List<ColumnDefinitionState> ColumnDefinitions { get; set; } = new();
    }

    public class PatientInfoState
    {
        public string PatientId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string MRN { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? DateOfBirth { get; set; }
    }

    public class ResultGroupState
    {
        public string GroupName { get; set; } = string.Empty;
        public int Sequence { get; set; }
        public List<ParameterResultState> Parameters { get; set; } = new();
    }

    public class ParameterResultState
    {
        public Guid? ResultId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public string ReferenceRangeText { get; set; } = string.Empty;
        public string Flag { get; set; } = "Normal";
        public string? Method { get; set; }
        public bool IsOverridden { get; set; }
        public string? OverrideReason { get; set; }
        public bool IsCalculated { get; set; }
        public bool HasFormula { get; set; }
        public string? Formula { get; set; }
        public bool IsAbnormal { get; set; }
    }

    public class ReportNoteState
    {
        public string Type { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class SignatureState
    {
        public string Name { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string SignatureImageUrl { get; set; } = string.Empty;
        public string Hash { get; set; } = string.Empty;
        public DateTimeOffset SignedAt { get; set; }
    }

    public class VerificationState
    {
        public string QrCodeContent { get; set; } = string.Empty;
        public int ReportVersion { get; set; }
        public string? VersionHash { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class ColumnDefinitionState
    {
        public string Code { get; set; } = string.Empty; // e.g. "Parameter", "Value", "Unit", "ReferenceRange"
        public string Title { get; set; } = string.Empty;
        public int Weight { get; set; }
        public string Align { get; set; } = "Left"; // Left, Center, Right
        public string HighlightRule { get; set; } = "None"; // None, AbnormalBold, CriticalRed
    }
}
