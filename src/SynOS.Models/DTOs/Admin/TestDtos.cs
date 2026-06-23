using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Admin
{
    public class TestDto
    {
        public Guid TestId { get; set; }
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public string Department { get; set; }
        public string Category { get; set; }
        public Guid? ModalityId { get; set; }
        public string? ModalityName { get; set; }
        public decimal BasePrice { get; set; }
        public int TAT_Hours { get; set; }
        public bool IsActive { get; set; }
        public bool IsOutsourced { get; set; }
        public string? SpecimenTypeCode { get; set; }
        public bool IsProfile { get; set; }
        public Guid? ReportTemplateId { get; set; }
        public List<ParameterDto> Parameters { get; set; } = new List<ParameterDto>();
        public List<string> IncludedTestCodes { get; set; } = new List<string>();
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }

        public string? DefaultInterpretation { get; set; }
        public DateTimeOffset? DefaultInterpretationLastUpdatedAt { get; set; }
        public Guid? DefaultInterpretationLastUpdatedBy { get; set; }
    }

    public class ParameterSaveDto
    {
        [Required]
        [StringLength(50)]
        public string ParameterCode { get; set; }

        [Required]
        [StringLength(200)]
        public string ParameterName { get; set; }

        [StringLength(50)]
        public string? Unit { get; set; }

        [StringLength(20)]
        public string DataType { get; set; } = "Numeric";

        public int SortOrder { get; set; } = 1;

        [StringLength(100)]
        public string? Methodology { get; set; }

        [StringLength(500)]
        public string? Formula { get; set; }

        public bool IsCalculated { get; set; }

        [StringLength(1000)]
        public string? ReferenceRange { get; set; }

        public bool UseMale { get; set; }
        public decimal? MaleMin { get; set; }
        public decimal? MaleMax { get; set; }

        public bool UseFemale { get; set; }
        public decimal? FemaleMin { get; set; }
        public decimal? FemaleMax { get; set; }

        public bool UseInfant { get; set; }
        public decimal? InfantMin { get; set; }
        public decimal? InfantMax { get; set; }

        public bool UseChild { get; set; }
        public decimal? ChildMin { get; set; }
        public decimal? ChildMax { get; set; }

        public bool UseAdult { get; set; }
        public decimal? AdultMin { get; set; }
        public decimal? AdultMax { get; set; }

        // Category overrides
        public bool UseNewbornMale { get; set; }
        public decimal? NewbornMaleMin { get; set; }
        public decimal? NewbornMaleMax { get; set; }
        public string? NewbornMaleText { get; set; }

        public bool UseNewbornFemale { get; set; }
        public decimal? NewbornFemaleMin { get; set; }
        public decimal? NewbornFemaleMax { get; set; }
        public string? NewbornFemaleText { get; set; }

        public bool UseInfantMale { get; set; }
        public decimal? InfantMaleMin { get; set; }
        public decimal? InfantMaleMax { get; set; }
        public string? InfantMaleText { get; set; }

        public bool UseInfantFemale { get; set; }
        public decimal? InfantFemaleMin { get; set; }
        public decimal? InfantFemaleMax { get; set; }
        public string? InfantFemaleText { get; set; }

        public bool UseChildMale { get; set; }
        public decimal? ChildMaleMin { get; set; }
        public decimal? ChildMaleMax { get; set; }
        public string? ChildMaleText { get; set; }

        public bool UseChildFemale { get; set; }
        public decimal? ChildFemaleMin { get; set; }
        public decimal? ChildFemaleMax { get; set; }
        public string? ChildFemaleText { get; set; }

        public bool UseAdultMale { get; set; }
        public decimal? AdultMaleMin { get; set; }
        public decimal? AdultMaleMax { get; set; }
        public string? AdultMaleText { get; set; }

        public bool UseAdultFemale { get; set; }
        public decimal? AdultFemaleMin { get; set; }
        public decimal? AdultFemaleMax { get; set; }
        public string? AdultFemaleText { get; set; }
    }


    public class CreateTestDto
    {
        [Required]
        [StringLength(50)]
        public string TestCode { get; set; }

        [Required]
        [StringLength(200)]
        public string TestName { get; set; }

        [Required]
        [StringLength(50)]
        public string Department { get; set; }

        [StringLength(100)]
        public string? Category { get; set; }

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal BasePrice { get; set; }

        [Range(1, int.MaxValue)]
        public int TAT_Hours { get; set; } = 24;

        public bool IsOutsourced { get; set; } = false;

        [StringLength(20)]
        public string? SpecimenTypeCode { get; set; }

        public bool IsProfile { get; set; }
        public Guid? ModalityId { get; set; }
        public Guid? ReportTemplateId { get; set; }

        public List<ParameterSaveDto> Parameters { get; set; } = new List<ParameterSaveDto>();

        public List<string> IncludedTestCodes { get; set; } = new List<string>();

        public string? DefaultInterpretation { get; set; }
    }

    public class UpdateTestDto : CreateTestDto
    {
        public bool IsActive { get; set; }
    }
}
