using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SynOS.Api.Authorization;
using SynOS.Models.DTOs;
using SynOS.Services;
using SynOS.Services.Operational; // ADDED
using SynOS.Services.Security; // ADDED

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/reception")]
    [Authorize(Policy = "ReceptionPolicy")]
    public class ReceptionController : ControllerBase
    {
        private readonly IReceptionFlowService _receptionFlowService;
        private readonly ILogger<ReceptionController> _logger;
        private readonly IOperationalStatsProjector _projector; // ADDED
        private readonly IUserContext _userContext; // ADDED

        public ReceptionController(IReceptionFlowService receptionFlowService, ILogger<ReceptionController> logger, IOperationalStatsProjector projector, IUserContext userContext)
        {
            _receptionFlowService = receptionFlowService;
            _logger = logger;
            _projector = projector;
            _userContext = userContext;
        }

        [HttpPost("start-visit")]
        public async Task<IActionResult> StartVisit([FromBody] ReceptionStartVisitRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var actorUserId))
                {
                    return Unauthorized(new { message = "User ID not found in token or invalid." });
                }
                var responseDto = await _receptionFlowService.StartVisitAsync(request, actorUserId);
                
                // Trigger live projection
                await _projector.ProjectPendingEventsAsync();

                return CreatedAtAction(nameof(GetVisitSummary), new { visitId = responseDto.VisitId }, new ApiResponse<ReceptionStartVisitResponse>(responseDto));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "NOT_FOUND", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting visit for patient {PatientId}", request.PatientId);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = "An internal error occurred while starting the visit." });
            }
        }

        [HttpPost("complete-payment")]
        public async Task<IActionResult> CompletePayment([FromBody] ReceptionCompletePaymentRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { message = "User ID not found in token." });
                }

                var responseDto = await _receptionFlowService.CompletePaymentAsync(request, userId);
                
                // Trigger live projection
                await _projector.ProjectPendingEventsAsync();

                return Ok(new ApiResponse<ReceptionCompletePaymentResponse>(responseDto));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "NOT_FOUND", message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { code = "INVALID_OPERATION", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing payment for visit {VisitId}", request.VisitId);
                // EXPOSE ERROR FOR DEBUGGING
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message, stack = ex.StackTrace, inner = ex.InnerException?.Message });
            }
        }

        [HttpGet("visit-summary/{visitId}")]
        public async Task<IActionResult> GetVisitSummary(Guid visitId)
        {
            try
            {
                var summaryDto = await _receptionFlowService.GetVisitSummaryAsync(visitId);
                return Ok(new ApiResponse<ReceptionVisitSummaryResponse>(summaryDto));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "NOT_FOUND", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting visit summary for {VisitId}", visitId);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = "An internal error occurred." });
            }
        }
        [HttpPost("visit/discount")]
        public async Task<IActionResult> ApplyDiscount([FromBody] ReceptionApplyDiscountRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

                await _receptionFlowService.ApplyDiscountAsync(request.VisitId, request.DiscountCode, userId);
                
                // Return updated snapshot for UI
                // Front-end expects void/ok currently, but updating snapshot via signalR happens anyway?
                // ReceptionApi.applyDiscountToVisit expects void (200 OK).
                return Ok(new { success = true });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); } // 409 for Rule Violation
            catch (Exception ex) 
            {
                _logger.LogError(ex, "Discount Application Failed");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("visit/discount")]
        public async Task<IActionResult> RemoveDiscount([FromQuery] Guid visitId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

                await _receptionFlowService.RemoveDiscountAsync(visitId, userId);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Discount Removal Failed");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpPost("visit/test")]
        public async Task<IActionResult> AddTest([FromBody] ReceptionAddTestRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

                var response = await _receptionFlowService.AddTestAsync(request.VisitId, request.TestCode, userId);
                
                // Trigger live projection
                await _projector.ProjectPendingEventsAsync();

                return Ok(new ApiResponse<ReceptionStartVisitResponse>(response));
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to add test {TestCode}", request.TestCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("visit/test")]
        public async Task<IActionResult> RemoveTest([FromQuery] Guid visitId, [FromQuery] string testCode)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

                var response = await _receptionFlowService.RemoveTestAsync(visitId, testCode, userId);
                
                // Trigger live projection
                await _projector.ProjectPendingEventsAsync();

                return Ok(new ApiResponse<ReceptionStartVisitResponse>(response));
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to remove test {TestCode}", testCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class ReceptionAddTestRequest
    {
        public Guid VisitId { get; set; }
        public string TestCode { get; set; }
    }

    public class ReceptionApplyDiscountRequest
    {
        public Guid VisitId { get; set; }
        public string DiscountCode { get; set; }
    }
}
