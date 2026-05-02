using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.Dashboard;
using SynOS.Services.Security;

namespace SynOS.Api.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/v1/dashboard/control-tower")]
    public class ControlTowerController : ControllerBase
    {
        private readonly IControlTowerService _controlTowerService;
        private readonly IUserContext _userContext;

        public ControlTowerController(IControlTowerService controlTowerService, IUserContext userContext)
        {
            _controlTowerService = controlTowerService;
            _userContext = userContext;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var branchId = _userContext.CurrentBranchId;
            if (branchId == Guid.Empty)
            {
                return BadRequest("Branch context missing.");
            }

            var summary = await _controlTowerService.GetFullDashboardAsync(branchId);
            return Ok(summary);
        }
    }
}
