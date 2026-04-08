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
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;
        private readonly IInterpretationService _interpretationService;
        private readonly IReportingService _reportingService;
        private readonly IUserService _userService;

        public ReportsController(
            IReportService reportService,
            IInterpretationService interpretationService,
            IReportingService reportingService,
            IUserService userService)
        {
            _reportService = reportService;
            _interpretationService = interpretationService;
            _reportingService = reportingService;
            _userService = userService;
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
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{reportId}/submit")]
        [Authorize(Policy = "TypistPolicy")]
        public async Task<IActionResult> SubmitReport(Guid reportId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                await _reportService.SubmitForVerificationAsync(reportId, userId);
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
                return BadRequest(new { message = ex.Message });
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

            var reports = await _reportService.GetReportsByStatusAsync(status);
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
        [HttpGet("pathologists")]
        [Authorize(Policy = "ReportingPolicy")]
        public async Task<IActionResult> GetPathologists()
        {
            var users = await _userService.GetPathologistsAsync();
            return Ok(users.Select(u => new { u.UserId, u.Name }));
        }
    }
}
