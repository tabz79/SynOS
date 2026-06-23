using System;
using System.Collections.Generic;
using SynOS.Models.Enums;

namespace SynOS.Models.DTOs.Processing
{
    public class ProcessingAssignmentDetailDto
    {
        public Guid ProcessingAssignmentId { get; set; }
        public Guid SpecimenId { get; set; }
        public string DepartmentCode { get; set; } = string.Empty;
        public ProcessingAssignmentStatus Status { get; set; }
        public Guid? AssignedResourceId { get; set; }

        public AssignmentPatientDto Patient { get; set; } = null!;
        public AssignmentSpecimenDto Specimen { get; set; } = null!;
        public List<AssignmentTestDto> Tests { get; set; } = new();
    }

    public class AssignmentPatientDto
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Sex { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public bool IsDateOfBirthKnown { get; set; }
    }

    public class AssignmentSpecimenDto
    {
        public Guid SpecimenId { get; set; }
        public string AccessionNumber { get; set; } = string.Empty;
        public string SpecimenType { get; set; } = string.Empty;
        public DateTimeOffset? CollectionTime { get; set; }
    }

    public class AssignmentTestDto
    {
        public Guid OrderId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public List<AssignmentParameterDto> Parameters { get; set; } = new();
    }

    public class AssignmentParameterDto
    {
        public string ParameterCode { get; set; } = string.Empty;
        public string ParameterName { get; set; } = string.Empty;
        public string DataType { get; set; } = "Numeric";
        public string? Unit { get; set; }
        public string? ReferenceRange { get; set; }
        public int SortOrder { get; set; } = 1;
        public bool IsRequired { get; set; } = true;
        public string? EnumOptions { get; set; }
        public string? ExistingResultValue { get; set; }
        public bool IsCalculated { get; set; }
        public string? Formula { get; set; }
        public bool HasFormula { get; set; }
    }

    public class SubmitAssignmentResultsRequestDto
    {
        public List<AssignmentParameterResultDto> Results { get; set; } = new();
    }

    public class AssignmentParameterResultDto
    {
        public Guid OrderId { get; set; }
        public string ParameterCode { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }

    public class ReopenProcessingRequest
    {
        public Guid ProcessingAssignmentId { get; set; }
    }
}
