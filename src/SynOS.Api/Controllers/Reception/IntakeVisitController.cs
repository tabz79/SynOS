using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Reception;
using SynOS.Services;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Reception
{
    [ApiController]
    [Route("api/v1/reception/visit")]
    [Authorize(Roles = "Receptionist,Admin")]
    public class IntakeVisitController : ControllerBase
    {
        private readonly IReceptionFlowService _service;

        public IntakeVisitController(IReceptionFlowService service)
        {
            _service = service;
        }

        [HttpPost("test")]
        public async Task<IActionResult> AddTest([FromBody] IntakeAddTestRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _service.AddTestAsync(request.VisitId, request.TestCode, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Simple error handling for prototype
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("test")]
        public async Task<IActionResult> RemoveTest([FromQuery] Guid visitId, [FromQuery] string testCode)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _service.RemoveTestAsync(visitId, testCode, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("referral")]
        public async Task<IActionResult> SetReferral([FromBody] SetReferralRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            try
            {
                var userId = GetCurrentUserId();
                await _service.SetVisitReferralAsync(request.VisitId, request.ReferralPartnerId, userId);
                return Ok(); // 200 OK
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // CRITICAL DEBUGGING: Expose unexpected errors
                return StatusCode(500, new { message = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpDelete("referral")]
        public async Task<IActionResult> RemoveReferral([FromQuery] Guid visitId)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _service.RemoveVisitReferralAsync(visitId, userId);
                return Ok();
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, stack = ex.StackTrace });
            }
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            return Guid.Empty;
        }
    }
}
