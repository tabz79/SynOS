using System;
using System.Collections.Generic;
using System.Linq;
using SynOS.Models.Domain;

namespace SynOS.Models.DTOs.Reporting
{
    public class ReportStructureDto
    {
        public Guid ReportId { get; set; }
        public Guid SourceId { get; set; }
        public Guid? ReportTemplateId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string PatientAgeGender { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public PatientHeaderDto Patient { get; set; } = new();
        public List<ReportGroupDto> Groups { get; set; } = new();
        public List<ReportNoteDto> Notes { get; set; } = new();
        public string Department { get; set; } = string.Empty;
        public DateTimeOffset? SignedAt { get; set; }
        public string? SignedBy { get; set; }
        public bool CanEditValues { get; set; }
        public bool IsPhysicallyVerified { get; set; }
        public bool IsManualFlow { get; set; }
        public List<ColumnDefinitionState> ColumnDefinitions { get; set; } = new();

        public static ReportStructureDto FromDomain(ClinicalReportState state)
        {
            if (state == null) throw new ArgumentNullException(nameof(state));

            return new ReportStructureDto
            {
                ReportId = state.ReportId,
                SourceId = state.SourceId,
                ReportTemplateId = state.ReportTemplateId,
                Status = state.Status,
                PatientName = state.Patient.Name,
                PatientAgeGender = $"{state.Patient.Age} / {state.Patient.Gender}",
                Token = state.Patient.MRN,
                Department = state.Department,
                SignedAt = state.SignedAt,
                SignedBy = state.SignedBy,
                IsPhysicallyVerified = state.Verification.Status == "SIGNED" || state.Status == "ManualVerified",
                IsManualFlow = state.Status == "ManualVerified",
                Patient = new PatientHeaderDto
                {
                    PatientId = state.Patient.PatientId,
                    Name = state.Patient.Name,
                    MRN = state.Patient.MRN,
                    Age = state.Patient.Age,
                    Gender = state.Patient.Gender,
                    Phone = state.Patient.Phone,
                    DateOfBirth = state.Patient.DateOfBirth
                },
                Groups = state.Results.Select(g => new ReportGroupDto
                {
                    GroupName = g.GroupName,
                    Order = g.Sequence,
                    Parameters = g.Parameters.Select(p => new ReportParameterDto
                    {
                        ResultId = p.ResultId,
                        ParameterName = p.Name,
                        ParameterCode = p.Code,
                        Value = p.Value,
                        Unit = p.Unit,
                        ReferenceRange = p.ReferenceRangeText,
                        Flag = p.Flag,
                        Methodology = p.Method,
                        IsOverridden = p.IsOverridden,
                        OverrideReason = p.OverrideReason,
                        IsCalculated = p.IsCalculated,
                        HasFormula = p.HasFormula,
                        Formula = p.Formula,
                        IsAbnormal = p.IsAbnormal,
                        NarrativeTemplate = p.NarrativeTemplate,
                        ShowNarrative = p.ShowNarrative
                    }).ToList()
                }).ToList(),
                Notes = state.Notes.Select(n => new ReportNoteDto
                {
                    Type = n.Type,
                    Content = n.Content
                }).ToList(),
                ColumnDefinitions = state.ColumnDefinitions
            };
        }

        public ClinicalReportState ToDomain()
        {
            return new ClinicalReportState
            {
                ReportId = ReportId,
                SourceId = SourceId,
                ReportTemplateId = ReportTemplateId,
                Status = Status,
                Department = Department,
                SignedAt = SignedAt,
                SignedBy = SignedBy,
                Patient = new PatientInfoState
                {
                    PatientId = Patient.PatientId,
                    Name = Patient.Name,
                    MRN = Patient.MRN,
                    Age = Patient.Age,
                    Gender = Patient.Gender,
                    Phone = Patient.Phone,
                    DateOfBirth = Patient.DateOfBirth
                },
                Results = Groups.Select(g => new ResultGroupState
                {
                    GroupName = g.GroupName,
                    Sequence = g.Order,
                    Parameters = g.Parameters.Select(p => new ParameterResultState
                    {
                        ResultId = p.ResultId,
                        Name = p.ParameterName,
                        Code = p.ParameterCode,
                        Value = p.Value,
                        Unit = p.Unit,
                        ReferenceRangeText = p.ReferenceRange,
                        Flag = p.Flag,
                        Method = p.Methodology,
                        IsOverridden = p.IsOverridden,
                        OverrideReason = p.OverrideReason,
                        IsCalculated = p.IsCalculated,
                        HasFormula = p.HasFormula,
                        Formula = p.Formula,
                        IsAbnormal = p.IsAbnormal,
                        NarrativeTemplate = p.NarrativeTemplate,
                        ShowNarrative = p.ShowNarrative
                    }).ToList()
                }).ToList(),
                Notes = Notes.Select(n => new ReportNoteState
                {
                    Type = n.Type,
                    Content = n.Content
                }).ToList(),
                ColumnDefinitions = ColumnDefinitions
            };
        }
    }

    public class PatientHeaderDto
    {
        public string PatientId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string MRN { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? DateOfBirth { get; set; }
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
        public string Flag { get; set; } = "Normal";
        public string? Methodology { get; set; }
        public bool IsOverridden { get; set; }
        public string? OverrideReason { get; set; }
        public bool IsCalculated { get; set; }
        public bool HasFormula { get; set; }
        public string? Formula { get; set; }
        public bool IsAbnormal { get; set; }
        public string? NarrativeTemplate { get; set; }
        public bool ShowNarrative { get; set; }
    }

    public class ReportNoteDto
    {
        public string Type { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}
