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
        public async Task<IActionResult> GetTodaysSummary()
        {
            var summary = await _dashboardService.GetTodaysSummaryAsync();
            return Ok(summary);
        }
    }
}
