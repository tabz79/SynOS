using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/edit-locks")]
    [AllowAnonymous] // DEVELOPER NOTE: Temp for local testing. Remove before commit/merge.
    [Authorize]
    public class EditLocksController : ControllerBase
    {
        private readonly IEditLockService _editLockService;

        // Dev fallback user created for local testing
        private static readonly Guid DEV_FALLBACK_USER_ID = Guid.Parse("6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2");

        public EditLocksController(IEditLockService editLockService)
        {
            _editLockService = editLockService;
        }

        // Helper: safely get user id from claims. Uses DEV_FALLBACK_USER_ID when no user present.
        private Guid GetUserIdSafe()
        {
            try
            {
                var userIdClaim = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                  ?? User?.FindFirst("sub")?.Value;
                if (!string.IsNullOrWhiteSpace(userIdClaim) && Guid.TryParse(userIdClaim, out var parsed))
                    return parsed;
            }
            catch
            {
                // swallow and fallback
            }

            return DEV_FALLBACK_USER_ID;
        }

        [HttpPost("acquire")]
        public async Task<IActionResult> AcquireLock([FromBody] AcquireLockRequestDto request)
        {
            var userId = GetUserIdSafe();

            var (response, lockedByInfo) = await _editLockService.AcquireLockAsync(request.EntityType, request.EntityId, userId);

            if (lockedByInfo != null)
            {
                return Conflict(lockedByInfo); // 409
            }

            return Ok(response);
        }

        [HttpPost("release")]
        public async Task<IActionResult> ReleaseLock([FromBody] ReleaseLockRequestDto request)
        {
            var userId = GetUserIdSafe();

            var success = await _editLockService.ReleaseLockAsync(request.LockId, userId);

            if (!success)
            {
                return BadRequest(new { message = "Failed to release lock. It may not exist or you may not be the owner." });
            }

            return Ok();
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetLockStatus([FromQuery] string entityType, [FromQuery] Guid entityId)
        {
            var status = await _editLockService.GetLockStatusAsync(entityType, entityId);
            return Ok(status);
        }
    }
}
