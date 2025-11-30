using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.ReportTemplateDtos
{
    public class UpdateReportTemplateDto
    {
        [Required]
        [StringLength(50, MinimumLength = 1)]
        public string Modality { get; set; } = string.Empty;

        [Required]
        [StringLength(200, MinimumLength = 3)]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string TemplateJson { get; set; } = string.Empty;

        public bool? IsPublished { get; set; }
        public bool? IsDefault { get; set; }
    }
}
