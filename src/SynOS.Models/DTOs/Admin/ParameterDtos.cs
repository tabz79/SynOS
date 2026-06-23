using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Admin
{
    public class ParameterDto
    {
        public Guid ParameterId { get; set; }
        public string ParameterCode { get; set; }
        public string ParameterName { get; set; }
        public string? Unit { get; set; }
        public string DataType { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public string? Methodology { get; set; }
        public string? Formula { get; set; }
        public bool IsCalculated { get; set; }
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

    public class CreateParameterDto
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
    }

    public class UpdateParameterDto : CreateParameterDto
    {
        public bool IsActive { get; set; }
    }
}
