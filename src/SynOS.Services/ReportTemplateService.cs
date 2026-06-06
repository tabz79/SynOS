using AutoMapper;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using SynOS.Data;
using SynOS.Models.DTOs.ReportTemplateDsl;
using SynOS.Models.DTOs.ReportTemplateDtos;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class ReportTemplateService : IReportTemplateService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IReportPdfRenderer _pdfRenderer;
        private readonly IReportService _reportService;

        private static readonly HashSet<string> ValidSectionTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "Header", "PatientInfo", "ParameterTable", "Comments", "Interpretation",
            "Recommendations", "SignatureBlock", "QRCode", "Footer"
        };

        public ReportTemplateService(SynOSDbContext context, IMapper mapper, IReportPdfRenderer pdfRenderer, IReportService reportService)
        {
            _context = context;
            _mapper = mapper;
            _pdfRenderer = pdfRenderer;
            _reportService = reportService;
        }

        public async Task<ReportTemplate> CreateTemplateAsync(CreateReportTemplateDto createDto)
        {
            ValidateTemplateJson(createDto.TemplateJson);

            var reportTemplate = _mapper.Map<ReportTemplate>(createDto);
            reportTemplate.CreatedAt = DateTimeOffset.UtcNow;
            reportTemplate.UpdatedAt = DateTimeOffset.UtcNow;
            reportTemplate.Version = 1;

            _context.ReportTemplates.Add(reportTemplate);
            await _context.SaveChangesAsync();

            return reportTemplate;
        }

        public async Task<List<ReportTemplateDto>> GetTemplatesAsync(string? modality = null, bool includeDeleted = false)
        {
            var query = _context.ReportTemplates.AsQueryable();
            if (!includeDeleted)
            {
                query = query.Where(t => !t.IsDeleted);
            }
            if (!string.IsNullOrEmpty(modality))
            {
                query = query.Where(t => t.Modality == modality);
            }

            var templates = await query.ToListAsync();
            return _mapper.Map<List<ReportTemplateDto>>(templates);
        }

        public async Task<ReportTemplateDto?> GetTemplateByIdAsync(Guid templateId)
        {
            var template = await _context.ReportTemplates.FindAsync(templateId);
            return _mapper.Map<ReportTemplateDto>(template);
        }

        public async Task UpdateTemplateJsonAsync(Guid templateId, UpdateReportTemplateDto updateDto)
        {
            var template = await _context.ReportTemplates.FindAsync(templateId);
            if (template == null)
            {
                throw new KeyNotFoundException($"Report template with ID {templateId} not found.");
            }

            ValidateTemplateJson(updateDto.TemplateJson);

            _mapper.Map(updateDto, template);
            template.UpdatedAt = DateTimeOffset.UtcNow;
            template.Version++;

            await _context.SaveChangesAsync();
        }

        public async Task PublishTemplateAsync(Guid templateId)
        {
            var template = await _context.ReportTemplates.FindAsync(templateId);
            if (template == null) throw new KeyNotFoundException($"Report template with ID {templateId} not found.");
            template.IsPublished = true;
            template.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task SetDefaultTemplateAsync(Guid templateId)
        {
            var template = await _context.ReportTemplates.FindAsync(templateId);
            if (template == null) throw new KeyNotFoundException($"Report template with ID {templateId} not found.");

            var currentDefault = await _context.ReportTemplates
                .FirstOrDefaultAsync(t => t.Modality == template.Modality && t.IsDefault && !t.IsDeleted);

            if (currentDefault != null)
            {
                currentDefault.IsDefault = false;
            }

            template.IsDefault = true;
            template.IsPublished = true;
            template.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task SoftDeleteTemplateAsync(Guid templateId)
        {
            var template = await _context.ReportTemplates.FindAsync(templateId);
            if (template == null) throw new KeyNotFoundException($"Report template with ID {templateId} not found.");
            template.IsDeleted = true;
            template.IsDefault = false;
            template.IsPublished = false;
            template.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<byte[]> RenderPdfAsync(Guid visitId, Guid? templateId = null)
        {
            var reportData = await _reportService.GetReportDataForPdfAsync(visitId);
            if (reportData == null) throw new KeyNotFoundException($"Report data for ID {visitId} not found.");

            ReportTemplate templateEntity;
            if (templateId.HasValue)
            {
                templateEntity = await _context.ReportTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.TemplateId == templateId.Value && !t.IsDeleted);
                if (templateEntity == null) throw new KeyNotFoundException($"Specified report template with ID {templateId.Value} not found or is deleted.");
            }
            else
            {
                // Try resolving ModalityId if it is a radiology report
                var report = await _context.Reports.AsNoTracking().FirstOrDefaultAsync(r => r.ReportId == visitId);
                Guid? modalityId = null;
                if (report != null && report.SourceType == "RadiologyStudy")
                {
                    var study = await _context.RadiologyStudies.AsNoTracking().FirstOrDefaultAsync(s => s.RadiologyStudyId == report.SourceId);
                    if (study != null)
                    {
                        modalityId = study.ModalityId;
                    }
                }

                if (modalityId.HasValue)
                {
                    templateEntity = await _context.ReportTemplates.AsNoTracking()
                        .FirstOrDefaultAsync(t => t.ModalityId == modalityId.Value && t.IsDefault && t.IsPublished && !t.IsDeleted);

                    // Fallback to legacy string match if no match by ID
                    if (templateEntity == null)
                    {
                        templateEntity = await _context.ReportTemplates.AsNoTracking()
                            .FirstOrDefaultAsync(t => t.Modality == reportData.Modality && t.IsDefault && t.IsPublished && !t.IsDeleted);
                    }
                }
                else
                {
                    templateEntity = await _context.ReportTemplates.AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Modality == reportData.Modality && t.IsDefault && t.IsPublished && !t.IsDeleted);
                }

                if (templateEntity == null) throw new InvalidOperationException($"No default, published, and non-deleted template found for modality '{reportData.Modality}'.");
            }
            
            var templateModel = JsonSerializer.Deserialize<TemplateModel>(templateEntity.TemplateJson);
            if (templateModel == null) throw new InvalidOperationException($"Could not deserialize template DSL for template ID {templateEntity.TemplateId}.");

            return await _pdfRenderer.GeneratePdfAsync(reportData, templateModel);
        }

        private void ValidateTemplateJson(string templateJson)
        {
            try
            {
                var templateModel = JsonSerializer.Deserialize<TemplateModel>(templateJson);

                if (templateModel == null)
                    throw new ArgumentException("TemplateJson cannot be deserialized to a valid TemplateModel.");

                if (templateModel.Meta == null)
                    throw new ArgumentException("Template 'meta' section is required.");

                if (templateModel.Sections == null || !templateModel.Sections.Any())
                    throw new ArgumentException("Template must have at least one 'section'.");

                foreach (var section in templateModel.Sections)
                {
                    if (string.IsNullOrWhiteSpace(section.Type) || !ValidSectionTypes.Contains(section.Type))
                        throw new ArgumentException($"Invalid section type '{section.Type}' found in template.");

                    if (section.Config.ValueKind != JsonValueKind.Object)
                        throw new ArgumentException($"Section '{section.Type}' must have a 'config' object.");
                }
            }
            catch (JsonException ex)
            {
                throw new ArgumentException($"Invalid TemplateJson format: {ex.Message}");
            }
        }
    }
}
