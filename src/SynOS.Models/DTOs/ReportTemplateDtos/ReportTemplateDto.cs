using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.DTOs.ReportTemplateDsl;

namespace SynOS.Models.DTOs.ReportTemplateDtos
{
    public class ReportTemplateDto
    {
        public Guid TemplateId { get; set; }
        public string Modality { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public TemplateModel? TemplateDsl { get; set; }
        public int Version { get; set; }
        public bool IsPublished { get; set; }
        public bool IsDefault { get; set; }
        public bool IsDeleted { get; set; }
        public Guid CreatedBy { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }
}
