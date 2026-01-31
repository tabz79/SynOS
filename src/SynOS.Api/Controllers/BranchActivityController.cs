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

        // LEGACY: Raw Event Access (Refactored for UI Polish)
        [HttpGet]
        public async Task<IActionResult> GetBranchActivity([FromQuery] string? branchId)
        {
            // 1. Enforce Context
            if (_userContext.CurrentBranchId == Guid.Empty) return Forbid();

            var contextBranchId = _userContext.CurrentBranchId.ToString();

            // 2. Validate Query Param
            if (!string.IsNullOrWhiteSpace(branchId) && !string.Equals(branchId, contextBranchId, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Requested BranchId does not match authenticated user context.");
            }

            var targetBranchId = contextBranchId;
            var utcToday = DateTime.UtcNow.Date;
            var utcTomorrow = utcToday.AddDays(1);

            // 3. Fetch Raw Events
            var events = await _context.BranchOperationalEvents
                .AsNoTracking()
                .Where(e => e.BranchId == targetBranchId && e.OccurredAt >= utcToday && e.OccurredAt < utcTomorrow)
                .OrderByDescending(e => e.OccurredAt)
                .Take(50)
                .ToListAsync();

            if (!events.Any()) return Ok(new List<object>()); // Empty

            // 4. Resolve Actor Names (Fix for GUIDs in ActorName)
            // Identify potential GUIDs
            var potentialUserIds = events
                .Where(e => Guid.TryParse(e.ActorName, out _))
                .Select(e => Guid.Parse(e.ActorName!)) // Safe bang because where check
                .Distinct()
                .ToList();

            Dictionary<Guid, string> userMap = new();
            if (potentialUserIds.Any())
            {
                userMap = await _context.Users
                    .AsNoTracking()
                    .Where(u => potentialUserIds.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => u.Name);
            }

            // 5. Map to DTO (Enforcing UTC & Actor Name)
            var dtos = events.Select(e => 
            {
                string displayName = e.ActorName ?? "Unknown";
                
                // Try resolve if it looks like a GUID
                if (Guid.TryParse(e.ActorName, out var guidId))
                {
                    if (userMap.TryGetValue(guidId, out var resolvedName))
                    {
                        displayName = resolvedName;
                    }
                    else if (guidId == _userContext.UserId)
                    {
                        displayName = "You"; // Contextual nicety
                    }
                }

                // Ensure UTC spec for JSON serializer
                var utcTime = DateTime.SpecifyKind(e.OccurredAt, DateTimeKind.Utc);

                return new 
                {
                    EventId = e.EventId,
                    EventType = e.EventType,
                    OccurredAt = utcTime, // Will serialize with 'Z'
                    ActorName = displayName,
                    BranchId = e.BranchId,
                    VisitId = e.VisitId,
                    TokenId = e.TokenId,
                    SummaryText = e.SummaryText,
                    Color = GetEventColor(e.EventType), // Enrich with UI hints
                    Icon = GetEventIcon(e.EventType)
                };
            });

            return Ok(dtos);
        }

        private string GetEventColor(string eventType) => eventType switch
        {
            "PAYMENT_RECEIVED" => "#10b981", // Emerald
            "VISIT_CREATED" => "#3b82f6", // Blue
            "VISIT_FINALIZED" => "#8b5cf6", // Violet
            "TEST_ADDED" => "#f59e0b", // Amber
            _ => "#71717a" // Zinc
        };

        private string GetEventIcon(string eventType) => eventType switch
        {
            "PAYMENT_RECEIVED" => "dollar-sign",
            "VISIT_CREATED" => "user-plus",
            "VISIT_FINALIZED" => "check-circle",
            "TEST_ADDED" => "flask",
            _ => "default"
        };
    }
}
