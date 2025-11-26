using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/reports")]
    [Authorize(Roles = "PathTech,Admin")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpPost("{orderId}/sign")]
        [Authorize(Roles = "PathTech,Admin")] // Example: Only PathTech/Admin can sign
        public async Task<IActionResult> SignReport(Guid orderId, [FromBody] ReportSignRequestDto request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            try
            {
                var reportVersion = await _reportService.SignReportAsync(orderId, userId, request);
                return Ok(reportVersion);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpPost("{orderId}/results")]
        [Authorize(Roles = "PathTech,Admin")] // Example: Only LabTech/Admin can save results
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
        [Authorize(Roles = "PathTech,Admin,Delivery")] // Example: Multiple roles can view reports
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
        [Authorize(Roles = "Delivery,Admin")] // Example: Only Delivery/Admin can mark as delivered
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
