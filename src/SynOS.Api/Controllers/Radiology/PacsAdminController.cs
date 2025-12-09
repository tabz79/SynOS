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
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class PacsAdminController : ControllerBase
    {
        private readonly IPacsService _pacsService;

        public PacsAdminController(IPacsService pacsService)
        {
            _pacsService = pacsService;
        }

        [HttpGet("orphans")]
        public async Task<IActionResult> GetOrphanSummary()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var result = await _pacsService.GetOrphanSummaryAsync(userId);
            return Ok(result);
        }

        [HttpPost("orphans/cleanup")]
        public async Task<IActionResult> CleanupOrphans()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var result = await _pacsService.CleanupOrphansAsync(userId);
            return Ok(result);
        }

        [HttpGet("storage-stats")]
        public async Task<IActionResult> GetStorageStats()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var result = await _pacsService.GetStorageStatsAsync(userId);
            return Ok(result);
        }
    }
}
