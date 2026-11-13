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
        private readonly SynOS.Services.Time.ILabTimeProvider _labTimeProvider;

        public ActionQueueController(IOperationsEngine operationsEngine, IUserContext userContext, SynOS.Services.Time.ILabTimeProvider labTimeProvider)
        {
            _operationsEngine = operationsEngine ?? throw new ArgumentNullException(nameof(operationsEngine));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _labTimeProvider = labTimeProvider ?? throw new ArgumentNullException(nameof(labTimeProvider));
        }

        [HttpGet]
        public async Task<ActionResult<List<ActionQueueRowDto>>> GetTodayActionQueue(
            [FromQuery] bool includeHistory = false,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? preset = null)
        {
            var branchId = _userContext.CurrentBranchId;
            if (branchId == Guid.Empty)
            {
                return BadRequest("User context does not have a valid Branch ID.");
            }

            var today = _labTimeProvider.GetLabToday(); 

            if (!string.IsNullOrEmpty(preset))
            {
                var normPreset = preset.Trim().ToLowerInvariant();
                if (normPreset == "today")
                {
                    startDate = today;
                    endDate = today;
                }
                else if (normPreset == "month")
                {
                    startDate = new DateTime(today.Year, today.Month, 1);
                    endDate = today;
                }
                else if (normPreset == "quarter")
                {
                    int quarterMonth = ((today.Month - 1) / 3) * 3 + 1;
                    startDate = new DateTime(today.Year, quarterMonth, 1);
                    endDate = today;
                }
                else if (normPreset == "year")
                {
                    startDate = new DateTime(today.Year, 1, 1);
                    endDate = today;
                }
                else if (normPreset == "single" || normPreset == "singledate")
                {
                    startDate = (startDate ?? today).Date;
                    endDate = startDate;
                }
            }

            if (startDate.HasValue)
            {
                startDate = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Unspecified);
            }
            if (endDate.HasValue)
            {
                endDate = DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Unspecified);
            }

            var queue = await _operationsEngine.GetActionQueueAsync(branchId, today, includeHistory, startDate, endDate);
            return Ok(queue);
        }
    }
}
