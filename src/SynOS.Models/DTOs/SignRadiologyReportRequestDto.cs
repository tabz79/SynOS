using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class SignRadiologyReportRequestDto
    {
        [Required]
        public Guid StudyId { get; set; }
    }
}
