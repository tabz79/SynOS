using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class RadiologyReport
    {
        [Key]
        public Guid ReportId { get; set; }
        public Report Report { get; set; }

        [Required]
        public Guid RadiologyStudyId { get; set; }

        public RadiologyStudy RadiologyStudy { get; set; }

        public string? Findings { get; set; }

        public string? Impression { get; set; }

        public string? AdditionalNotes { get; set; }
    }
}
