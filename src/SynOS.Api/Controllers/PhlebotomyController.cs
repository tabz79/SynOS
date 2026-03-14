using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Phlebotomy;
using SynOS.Services.Phlebotomy;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requires valid JWT
    public class PhlebotomyController : ControllerBase
    {
        private readonly IPhlebotomyService _phlebotomyService;

        public PhlebotomyController(IPhlebotomyService phlebotomyService)
        {
            _phlebotomyService = phlebotomyService;
        }

        [HttpPost("claim")]
        public async Task<IActionResult> ClaimAssignment([FromBody] ClaimAssignmentRequest request)
        {
            if (request == null || request.AssignmentId == Guid.Empty)
            {
                return BadRequest("Invalid assignment ID");
            }

            var result = await _phlebotomyService.ClaimAssignmentAsync(request.AssignmentId);

            return result switch
            {
                ClaimResult.Success => Ok(new { success = true }),
                ClaimResult.NotFound => NotFound("Assignment not found"),
                ClaimResult.AlreadyClaimed => Conflict("Assignment already claimed or unavailable"),
                ClaimResult.InvalidBranch => Forbid(), // Branch mismatch
                ClaimResult.NotOperationalMode => Forbid(), // Must be in operational mode
                ClaimResult.NoOperationalResource => Unauthorized("No operational resource found for user"),
                _ => StatusCode(500, "An unexpected error occurred")
            };
        }
        [HttpGet("plan/{visitId}")]
        public async Task<IActionResult> GetCollectionPlan(Guid visitId)
        {
            var plan = await _phlebotomyService.GetCollectionPlanAsync(visitId);
            if (plan == null) return NotFound("Visit not found");
            return Ok(plan);
        }

        [HttpPost("collect")]
        public async Task<IActionResult> Collect([FromBody] CollectAssignmentRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _phlebotomyService.CollectAssignmentAsync(request.AssignmentId);

            return result switch
            {
                CollectResult.Success => Ok(new { message = "Specimens collected successfully." }),
                CollectResult.NotFound => NotFound("Assignment not found."),
                CollectResult.NotOperationalMode => BadRequest("User is not in Operational Mode."),
                CollectResult.NoOperationalResource => BadRequest("Operational Resource not found."),
                CollectResult.Unauthorized => Forbid(),
                CollectResult.InvalidState => Conflict("Assignment is not in 'Assigned' state."),
                CollectResult.NoOrdersFound => BadRequest("No pending orders found for this visit."),
                _ => StatusCode(500, "An unexpected error occurred.")
            };
        }
    }
}
