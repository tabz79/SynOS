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
                    else if (guidId == _userContext.CurrentUserId)
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
        // NEW: Operational Timeline Endpoint (Aggregated)
        [HttpGet("timeline")]
        public async Task<IActionResult> GetOperationalTimeline([FromQuery] string? branchId)
        {
            if (_userContext.CurrentBranchId == Guid.Empty) return Forbid();
            var contextBranchId = _userContext.CurrentBranchId.ToString();
            
            if (!string.IsNullOrWhiteSpace(branchId) && !string.Equals(branchId, contextBranchId, StringComparison.OrdinalIgnoreCase))
                return BadRequest("Branch mismatch.");

            var targetBranchId = contextBranchId;
            var utcToday = DateTime.UtcNow.Date;
            var utcTomorrow = utcToday.AddDays(1);

            // 1. Fetch Candidates (Visibility != Hide)
            var rawEvents = await _context.BranchOperationalEvents
                .AsNoTracking()
                .Where(e => e.BranchId == targetBranchId 
                            && e.OccurredAt >= utcToday 
                            && e.OccurredAt < utcTomorrow
                            && e.Visibility != TimelineVisibility.Hide)
                .OrderByDescending(e => e.OccurredAt)
                .Take(100)
                .ToListAsync();

            if (!rawEvents.Any()) return Ok(new List<object>());

            // 2. Resolve Actor Names
            var potentialUserIds = rawEvents
                .Where(e => Guid.TryParse(e.ActorName, out _))
                .Select(e => Guid.Parse(e.ActorName!))
                .Distinct()
                .ToList();

            var userMap = new Dictionary<Guid, string>();
            if (potentialUserIds.Any())
            {
                userMap = await _context.Users
                    .AsNoTracking()
                    .Where(u => potentialUserIds.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => u.Name);
            }

            Func<string?, string> resolveActor = (name) => {
                if (string.IsNullOrEmpty(name)) return "System";
                if (Guid.TryParse(name, out var g) && userMap.TryGetValue(g, out var resolved)) return resolved;
                if (Guid.TryParse(name, out var g2) && g2 == _userContext.CurrentUserId) return "You";
                return name; // Already a name?
            };

            // 3. Aggregation Logic
            var aggregated = new List<TimelineEntryDto>();
            
            // Group by IntentId (if present)
            // Events with null IntentId are treated as independent items (new grouping for each)
            var intentGroups = rawEvents
                .GroupBy(e => e.IntentId.HasValue ? e.IntentId.Value : Guid.NewGuid())
                .ToList();

            foreach (var group in intentGroups)
            {
                // Find primary (Surface) event
                var surface = group.FirstOrDefault(e => e.Visibility == TimelineVisibility.Surface);
                
                // If no Surface event, fallback to the earliest event in group? 
                // Or just pick the first one from the sorted list (latest)? 
                // Since we sorted descending by OccurredAt, the first one is the LATEST.
                // Usually Surface event is the "Head".
                var primary = surface ?? group.First();

                var entry = new TimelineEntryDto
                {
                    EventId = primary.EventId,
                    Title = primary.SummaryText,
                    OccurredAt = primary.OccurredAt,
                    ActorName = resolveActor(primary.ActorName),
                    EventType = primary.EventType,
                    Color = GetEventColor(primary.EventType),
                    Icon = GetEventIcon(primary.EventType),
                    Metadata = primary.Metadata,
                    ContextEvents = group
                        .Where(e => e.EventId != primary.EventId) // Exclude self
                        .Select(e => new TimelineContextDto 
                        { 
                            Summary = e.SummaryText, 
                            Metadata = e.Metadata,
                            EventType = e.EventType
                        })
                        .ToList()
                };
                aggregated.Add(entry);
            }

            // Re-sort aggregated entries by time (descending)
            return Ok(aggregated.OrderByDescending(x => x.OccurredAt));
        }

        public class TimelineEntryDto
        {
            public Guid EventId { get; set; }
            public string Title { get; set; } = string.Empty;
            public DateTime OccurredAt { get; set; }
            public string ActorName { get; set; } = string.Empty;
            public string EventType { get; set; } = string.Empty;
            public string Color { get; set; } = string.Empty;
            public string Icon { get; set; } = string.Empty;
            public string? Metadata { get; set; }
            public List<TimelineContextDto> ContextEvents { get; set; } = new();
        }

        public class TimelineContextDto
        {
            public string Summary { get; set; } = string.Empty;
            public string? Metadata { get; set; }
            public string EventType { get; set; } = string.Empty;
        }
    }
}
