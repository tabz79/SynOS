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
        public async Task<IActionResult> GetSummary([FromQuery] Guid? branchId, [FromQuery] bool isConsolidated = false)
        {
            Guid? serviceBranchId = branchId ?? _userContext.CurrentBranchId;
            
            if (isConsolidated && (_userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin"))
            {
                serviceBranchId = null;
            }
            else if (serviceBranchId == Guid.Empty || serviceBranchId == null)
            {
                return BadRequest("Branch context missing. Please provide a branchId or ensure you have an active branch session.");
            }

            try 
            {
                var summary = await _controlTowerService.GetFullDashboardAsync(serviceBranchId);
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
