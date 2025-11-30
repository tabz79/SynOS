using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.ReportTemplateDtos;
using SynOS.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/reports/templates")]
    public class ReportTemplateController : ControllerBase
    {
        private readonly IReportTemplateService _reportTemplateService;
        private readonly IMapper _mapper;

        public ReportTemplateController(IReportTemplateService reportTemplateService, IMapper mapper)
        {
            _reportTemplateService = reportTemplateService;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task<IActionResult> CreateTemplate([FromBody] CreateReportTemplateDto createDto)
        {
            try
            {
                var reportTemplate = await _reportTemplateService.CreateTemplateAsync(createDto);
                var reportTemplateDto = _mapper.Map<ReportTemplateDto>(reportTemplate);
                return CreatedAtAction(nameof(GetTemplateById), new { id = reportTemplate.TemplateId }, reportTemplateDto);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message); // More specific error handling needed
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetTemplates([FromQuery] string? modality = null, [FromQuery] bool includeDeleted = false)
        {
            try
            {
                var templates = await _reportTemplateService.GetTemplatesAsync(modality, includeDeleted);
                return Ok(templates);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTemplateById(Guid id)
        {
            try
            {
                var template = await _reportTemplateService.GetTemplateByIdAsync(id);
                if (template == null)
                {
                    return NotFound();
                }
                return Ok(template);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpdateReportTemplateDto updateDto)
        {
            try
            {
                await _reportTemplateService.UpdateTemplateJsonAsync(id, updateDto);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("{id}/publish")]
        public async Task<IActionResult> PublishTemplate(Guid id)
        {
            try
            {
                await _reportTemplateService.PublishTemplateAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("{id}/set-default")]
        public async Task<IActionResult> SetDefaultTemplate(Guid id)
        {
            try
            {
                await _reportTemplateService.SetDefaultTemplateAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> SoftDeleteTemplate(Guid id)
        {
            try
            {
                await _reportTemplateService.SoftDeleteTemplateAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}/preview")]
        public async Task<IActionResult> PreviewTemplate(Guid id, [FromQuery] Guid visitId)
        {
            try
            {
                // This endpoint renders a PDF using a specific template ID and a visit ID for data
                var pdfBytes = await _reportTemplateService.RenderPdfAsync(visitId, id); // Assuming visitId can be used to get report data for preview
                return File(pdfBytes, "application/pdf", $"Report_Preview_{id}.pdf");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("render")]
        public async Task<IActionResult> RenderReport([FromBody] RenderReportPdfDto renderDto)
        {
            try
            {
                // This endpoint renders a PDF using a report ID, and optionally a template ID
                // If no templateId is provided, the default template for the report's modality will be used
                var pdfBytes = await _reportTemplateService.RenderPdfAsync(renderDto.ReportId, renderDto.TemplateId);
                return File(pdfBytes, "application/pdf", $"Report_{renderDto.ReportId}.pdf");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
