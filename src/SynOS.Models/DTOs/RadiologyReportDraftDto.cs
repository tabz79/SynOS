using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyReportDraftDto
    {
        [Required]
        public Guid StudyId { get; set; }
        [Required]
        public string Findings { get; set; }
        [Required]
        public string Impression { get; set; }
        public string AdditionalNotes { get; set; }
    }
}
