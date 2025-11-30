using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.ReportTemplateDtos
{
    public class RenderReportPdfDto
    {
        [Required]
        public Guid ReportId { get; set; }

        public Guid? TemplateId { get; set; }
    }
}
