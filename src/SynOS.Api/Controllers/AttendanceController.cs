using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.HRMS.Interpretation;
using SynOS.Services.HRMS;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/attendance")]
    public class AttendanceController : ControllerBase
    {
        private readonly IHrmsInterpretationService _hrmsService;

        public AttendanceController(IHrmsInterpretationService hrmsService)
        {
            _hrmsService = hrmsService;
        }

        [HttpGet("summary/{employeeId}")]
        public async Task<IActionResult> GetSummary(Guid employeeId, [FromQuery] string month)
        {
            if (!DateOnly.TryParse(month, out var dateMonth))
                return BadRequest("Invalid month format. Use YYYY-MM-DD");

            var summary = await _hrmsService.GetAttendanceLeaveSummaryAsync(employeeId, dateMonth);
            if (summary == null) return NotFound("Employee not found");
            
            return Ok(summary);
        }

        [HttpGet("audit/{employeeId}")]
        public async Task<IActionResult> GetAudit(Guid employeeId)
        {
            var audit = await _hrmsService.GetEmployeeAuditTimelineAsync(employeeId);
            if (audit == null) return NotFound("Employee not found");
            
            return Ok(audit);
        }

        [HttpPost("request-leave")]
        public async Task<IActionResult> SubmitLeave([FromBody] SynOS.Models.Entities.Leave.LeaveRequest request, [FromServices] IHrmsOperationService opService)
        {
            var result = await opService.SubmitLeaveRequestAsync(request);
            return Ok(result);
        }

        [HttpPost("review-leave")]
        public async Task<IActionResult> ReviewLeave([FromBody] ReviewLeaveRequestDto review, [FromServices] IHrmsOperationService opService)
        {
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            var success = await opService.ReviewLeaveRequestAsync(review.RequestId, review.Status, review.Note, userId);
            return success ? Ok() : BadRequest();
        }

        [HttpPost("exception")]
        public async Task<IActionResult> MarkException([FromBody] MarkExceptionDto exception, [FromServices] IHrmsOperationService opService)
        {
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            var success = await opService.MarkAttendanceExceptionAsync(exception.EmployeeId, exception.Date, exception.Status, exception.Notes, userId);
            return success ? Ok() : BadRequest();
        }

        [HttpGet("impact-analysis")]
        public async Task<IActionResult> GetImpactAnalysis([FromQuery] Guid employeeId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            var analysis = await _hrmsService.GetLeaveImpactAnalysisAsync(employeeId, start, end);
            if (analysis == null) return NotFound("Employee not found");
            return Ok(analysis);
        }

        [HttpGet("lop-summary")]
        public async Task<IActionResult> GetLopSummary([FromQuery] string month)
        {
            if (!DateOnly.TryParse(month, out var dateMonth))
                return BadRequest("Invalid month format. Use YYYY-MM-DD");

            var summary = await _hrmsService.GetMonthlyLopSummaryAsync(dateMonth);
            return Ok(summary);
        }

        [HttpGet("pending-leaves")]
        public async Task<IActionResult> GetPendingLeaves([FromServices] SynOS.Data.SynOSDbContext context)
        {
            var pending = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
                context.LeaveRequests
                .Where(l => l.Status == "Pending")
                .Join(context.Employees, l => l.EmployeeId, e => e.EmployeeId, (l, e) => new { l, e })
                .Select(x => new {
                    x.l.LeaveRequestId,
                    x.l.EmployeeId,
                    EmployeeName = $"{x.e.FirstName} {x.e.LastName}",
                    LeaveType = x.l.LeaveType.ToString(),
                    x.l.StartDate,
                    x.l.EndDate,
                    x.l.Reason,
                    x.l.Status,
                    x.l.AppliedAt
                })
            );
            return Ok(pending);
        }
    }

    public class ReviewLeaveRequestDto
    {
        public Guid RequestId { get; set; }
        public string Status { get; set; } = null!;
        public string? Note { get; set; }
    }

    public class MarkExceptionDto
    {
        public Guid EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = null!;
        public string? Notes { get; set; }
    }
}
