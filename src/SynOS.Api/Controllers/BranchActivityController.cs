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

            // 4. Resolve Visit Tokens, Patient Names, ReferredBy Doctors, and Test Codes
            var visitIds = events
                .Where(e => !string.IsNullOrEmpty(e.VisitId) && Guid.TryParse(e.VisitId, out _))
                .Select(e => Guid.Parse(e.VisitId!))
                .Distinct()
                .ToList();

            var visitMap = new Dictionary<Guid, (string Token, string PatientName, string ReferredBy, List<string> TestCodes)>();
            if (visitIds.Any())
            {
                var visits = await _context.Visits
                    .AsNoTracking()
                    .Include(v => v.Patient)
                    .Include(v => v.Referrer)
                    .Include(v => v.ReferralPartner)
                    .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                    .Where(v => visitIds.Contains(v.VisitId))
                    .ToListAsync();

                foreach (var v in visits)
                {
                    var pName = v.Patient != null 
                        ? (!string.IsNullOrWhiteSpace(v.Patient.DisplayName) ? v.Patient.DisplayName : $"{v.Patient.FirstName} {v.Patient.LastName}".Trim()) 
                        : "Patient";
                    var tok = v.Token ?? "UNKNOWN";
                    var refDoc = v.Referrer?.ProviderName ?? v.ReferrerText ?? v.ReferralPartner?.Name ?? "";
                    var tCodes = v.Orders
                        .Select(o => !string.IsNullOrWhiteSpace(o.TestCode) ? o.TestCode : (o.Test != null ? (o.Test.TestCode ?? o.Test.TestName) : ""))
                        .Where(c => !string.IsNullOrWhiteSpace(c))
                        .Distinct()
                        .ToList();

                    visitMap[v.VisitId] = (tok, pName, refDoc, tCodes);
                }
            }

            // 5. Resolve User Names for any Actor GUIDs
            var potentialUserIds = events
                .SelectMany(e => new[] { e.ActorName, e.ActorType })
                .Where(a => !string.IsNullOrEmpty(a) && Guid.TryParse(a, out _))
                .Select(a => Guid.Parse(a!))
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

            // 6. Map to Enriched DTO
            var dtos = events.Select(e => 
            {
                string displayName = "";
                
                // 1. Try to resolve GUID from userMap
                if (!string.IsNullOrWhiteSpace(e.ActorName) && Guid.TryParse(e.ActorName, out var guidId) && userMap.TryGetValue(guidId, out var resolvedName))
                {
                    displayName = resolvedName;
                }
                else if (!string.IsNullOrWhiteSpace(e.ActorType) && Guid.TryParse(e.ActorType, out var guidId2) && userMap.TryGetValue(guidId2, out var resolvedName2))
                {
                    displayName = resolvedName2;
                }
                // 2. If ActorType is a real name/username and not "System" / "User", use it
                else if (!string.IsNullOrWhiteSpace(e.ActorType) && e.ActorType != "System" && e.ActorType != "User" && !Guid.TryParse(e.ActorType, out _))
                {
                    displayName = e.ActorType;
                }
                // 3. If ActorName is a real name string and not a GUID / "User", use it
                else if (!string.IsNullOrWhiteSpace(e.ActorName) && e.ActorName != "User" && !Guid.TryParse(e.ActorName, out _))
                {
                    displayName = e.ActorName;
                }

                if (displayName == "User" || displayName == "System") displayName = "";

                // Resolve Token, PatientName, ReferredBy, and TestCodes from visitMap
                string resolvedToken = e.TokenId ?? "";
                string patientName = "Patient";
                string doctorName = "";
                var testCodes = new List<string>();

                if (!string.IsNullOrEmpty(e.VisitId) && Guid.TryParse(e.VisitId, out var vId) && visitMap.TryGetValue(vId, out var vData))
                {
                    if (string.IsNullOrEmpty(resolvedToken) || Guid.TryParse(resolvedToken, out _))
                    {
                        resolvedToken = vData.Token;
                    }
                    patientName = vData.PatientName;
                    doctorName = vData.ReferredBy;
                    testCodes = vData.TestCodes;
                }

                // Construct enriched metadata JSON string
                var metaObj = new
                {
                    PatientName = patientName,
                    DoctorName = doctorName,
                    TestCodes = testCodes,
                    ActorName = displayName,
                    TokenId = resolvedToken
                };
                string enrichedMetadata = System.Text.Json.JsonSerializer.Serialize(metaObj);

                // Ensure UTC spec for JSON serializer
                var utcTime = DateTime.SpecifyKind(e.OccurredAt, DateTimeKind.Utc);

                return new 
                {
                    EventId = e.EventId,
                    EventType = e.EventType,
                    OccurredAt = utcTime,
                    ActorName = displayName,
                    BranchId = e.BranchId,
                    VisitId = e.VisitId,
                    TokenId = resolvedToken,
                    SummaryText = e.SummaryText,
                    Metadata = enrichedMetadata,
                    Color = GetEventColor(e.EventType),
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
