using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs;
using SynOS.Services;
using SynOS.Services.Reporting;



namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/reports")]
    [Authorize(Policy = "PathologyPolicy")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;
        private readonly IInterpretationService _interpretationService;
        private readonly IReportingService _reportingService;

        public ReportsController(
            IReportService reportService,
            IInterpretationService interpretationService,
            IReportingService reportingService)
        {
            _reportService = reportService;
            _interpretationService = interpretationService;
            _reportingService = reportingService;
        }

        [HttpPost("{reportId}/sign")]
        [Authorize(Policy = "PathologyPolicy")]
        public async Task<IActionResult> SignReport(Guid reportId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            try
            {
                var result = await _reportService.SignReportAsync(reportId, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (BadHttpRequestException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpPost("{orderId}/results")]
        public async Task<IActionResult> SaveFinalResults(Guid orderId, [FromBody] SaveFinalResultsRequestDto request)
        {
            try
            {
                await _reportService.SaveFinalResultsAsync(orderId, request);
                return Ok();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{orderId}")]
        public async Task<IActionResult> GetFinalReport(Guid orderId)
        {
            try
            {
                var report = await _reportService.GetFinalReportAsync(orderId);
                return Ok(report);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("{orderId}/delivered")]
        public async Task<IActionResult> MarkReportAsDelivered(Guid orderId)
        {
            try
            {
                await _reportService.MarkReportAsDeliveredAsync(orderId);
                return Ok();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet]
        [Authorize(Policy = "PathologyPolicy")]
        public async Task<IActionResult> GetReports([FromQuery] string status)
        {
            if (string.IsNullOrEmpty(status))
            {
                return BadRequest(new { message = "Status parameter is required." });
            }

            var reports = await _reportService.GetReportsByStatusAsync(status);
            return Ok(reports);
        }

        [HttpGet("{reportId}/interpretation")]
        public async Task<IActionResult> GetInterpretation(Guid reportId)
        {
            var interpretation = await _interpretationService.GetInterpretationAsync(reportId);
            if (interpretation == null) return NotFound();

            return Ok(new ReportInterpretationDto
            {
                ReportId = interpretation.ReportId,
                Summary = interpretation.Summary,
                Notes = interpretation.Notes,
                CreatedBy = interpretation.CreatedBy,
                CreatedAt = interpretation.CreatedAt,
                UpdatedAt = interpretation.UpdatedAt
            });
        }

        [HttpPost("{reportId}/interpretation")]
        public async Task<IActionResult> SaveInterpretation(Guid reportId, [FromBody] SaveInterpretationRequestDto request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                await _interpretationService.SaveOrUpdateInterpretationAsync(reportId, request.Summary, request.Notes, userId);
                return Ok();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("{reportId}/full")]
        public async Task<IActionResult> GetFullReport(Guid reportId)
        {
            try
            {
                var reportSnapshot = await _reportingService.GetReportStructureAsync(reportId);
                var interpretation = await _interpretationService.GetInterpretationAsync(reportId);

                return Ok(new
                {
                    report = reportSnapshot,
                    interpretation = interpretation != null ? new ReportInterpretationDto
                    {
                        ReportId = interpretation.ReportId,
                        Summary = interpretation.Summary,
                        Notes = interpretation.Notes,
                        CreatedBy = interpretation.CreatedBy,
                        CreatedAt = interpretation.CreatedAt,
                        UpdatedAt = interpretation.UpdatedAt
                    } : null
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
