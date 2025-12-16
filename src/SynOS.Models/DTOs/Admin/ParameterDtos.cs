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
