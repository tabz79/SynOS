using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.ReadModels;

using Microsoft.AspNetCore.Authorization; 
using SynOS.Services.Security;
using SynOS.Services.Operational; // ADDED

namespace SynOS.Api.Controllers
{
    [Authorize] 
    [ApiController]
    [Route("api/v1/branch/activity")]
    public class BranchActivityController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IUserContext _userContext;
        private readonly IActivityStreamService _activityStreamService; // ADDED

        public BranchActivityController(SynOSDbContext context, IUserContext userContext, IActivityStreamService activityStreamService)
        {
            _context = context;
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _activityStreamService = activityStreamService ?? throw new ArgumentNullException(nameof(activityStreamService));
        }

        // NEW: Role-Based Projection Endpoint (BFF)
        [HttpGet("{role}")]
        public async Task<IActionResult> GetActivityForRole(string role)
        {
            if (string.IsNullOrWhiteSpace(role)) return BadRequest("Role required.");

            if (_userContext.CurrentBranchId == Guid.Empty)
            {
                return Forbid();
            }

            // Backend owns the projection logic
            var activity = await _activityStreamService.GetActivityForRoleAsync(_userContext.CurrentBranchId, role);
            
            return Ok(activity);
        }

        // LEGACY: Raw Event Access (Obsolete - Do not use in new UI)
        [HttpGet]
        [Obsolete("Use /api/v1/branch/activity/{role} for role-specific projections.")]
        public async Task<IActionResult> GetBranchActivity([FromQuery] string? branchId)
        {
            // 1. Enforce Context
            if (_userContext.CurrentBranchId == Guid.Empty)
            {
                return Forbid(); // 403: Authenticated but no branch context
            }

            var contextBranchId = _userContext.CurrentBranchId.ToString();

            // 2. Validate Query Param (if present, must match context)
            if (!string.IsNullOrWhiteSpace(branchId) && !string.Equals(branchId, contextBranchId, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Requested BranchId does not match authenticated user context.");
            }

            // 3. Strict Filtering
            var targetBranchId = contextBranchId;

            // UTC Day Filtering (Strict Mode)
            var utcToday = DateTime.UtcNow.Date;
            var utcTomorrow = utcToday.AddDays(1);

            var events = await _context.BranchOperationalEvents
                .AsNoTracking()
                .Where(e => e.BranchId == targetBranchId && e.OccurredAt >= utcToday && e.OccurredAt < utcTomorrow)
                .OrderByDescending(e => e.OccurredAt)
                .Take(50)
                .ToListAsync();

            return Ok(events);
        }
    }
}
