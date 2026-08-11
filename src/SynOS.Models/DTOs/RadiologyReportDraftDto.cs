using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyReportDraftDto
    {
        [Required]
        public Guid StudyId { get; set; }
        public string? Findings { get; set; }
        public string? Impression { get; set; }
        public string? AdditionalNotes { get; set; }
    }
}
