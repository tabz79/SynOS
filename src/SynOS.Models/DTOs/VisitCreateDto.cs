using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class VisitCreateDto
    {
        [Required]
        public Guid PatientId { get; set; }

        [Required]
        public string Department { get; set; } = string.Empty;

        public Guid? ReferrerId { get; set; }

        [Required]
        public List<string> TestCodes { get; set; } = new List<string>();
    }
}
