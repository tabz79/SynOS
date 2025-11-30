using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.ReportTemplateDtos;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IReportTemplateService
    {
        Task<ReportTemplate> CreateTemplateAsync(CreateReportTemplateDto createDto);
        Task<List<ReportTemplateDto>> GetTemplatesAsync(string? modality = null, bool includeDeleted = false);
        Task<ReportTemplateDto?> GetTemplateByIdAsync(Guid templateId);
        Task UpdateTemplateJsonAsync(Guid templateId, UpdateReportTemplateDto updateDto);
        Task PublishTemplateAsync(Guid templateId);
        Task SetDefaultTemplateAsync(Guid templateId);
        Task SoftDeleteTemplateAsync(Guid templateId);
        Task<byte[]> RenderPdfAsync(Guid reportId, Guid? templateId = null);
    }
}
