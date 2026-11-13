using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.Dashboard;

namespace SynOS.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/dashboard")] // UPDATED
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("reception/summary")] // UPDATED
        public async Task<IActionResult> GetTodaysSummary([FromQuery] System.DateTime? startDate = null, [FromQuery] System.DateTime? endDate = null, [FromQuery] string? preset = null)
        {
            var summary = await _dashboardService.GetTodaysSummaryAsync(null, null, startDate, endDate, preset);
            return Ok(summary);
        }
    }
}
