using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Reporting;
using SynOS.Services;
using SynOS.Services.Reporting;



namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;
        private readonly IInterpretationService _interpretationService;
        private readonly IReportingService _reportingService;
        private readonly IUserService _userService;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(
            IReportService reportService,
            IInterpretationService interpretationService,
            IReportingService reportingService,
            IUserService userService,
            ILogger<ReportsController> _logger)
        {
            _reportService = reportService;
            _interpretationService = interpretationService;
            _reportingService = reportingService;
            _userService = userService;
            this._logger = _logger;
        }

        [HttpPost("{reportId}/sign")]
        [Authorize(Policy = "PathologyPolicy")]
        public async Task<IActionResult> SignReport(Guid reportId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                var result = await _reportService.SignReportAsync(reportId, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (FileNotFoundException ex)
            {
                // GPT-5: Forensic file missing is a 404 Not Found at the resource level
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                // GPT-5: Missing identity data is 422 Unprocessable Entity
                return UnprocessableEntity(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected failure during digital sign-off for report {ReportId}", reportId);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{reportId}/submit")]
        [Authorize(Policy = "TypistPolicy")]
        public async Task<IActionResult> SubmitReport(Guid reportId, [FromBody] SubmitReportRequestDto request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                await _reportService.SubmitForVerificationAsync(reportId, userId, request.IsManualFlow);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{reportId}/reopen")]
        [Authorize(Policy = "PathologyPolicy")]
        public async Task<IActionResult> ReopenReport(Guid reportId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                await _reportService.ReopenReportAsync(reportId, userId);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{reportId}/verify-manual")]
        [Authorize(Policy = "DeliveryPolicy")]
        public async Task<IActionResult> VerifyManual(Guid reportId, [FromQuery] Guid pathologistId)
        {
            try
            {
                await _reportService.MarkManuallyVerifiedAsync(reportId, pathologistId);
                return Ok();
            }
            catch (Exception ex)
            {
                // GPT-5: Explicit error propagation for clinical workflow troubleshooting
                return BadRequest(new { 
                    message = ex.Message, 
                    details = ex.ToString() 
                });
            }
        }


        [HttpPost("{orderId}/results")]
        [Authorize(Policy = "ReportingPolicy")]
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
        [Authorize(Policy = "ReportingPolicy")]
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
        [Authorize(Policy = "DeliveryPolicy")]
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
        [Authorize(Policy = "ReportingPolicy")]
        public async Task<IActionResult> GetReports([FromQuery] string status)
        {
            if (string.IsNullOrEmpty(status))
            {
                return BadRequest(new { message = "Status parameter is required." });
            }

            // GPT-5: Pathologists should only see reports intended for digital sign-off.
            // Manual sign-off reports bypass the Pathologist digital queue.
            bool isPathologist = User.IsInRole("Pathologist");
            var reports = await _reportService.GetReportsByStatusAsync(status, excludeManualFlow: isPathologist);
            return Ok(reports);
        }

        [HttpGet("{reportId}/interpretation")]
        [Authorize(Policy = "ReportingPolicy")]
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
        [Authorize(Policy = "ReportingPolicy")]
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
        [Authorize(Policy = "ReportingPolicy")]
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

        [HttpGet("{reportId}/data")]
        [Authorize(Policy = "ReportingPolicy")]
        public async Task<IActionResult> GetReportData(Guid reportId, [FromQuery] bool forceLive = false)
        {
            try
            {
                var data = await _reportService.GetReportDataForPdfAsync(reportId, forceLive);
                if (data == null) return NotFound(new { message = "Report data not found." });
                return Ok(data);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("pathologists")]
        [Authorize(Policy = "ReportingPolicy")]
        public async Task<IActionResult> GetPathologists()
        {
            var users = await _userService.GetPathologistsAsync();
            return Ok(users.Select(u => new { u.UserId, u.Name }));
        }

        [HttpGet("source/{sourceType}/{sourceId}")]
        [Authorize(Policy = "ReportingPolicy")]
        public async Task<IActionResult> GetReportBySource(string sourceType, Guid sourceId, [FromServices] SynOS.Data.SynOSDbContext context)
        {
            try
            {
                var report = await context.Reports
                    .FirstOrDefaultAsync(r => r.SourceType == sourceType && r.SourceId == sourceId);

                if (report == null)
                {
                    return NotFound(new { message = "Report not found for the specified source." });
                }

                return Ok(new { reportId = report.ReportId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get report by source {SourceType}/{SourceId}", sourceType, sourceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{reportId}/claim")]
        [Authorize(Policy = "ReportingPolicy")]
        public async Task<IActionResult> ClaimReport(Guid reportId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                await _reportService.ClaimReportAsync(reportId, userId);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("archive")]
        [Authorize(Policy = "AdminPolicy")]
        public async Task<IActionResult> SearchArchive(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? searchTerm = null,
            [FromQuery] Guid? branchId = null,
            [FromQuery] string? department = null,
            [FromQuery] System.Collections.Generic.List<string>? statuses = null,
            [FromQuery] DateTimeOffset? startDate = null,
            [FromQuery] DateTimeOffset? endDate = null)
        {
            try
            {
                var result = await _reportService.SearchReportsAsync(
                    pageNumber, pageSize, searchTerm, branchId, department, statuses, startDate, endDate);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
