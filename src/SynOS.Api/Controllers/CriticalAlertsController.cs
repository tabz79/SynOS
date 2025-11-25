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
    [Route("api/v1/critical-alerts")]
    [Authorize]
    public class CriticalAlertsController : ControllerBase
    {
        private readonly ICriticalValueService _criticalValueService;

        public CriticalAlertsController(ICriticalValueService criticalValueService)
        {
            _criticalValueService = criticalValueService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAlerts([FromQuery] string status = "Pending", [FromQuery] int limit = 50)
        {
            var alerts = await _criticalValueService.GetAlertsByStatusAsync(status, limit);
            return Ok(new ApiResponse<object>(alerts));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAlertDetails(Guid id)
        {
            var details = await _criticalValueService.GetAlertDetailsAsync(id);
            if (details == null) return NotFound();
            return Ok(new ApiResponse<object>(details));
        }

        [HttpPost("{id}/acknowledge")]
        public async Task<IActionResult> AcknowledgeAlert(Guid id, [FromBody] AcknowledgeAlertRequestDto request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            await _criticalValueService.AcknowledgeAlertAsync(id, userId, request);
            return Ok();
        }

        [HttpPost("{id}/escalate")]
        public async Task<IActionResult> EscalateAlert(Guid id)
        {
            await _criticalValueService.EscalateAlertAsync(id);
            return Ok();
        }
    }
}
