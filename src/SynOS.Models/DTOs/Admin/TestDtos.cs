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
        public decimal BasePrice { get; set; }
        public int TAT_Hours { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
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
    }

    public class UpdateTestDto : CreateTestDto
    {
        public bool IsActive { get; set; }
    }
}
