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
        public async Task<IActionResult> GetSummary([FromQuery] Guid? branchId)
        {
            var effectiveBranchId = branchId ?? _userContext.CurrentBranchId;
            
            if (effectiveBranchId == Guid.Empty)
            {
                return BadRequest("Branch context missing. Please provide a branchId or ensure you have an active branch session.");
            }

            try 
            {
                var summary = await _controlTowerService.GetFullDashboardAsync(effectiveBranchId);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    message = "Operational failure during dashboard aggregation.",
                    error = ex.Message,
                    sector = ex.Source
                });
            }
        }
    }
}
