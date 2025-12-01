using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs;
using SynOS.Services;

using SynOS.Api.Authorization;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/reports")]
    [AuthorizeRoles("PathTech", "Admin", "Pathologist")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpPost("{reportId}/sign")]
        [AuthorizeRoles("Doctor", "Pathologist")]
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

    }
}
