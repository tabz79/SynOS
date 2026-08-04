using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Radiology
{
    [ApiController]
    [Route("api/v1/radiology/pacs/admin")]
    [Authorize(Roles = "Admin,SuperAdmin,Radiologist,CTTech,MRITech,XRayTech,USTech,Pathologist,Typist")]
    public class PacsAdminController : ControllerBase
    {
        private readonly IPacsService _pacsService;

        public PacsAdminController(IPacsService pacsService)
        {
            _pacsService = pacsService;
        }

        private bool TryGetUserId(out Guid userId)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(userIdString, out userId);
        }

        [HttpGet("orphans")]
        public async Task<IActionResult> GetOrphanSummary()
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            var result = await _pacsService.GetOrphanSummaryAsync(userId);
            return Ok(result);
        }

        [HttpPost("orphans/cleanup")]
        public async Task<IActionResult> CleanupOrphans()
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            var result = await _pacsService.CleanupOrphansAsync(userId);
            return Ok(result);
        }

        [HttpGet("storage-stats")]
        public async Task<IActionResult> GetStorageStats()
        {
            TryGetUserId(out var userId);
            var result = await _pacsService.GetStorageStatsAsync(userId);
            return Ok(result);
        }
    }
}
