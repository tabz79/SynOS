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
        public async Task<IActionResult> SubmitLeave([FromBody] SynOS.Models.Entities.Leave.LeaveRequest request, [FromServices] IHrmsOperationService opService, [FromServices] SynOS.Data.SynOSDbContext context)
        {
            if (request.EmployeeId == Guid.Empty)
            {
                var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                Guid.TryParse(userIdStr, out var userId);
                var userName = User.FindFirst("username")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.GivenName)?.Value;

                var emp = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Employees, e => e.UserId == userId || e.EmployeeId == userId);
                if (emp == null && !string.IsNullOrEmpty(userName))
                {
                    var cleanName = userName.ToLower().Replace("dr.", "").Trim();
                    emp = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                        context.Employees,
                        e => (e.FirstName + " " + e.LastName).ToLower().Contains(cleanName) || e.JobTitle.ToLower().Contains(cleanName)
                    );
                }

                if (emp != null)
                {
                    request.EmployeeId = emp.EmployeeId;
                    if (emp.UserId == null && userId != Guid.Empty)
                    {
                        emp.UserId = userId;
                        await context.SaveChangesAsync();
                    }
                }
                else
                {
                    request.EmployeeId = userId;
                }
            }

            var result = await opService.SubmitLeaveRequestAsync(request);
            return Ok(result);
        }

        [HttpPost("review-leave")]
        public async Task<IActionResult> ReviewLeave([FromBody] ReviewLeaveRequestDto review, [FromServices] IHrmsOperationService opService)
        {
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            var success = await opService.ReviewLeaveRequestAsync(review.EffectiveRequestId, review.Status, review.EffectiveNote, userId);
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

        [HttpGet("my-summary")]
        public async Task<IActionResult> GetMySummary([FromServices] SynOS.Data.SynOSDbContext context, [FromQuery] string? month = null)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid.TryParse(userIdStr, out var userId);
            var userName = User.FindFirst("username")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.GivenName)?.Value;

            var emp = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Employees, e => e.UserId == userId || e.EmployeeId == userId);
            if (emp == null && !string.IsNullOrEmpty(userName))
            {
                var cleanName = userName.ToLower().Replace("dr.", "").Trim();
                emp = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                    context.Employees,
                    e => (e.FirstName + " " + e.LastName).ToLower().Contains(cleanName) || e.JobTitle.ToLower().Contains(cleanName)
                );
            }

            if (emp == null)
            {
                emp = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Employees, e => e.IsActive);
            }

            if (emp == null) return NotFound("No employee profile found for active account.");

            if (emp.UserId == null && userId != Guid.Empty)
            {
                emp.UserId = userId;
                await context.SaveChangesAsync();
            }

            DateOnly targetMonth = DateOnly.FromDateTime(DateTime.UtcNow);
            if (!string.IsNullOrEmpty(month))
            {
                if (DateOnly.TryParse(month, out var parsed))
                {
                    targetMonth = parsed;
                }
                else if (DateTime.TryParse(month, out var dtParsed))
                {
                    targetMonth = DateOnly.FromDateTime(dtParsed);
                }
            }

            var summary = await _hrmsService.GetAttendanceLeaveSummaryAsync(emp.EmployeeId, targetMonth);
            return Ok(new {
                employeeId = emp.EmployeeId,
                employeeName = $"{emp.FirstName} {emp.LastName}",
                jobTitle = emp.JobTitle,
                paidLeaveQuota = emp.MonthlyPaidLeaveQuota,
                summary
            });
        }

        [HttpGet("my-requests")]
        public async Task<IActionResult> GetMyRequests([FromServices] SynOS.Data.SynOSDbContext context)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid.TryParse(userIdStr, out var userId);
            var userName = User.FindFirst("username")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.GivenName)?.Value;

            var emp = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Employees, e => e.UserId == userId || e.EmployeeId == userId);
            if (emp == null && !string.IsNullOrEmpty(userName))
            {
                var cleanName = userName.ToLower().Replace("dr.", "").Trim();
                emp = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                    context.Employees,
                    e => (e.FirstName + " " + e.LastName).ToLower().Contains(cleanName) || e.JobTitle.ToLower().Contains(cleanName)
                );
            }

            var empId = emp?.EmployeeId ?? userId;

            var requests = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
                context.LeaveRequests
                .Where(l => l.EmployeeId == empId)
                .OrderByDescending(l => l.AppliedAt)
                .Select(l => new {
                    l.LeaveRequestId,
                    l.EmployeeId,
                    LeaveType = l.LeaveType.ToString(),
                    l.StartDate,
                    l.EndDate,
                    l.Reason,
                    l.Status,
                    l.AppliedAt,
                    ManagerNotes = l.SupervisorNote,
                    ReviewedAt = l.ActionedAt
                })
            );

            return Ok(requests);
        }
    }

    public class ReviewLeaveRequestDto
    {
        public Guid RequestId { get; set; }
        public Guid LeaveRequestId { get; set; }
        public Guid EffectiveRequestId => RequestId != Guid.Empty ? RequestId : LeaveRequestId;

        public string Status { get; set; } = null!;
        public string? Note { get; set; }
        public string? SupervisorNote { get; set; }
        public string? EffectiveNote => !string.IsNullOrEmpty(Note) ? Note : SupervisorNote;
    }

    public class MarkExceptionDto
    {
        public Guid EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = null!;
        public string? Notes { get; set; }
    }
}
