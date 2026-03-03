using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Processing;
using SynOS.Services.Operational;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProcessingController : ControllerBase
    {
        private readonly IProcessingService _processingService;

        public ProcessingController(IProcessingService processingService)
        {
            _processingService = processingService;
        }

        [HttpGet("queue")]
        public async Task<IActionResult> GetQueue()
        {
            var queue = await _processingService.GetQueueAsync();
            return Ok(queue);
        }

        [HttpPost("claim")]
        public async Task<IActionResult> ClaimAssignment([FromBody] ClaimProcessingRequest request)
        {
            if (request == null || request.ProcessingAssignmentId == Guid.Empty)
            {
                return BadRequest("Invalid assignment ID");
            }

            var result = await _processingService.ClaimAssignmentAsync(request.ProcessingAssignmentId);

            return result switch
            {
                ProcessingResult.Success => Ok(new { success = true }),
                ProcessingResult.NotFound => NotFound("Assignment not found"),
                ProcessingResult.Conflict => Conflict("Assignment already claimed or unavailable"),
                ProcessingResult.InvalidBranch => Forbid(),
                ProcessingResult.InvalidDepartment => Forbid(),
                ProcessingResult.NotOperationalMode => StatusCode(403, "Not in operational mode"),
                ProcessingResult.NoOperationalResource => Unauthorized("No operational resource found for user"),
                _ => StatusCode(500, "An unexpected error occurred")
            };
        }

        [HttpPost("complete")]
        public async Task<IActionResult> CompleteAssignment([FromBody] CompleteProcessingRequest request)
        {
            if (request == null || request.ProcessingAssignmentId == Guid.Empty)
            {
                return BadRequest("Invalid assignment ID");
            }

            var result = await _processingService.CompleteAssignmentAsync(request.ProcessingAssignmentId);

            return result switch
            {
                ProcessingResult.Success => Ok(new { success = true }),
                ProcessingResult.NotFound => NotFound("Assignment not found"),
                ProcessingResult.Conflict => Conflict("Assignment cannot be completed in its current state"),
                ProcessingResult.Unauthorized => Forbid("Assignee mismatch"),
                ProcessingResult.InvalidBranch => Forbid("Branch mismatch"),
                ProcessingResult.InvalidDepartment => Forbid("Department mismatch"),
                ProcessingResult.NotOperationalMode => StatusCode(403, "Not in operational mode"),
                ProcessingResult.NoOperationalResource => Unauthorized("No operational resource found for user"),
                _ => StatusCode(500, "An unexpected error occurred")
            };
        }
    }
}
