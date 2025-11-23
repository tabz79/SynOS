using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SynOS.Api.Authorization;
using SynOS.Models.DTOs;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/reception")]
    [Authorize(Roles = "Reception,Admin")]
    public class ReceptionController : ControllerBase
    {
        private readonly IReceptionFlowService _receptionFlowService;
        private readonly ILogger<ReceptionController> _logger;

        public ReceptionController(IReceptionFlowService receptionFlowService, ILogger<ReceptionController> logger)
        {
            _receptionFlowService = receptionFlowService;
            _logger = logger;
        }

        [HttpPost("start-visit")]
        public async Task<IActionResult> StartVisit([FromBody] ReceptionStartVisitRequest request)
        {
            try
            {
                var responseDto = await _receptionFlowService.StartVisitAsync(request);
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
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = "An internal error occurred while completing payment." });
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
    }
}
