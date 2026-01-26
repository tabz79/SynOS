using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Services.Operations;
using SynOS.Services.Security;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/branch/action-queue")]
    [Authorize]
    public class ActionQueueController : ControllerBase
    {
        private readonly IOperationsEngine _operationsEngine;
        private readonly IUserContext _userContext;

        public ActionQueueController(IOperationsEngine operationsEngine, IUserContext userContext)
        {
            _operationsEngine = operationsEngine ?? throw new ArgumentNullException(nameof(operationsEngine));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
        }

        [HttpGet]
        public async Task<ActionResult<List<ActionQueueRowDto>>> GetTodayActionQueue()
        {
            var branchId = _userContext.CurrentBranchId;
            if (branchId == Guid.Empty)
            {
                return BadRequest("User context does not have a valid Branch ID.");
            }

            // Default to "Today" (Server Local Time handled by Engine)
            var today = DateTime.Now; 

            var queue = await _operationsEngine.GetActionQueueAsync(branchId, today);
            return Ok(queue);
        }
    }
}
