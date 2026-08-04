using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Api.Services;
using TBZ.Middleware.Api.Services.Context;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Endpoints
{
    public static class LabHealthCache
    {
        // Thread-safe in-memory cache for live on-prem lab outbox metrics
        public static ConcurrentDictionary<string, LiveLabMetrics> Metrics = new();
    }

    public class LiveLabMetrics
    {
        public int PendingOutboxCount { get; set; }
        public int DeadLetterCount { get; set; }
        public DateTime? LastEventReceivedAt { get; set; }
    }

    public static class ControlTowerEndpoints
    {
        public static void MapControlTowerEndpoints(this IEndpointRouteBuilder app)
        {
            // Helper method to extract LabId from headers, query parameters, or default to LAB001
            string GetLabId(HttpContext context, string? queryLabId)
            {
                if (context.Request.Headers.TryGetValue("X-Lab-Id", out var headerLabId) && !string.IsNullOrEmpty(headerLabId))
                {
                    return headerLabId.ToString();
                }
                return queryLabId ?? "LAB001";
            }

            // 1. GET /api/controltower/overview
            app.MapGet("/api/controltower/overview", async (HttpContext context, string? labId, string? branchId, DateTime? date, OverviewService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var targetDate = (date ?? DateTime.UtcNow).Date;
                var dto = await service.GetAsync(resolvedLabId, branchId, targetDate);
                return Results.Ok(dto);
            })
            .WithName("GetOverview")
            .WithOpenApi();

            // 2. GET /api/controltower/health
            app.MapGet("/api/controltower/health", async (HttpContext context, string? labId, HealthService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId);
                return Results.Ok(dto);
            })
            .WithName("GetHealth")
            .WithOpenApi();

            // 3. GET /api/controltower/workflow
            app.MapGet("/api/controltower/workflow", async (HttpContext context, string? labId, string? branchId, DateTime? startDate, DateTime? endDate, WorkflowService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId, branchId, startDate, endDate);
                return Results.Ok(dto);
            })
            .WithName("GetWorkflowTat")
            .WithOpenApi();

            // 4. GET /api/controltower/revenue
            app.MapGet("/api/controltower/revenue", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, RevenueService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId, startDate, endDate);
                return Results.Ok(dto);
            })
            .WithName("GetRevenue")
            .WithOpenApi();

            // 5. GET /api/controltower/tests
            app.MapGet("/api/controltower/tests", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, TestService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId, startDate, endDate);
                return Results.Ok(dto);
            })
            .WithName("GetTests")
            .WithOpenApi();

            // 6. GET /api/controltower/delivery
            app.MapGet("/api/controltower/delivery", async (HttpContext context, string? labId, string? branchId, DateTime? startDate, DateTime? endDate, DeliveryService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId, branchId, startDate, endDate);
                return Results.Ok(dto);
            })
            .WithName("GetDelivery")
            .WithOpenApi();

            // 7. GET /api/controltower/trends?days=7|30|90
            app.MapGet("/api/controltower/trends", async (HttpContext context, string? labId, int? days, TrendService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId, days);
                return Results.Ok(dto);
            })
            .WithName("GetTrends")
            .WithOpenApi();

            // 8. GET /api/controltower/demographics
            app.MapGet("/api/controltower/demographics", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, DemographicsService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId, startDate, endDate);
                return Results.Ok(dto);
            })
            .WithName("GetDemographics")
            .WithOpenApi();

            // 9. GET /api/controltower/referrals
            app.MapGet("/api/controltower/referrals", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, ReferralService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId, startDate, endDate);
                return Results.Ok(dto);
            })
            .WithName("GetReferrals")
            .WithOpenApi();

            // 10. GET /api/controltower/business-sources
            app.MapGet("/api/controltower/business-sources", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, string? sourceType, BusinessSourceService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetAsync(resolvedLabId, startDate, endDate, sourceType);
                return Results.Ok(dto);
            })
            .WithName("GetBusinessSources")
            .WithOpenApi();

            // GET /api/controltower/patients
            app.MapGet("/api/controltower/patients", async (HttpContext context, string? labId, string? q, PatientService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var data = await service.GetPatientsAsync(resolvedLabId, q);
                return Results.Ok(data);
            })
            .WithName("GetPatients")
            .WithOpenApi();

            // GET /api/controltower/patients/{id}
            app.MapGet("/api/controltower/patients/{id}", async (HttpContext context, Guid id, string? labId, PatientService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var data = await service.GetPatientDetailsAsync(resolvedLabId, id);
                return data != null ? Results.Ok(data) : Results.NotFound();
            })
            .WithName("GetPatientDetails")
            .WithOpenApi();

            // GET /api/controltower/referrals/partners/{id}
            app.MapGet("/api/controltower/referrals/partners/{id}", async (HttpContext context, Guid id, string? labId, PartnerProfileService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var data = await service.GetPartnerProfileAsync(resolvedLabId, id);
                return data != null ? Results.Ok(data) : Results.NotFound();
            })
            .WithName("GetReferralPartnerProfile")
            .WithOpenApi();

            // 11. GET /api/controltower/dashboard
            app.MapGet("/api/controltower/dashboard", async (
                HttpContext context,
                string? labId,
                string? branchId,
                DateTime? date,
                DateTime? startDate,
                DateTime? endDate,
                int? trendDays,
                DashboardService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetDashboardAsync(resolvedLabId, branchId, date, startDate, endDate, trendDays);
                return Results.Ok(dto);
            })
            .WithName("GetDashboard")
            .WithOpenApi();

            // 12. GET /api/controltower/context
            app.MapGet("/api/controltower/context", async (
                HttpContext context,
                string? labId,
                string? branchId,
                DateTime? date,
                DateTime? startDate,
                DateTime? endDate,
                int? trendDays,
                int? limitDoctors,
                int? limitPartners,
                int? limitTests,
                int? limitSources,
                ContextService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetContextAsync(
                    resolvedLabId,
                    branchId,
                    date,
                    startDate,
                    endDate,
                    trendDays,
                    limitDoctors ?? 20,
                    limitPartners ?? 20,
                    limitTests ?? 20,
                    limitSources ?? 20);
                return Results.Ok(dto);
            })
            .WithName("GetAiContext")
            .WithOpenApi();

            // 13. GET /api/controltower/context/doctors
            app.MapGet("/api/controltower/context/doctors", async (
                HttpContext context,
                string? labId,
                DateTime? startDate,
                DateTime? endDate,
                int? limit,
                string? q,
                DoctorContextService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetTopDoctorsAsync(resolvedLabId, startDate, endDate, limit ?? 20, q);
                return Results.Ok(dto);
            })
            .WithName("SearchDoctorsContext")
            .WithOpenApi();

            // 14. GET /api/controltower/context/tests
            app.MapGet("/api/controltower/context/tests", async (
                HttpContext context,
                string? labId,
                DateTime? startDate,
                DateTime? endDate,
                int? limit,
                string? q,
                TestContextService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetTopTestsAsync(resolvedLabId, startDate, endDate, limit ?? 20, q);
                return Results.Ok(dto);
            })
            .WithName("SearchTestsContext")
            .WithOpenApi();

            // 15. GET /api/controltower/context/referral-partners
            app.MapGet("/api/controltower/context/referral-partners", async (
                HttpContext context,
                string? labId,
                DateTime? startDate,
                DateTime? endDate,
                int? limit,
                string? q,
                ReferralPartnerContextService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetTopPartnersAsync(resolvedLabId, startDate, endDate, limit ?? 20, q);
                return Results.Ok(dto);
            })
            .WithName("SearchReferralPartnersContext")
            .WithOpenApi();

            // 16. GET /api/controltower/context/business-sources
            app.MapGet("/api/controltower/context/business-sources", async (
                HttpContext context,
                string? labId,
                DateTime? startDate,
                DateTime? endDate,
                int? limit,
                string? q,
                BusinessSourceContextService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetBusinessSourcesAsync(resolvedLabId, startDate, endDate, limit ?? 20, q);
                return Results.Ok(dto);
            })
            .WithName("SearchBusinessSourcesContext")
            .WithOpenApi();

            // 17. GET /api/controltower/context/entity/{type}/{id}
            app.MapGet("/api/controltower/context/entity/{type}/{id}", async (
                HttpContext context,
                string type,
                string id,
                string? labId,
                DateTime? from,
                DateTime? to,
                string? interval,
                EntityContextService service) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var dto = await service.GetEntityContextAsync(resolvedLabId, type, id, from, to, interval);
                return dto != null ? Results.Ok(dto) : Results.NotFound();
            })
            .WithName("GetEntityContext")
            .WithOpenApi();

            // 18. GET /api/controltower/whatsapp/summary
            app.MapGet("/api/controltower/whatsapp/summary", async (
                HttpContext context,
                string? labId,
                MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                
                var connectionStatus = "Not Configured";
                var businessAccount = "N/A";
                
                var totalQueue = await db.NotificationOutboxes.CountAsync(q => q.LabId == resolvedLabId);
                if (totalQueue > 0)
                {
                    connectionStatus = "Connected";
                    businessAccount = "Divya Diagnostics WhatsApp Biz";
                }

                var pending = await db.NotificationOutboxes
                    .CountAsync(q => q.LabId == resolvedLabId && q.Status == NotificationStatus.Pending);

                var sending = await db.NotificationOutboxes
                    .CountAsync(q => q.LabId == resolvedLabId && q.Status == NotificationStatus.Sending);

                var sent = await db.NotificationOutboxes
                    .CountAsync(q => q.LabId == resolvedLabId && q.Status == NotificationStatus.Sent && (q.NotificationMessage == null || q.NotificationMessage.DeliveredAt == null));

                var delivered = await db.NotificationMessages
                    .CountAsync(q => q.LabId == resolvedLabId && q.DeliveredAt != null);

                var failed = await db.NotificationOutboxes
                    .CountAsync(q => q.LabId == resolvedLabId && q.Status == NotificationStatus.Failed && q.Attempts >= 5);

                var retryQueue = await db.NotificationOutboxes
                    .CountAsync(q => q.LabId == resolvedLabId && q.Status == NotificationStatus.Failed && q.Attempts < 5);

                return Results.Ok(new
                {
                    ConnectionStatus = connectionStatus,
                    BusinessAccount = businessAccount,
                    Sent = sent,
                    Delivered = delivered,
                    Pending = pending,
                    Sending = sending,
                    Failed = failed,
                    RetryQueue = retryQueue,
                    TotalQueue = totalQueue
                });
            })
            .WithName("GetWhatsAppSummary")
            .WithOpenApi();

            // 19. GET /api/controltower/whatsapp/logs
            app.MapGet("/api/controltower/whatsapp/logs", async (
                HttpContext context,
                string? labId,
                string? status,
                string? channel,
                string? messageType,
                Guid? patientId,
                MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var query = db.NotificationOutboxes
                    .Include(o => o.NotificationMessage)
                    .Where(q => q.LabId == resolvedLabId);

                if (!string.IsNullOrEmpty(status))
                {
                    if (status.Equals("Pending", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(q => q.Status == NotificationStatus.Pending);
                    else if (status.Equals("Sent", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(q => q.Status == NotificationStatus.Sent);
                    else if (status.Equals("Delivered", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(q => q.NotificationMessage != null && q.NotificationMessage.DeliveredAt != null);
                    else if (status.Equals("Failed", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(q => q.Status == NotificationStatus.Failed && q.Attempts >= 5);
                    else if (status.Equals("Retry", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(q => q.Status == NotificationStatus.Failed && q.Attempts < 5);
                }

                if (!string.IsNullOrEmpty(channel))
                {
                    query = query.Where(q => q.NotificationMessage != null && q.NotificationMessage.Channel == channel);
                }

                if (!string.IsNullOrEmpty(messageType))
                {
                    query = query.Where(q => q.NotificationMessage != null && q.NotificationMessage.TemplateName == messageType);
                }

                var outboxItems = await query
                    .OrderByDescending(q => q.CreatedAt)
                    .Take(100)
                    .ToListAsync();

                var logs = outboxItems.Select(outbox => new
                {
                    Id = outbox.Id,
                    LabId = outbox.LabId,
                    Phone = outbox.NotificationMessage != null ? outbox.NotificationMessage.Recipient : string.Empty,
                    MessageType = outbox.NotificationMessage != null ? outbox.NotificationMessage.TemplateName : string.Empty,
                    PayloadJson = outbox.NotificationMessage != null ? outbox.NotificationMessage.VariablesJson : string.Empty,
                    Status = outbox.Status.ToString(),
                    CreatedAt = outbox.CreatedAt,
                    SentAt = outbox.NotificationMessage != null ? outbox.NotificationMessage.SentAt : null,
                    PatientId = (Guid?)null,
                    VisitId = (Guid?)null,
                    ReportId = (Guid?)null,
                    TemplateName = outbox.NotificationMessage != null ? outbox.NotificationMessage.TemplateName : string.Empty,
                    TriggerEvent = outbox.NotificationMessage != null ? outbox.NotificationMessage.TemplateName : string.Empty,
                    RetryCount = outbox.Attempts,
                    FailureReason = outbox.LastError,
                    DeliveredAt = outbox.NotificationMessage != null ? outbox.NotificationMessage.DeliveredAt : null,
                    Provider = "Meta",
                    ProviderMessageId = outbox.NotificationMessage != null ? outbox.NotificationMessage.MessageId : null,
                    Channel = outbox.NotificationMessage != null ? outbox.NotificationMessage.Channel : "WhatsApp"
                }).ToList();

                return Results.Ok(logs);
            })
            .WithName("GetWhatsAppLogs")
            .WithOpenApi();

            // 19b. GET /api/controltower/whatsapp/logs/{id}
            app.MapGet("/api/controltower/whatsapp/logs/{id}", async (
                Guid id,
                MiddlewareDbContext db) =>
            {
                var outbox = await db.NotificationOutboxes
                    .Include(o => o.NotificationMessage)
                    .FirstOrDefaultAsync(o => o.Id == id);
                if (outbox == null) return Results.NotFound();

                var log = new
                {
                    Id = outbox.Id,
                    LabId = outbox.LabId,
                    Phone = outbox.NotificationMessage != null ? outbox.NotificationMessage.Recipient : string.Empty,
                    MessageType = outbox.NotificationMessage != null ? outbox.NotificationMessage.TemplateName : string.Empty,
                    PayloadJson = outbox.NotificationMessage != null ? outbox.NotificationMessage.VariablesJson : string.Empty,
                    Status = outbox.Status.ToString(),
                    CreatedAt = outbox.CreatedAt,
                    SentAt = outbox.NotificationMessage != null ? outbox.NotificationMessage.SentAt : null,
                    PatientId = (Guid?)null,
                    VisitId = (Guid?)null,
                    ReportId = (Guid?)null,
                    TemplateName = outbox.NotificationMessage != null ? outbox.NotificationMessage.TemplateName : string.Empty,
                    TriggerEvent = outbox.NotificationMessage != null ? outbox.NotificationMessage.TemplateName : string.Empty,
                    RetryCount = outbox.Attempts,
                    FailureReason = outbox.LastError,
                    DeliveredAt = outbox.NotificationMessage != null ? outbox.NotificationMessage.DeliveredAt : null,
                    Provider = "Meta",
                    ProviderMessageId = outbox.NotificationMessage != null ? outbox.NotificationMessage.MessageId : null,
                    Channel = outbox.NotificationMessage != null ? outbox.NotificationMessage.Channel : "WhatsApp"
                };

                return Results.Ok(log);
            })
            .WithName("GetWhatsAppLogDetails")
            .WithOpenApi();

            // 20. POST /api/commands/queue
            app.MapPost("/api/commands/queue", async (CommandDirective command, MiddlewareDbContext db) =>
            {
                command.Id = Guid.NewGuid();
                command.CreatedAt = DateTime.UtcNow;
                command.Status = "Pending";
                db.CommandDirectives.Add(command);

                var payload = new
                {
                    CommandId = command.Id,
                    CommandType = command.CommandType,
                    PayloadJson = command.PayloadJson,
                    Status = command.Status
                };

                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = command.LabId,
                    EventType = "CommandQueued",
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(payload),
                    OccurredAt = command.CreatedAt,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                return Results.Ok(new { Success = true, CommandId = command.Id });
            })
            .WithName("QueueCommand")
            .WithOpenApi();

            // 21. GET /api/commands/pending
            app.MapGet("/api/commands/pending", async (string labId, MiddlewareDbContext db) =>
            {
                var pending = await db.CommandDirectives
                    .Where(c => c.LabId == labId && c.Status == "Pending")
                    .ToListAsync();

                // Transition status to "Dispatched" and log events
                foreach (var cmd in pending)
                {
                    cmd.Status = "Dispatched";
                    cmd.DispatchedAt = DateTime.UtcNow;

                    var payload = new
                    {
                        CommandId = cmd.Id,
                        CommandType = cmd.CommandType,
                        PayloadJson = cmd.PayloadJson,
                        Status = cmd.Status
                    };

                    db.StoredEvents.Add(new StoredEvent
                    {
                        Id = Guid.NewGuid(),
                        EventId = Guid.NewGuid(),
                        LabId = labId,
                        EventType = "CommandDispatched",
                        PayloadJson = System.Text.Json.JsonSerializer.Serialize(payload),
                        OccurredAt = cmd.DispatchedAt.Value,
                        ReceivedAt = DateTime.UtcNow
                    });
                }
                await db.SaveChangesAsync();

                return Results.Ok(pending);
            })
            .WithName("GetPendingCommands")
            .WithOpenApi();

            // 22. POST /api/commands/status
            app.MapPost("/api/commands/status", async (Guid commandId, string status, string? error, MiddlewareDbContext db) =>
            {
                var command = await db.CommandDirectives.FindAsync(commandId);
                if (command == null) return Results.NotFound();

                command.Status = status;
                DateTime occurredAt = DateTime.UtcNow;
                if (status == "Executed")
                {
                    command.ExecutedAt = occurredAt;
                }

                var eventType = status == "Executed" ? "CommandExecuted" : 
                                status == "Failed" ? "CommandFailed" : "CommandStatusUpdated";

                var payload = new
                {
                    CommandId = command.Id,
                    CommandType = command.CommandType,
                    PayloadJson = command.PayloadJson,
                    Status = command.Status,
                    Error = !string.IsNullOrEmpty(error) ? error : (status == "Failed" ? "Execution error in on-premise runner." : "")
                };

                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = command.LabId,
                    EventType = eventType,
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(payload),
                    OccurredAt = occurredAt,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                return Results.Ok(new { Success = true });
            })
            .WithName("UpdateCommandStatus")
            .WithOpenApi();

            // 23. GET /api/operations/analytics
            app.MapGet("/api/operations/analytics", async (MiddlewareDbContext db) =>
            {
                var totalLabs = await db.Labs.CountAsync();
                var activeLabs = await db.Labs.CountAsync(l => l.Status == "Active");
                var onlineLabs = await db.Labs.CountAsync(l => l.LastSeenAt >= DateTime.UtcNow.AddMinutes(-5));

                var versionAdoption = await db.Labs
                    .GroupBy(l => l.ActiveVersion)
                    .Select(g => new { Version = g.Key, Count = g.Count() })
                    .ToListAsync();

                var ticketStats = await db.SupportTickets
                    .GroupBy(t => t.Category)
                    .Select(g => new { Category = g.Key, Count = g.Count() })
                    .ToListAsync();

                var crashStats = await db.SupportTickets
                    .Where(t => t.Category == "Crash")
                    .CountAsync();

                var response = new
                {
                    TotalLabsCount = totalLabs,
                    ActiveLabsCount = activeLabs,
                    OnlineLabsCount = onlineLabs,
                    VersionAdoption = versionAdoption,
                    TicketCategoryDistribution = ticketStats,
                    TotalCrashCount = crashStats
                };

                return Results.Ok(response);
            })
            .WithName("GetOperationsAnalytics")
            .WithOpenApi();

            // 24. GET /api/controltower/tickets
            app.MapGet("/api/controltower/tickets", async (MiddlewareDbContext db) =>
            {
                var tickets = await db.SupportTickets
                    .OrderByDescending(t => t.CreatedAt)
                    .ToListAsync();

                var bundleIds = tickets.Where(t => t.DiagnosticBundleId != null).Select(t => t.DiagnosticBundleId!.Value).ToList();
                var bundles = await db.DiagnosticsBundles
                    .Where(b => bundleIds.Contains(b.Id))
                    .ToDictionaryAsync(b => b.Id, b => b.Status);

                var result = tickets.Select(t => new
                {
                    t.Id,
                    t.LabId,
                    t.Title,
                    t.Description,
                    t.Priority,
                    t.Category,
                    t.CreatedAt,
                    t.DiagnosticBundleId,
                    DiagnosticBundleStatus = t.DiagnosticBundleId.HasValue && bundles.TryGetValue(t.DiagnosticBundleId.Value, out var status) ? status : (t.DiagnosticBundleId.HasValue ? "Processing" : "Missing"),
                    t.Status,
                    t.StatusMessage,
                    t.UpdatedAt,
                    t.SupportCaseId
                });

                return Results.Ok(result);
            })
            .WithName("GetSupportTickets")
            .WithOpenApi();

            // 25. GET /api/controltower/cases
            app.MapGet("/api/controltower/cases", async (MiddlewareDbContext db) =>
            {
                var cases = await db.SupportCases
                    .OrderByDescending(c => c.CreatedAt)
                    .ToListAsync();

                // Compute affected labs count dynamically for each case
                var caseIds = cases.Select(c => (Guid?)c.Id).ToList();
                var ticketsByCase = await db.SupportTickets
                    .Where(t => t.SupportCaseId != null && caseIds.Contains(t.SupportCaseId))
                    .ToListAsync();

                var results = cases.Select(c => new
                {
                    c.Id,
                    c.CaseNumber,
                    c.Title,
                    c.Description,
                    c.Priority,
                    c.Category,
                    c.Status,
                    c.CreatedAt,
                    c.ResolvedAt,
                    AffectedLabsCount = ticketsByCase
                        .Where(t => t.SupportCaseId == c.Id)
                        .Select(t => t.LabId)
                        .Distinct()
                        .Count()
                }).ToList();

                return Results.Ok(results);
            })
            .WithName("GetSupportCases")
            .WithOpenApi();

            // 26. GET /api/controltower/knownissues
            app.MapGet("/api/controltower/knownissues", async (MiddlewareDbContext db) =>
            {
                var issues = await db.KnownIssues.ToListAsync();
                return Results.Ok(issues);
            })
            .WithName("GetKnownIssues")
            .WithOpenApi();

            // 27. POST /api/controltower/knownissues
            app.MapPost("/api/controltower/knownissues", async (KnownIssue issue, MiddlewareDbContext db) =>
            {
                issue.Id = Guid.NewGuid();
                db.KnownIssues.Add(issue);
                await db.SaveChangesAsync();
                return Results.Ok(new { Success = true, IssueId = issue.Id });
            })
            .WithName("CreateKnownIssue")
            .WithOpenApi();

            // 28. POST /api/controltower/tickets/{id}/link
            app.MapPost("/api/controltower/tickets/{id}/link", async (Guid id, LinkTicketDto dto, MiddlewareDbContext db) =>
            {
                var ticket = await db.SupportTickets.FindAsync(id);
                if (ticket == null) return Results.NotFound();

                ticket.SupportCaseId = dto.CaseId;
                await db.SaveChangesAsync();
                return Results.Ok(new { Success = true });
            })
            .WithName("LinkTicketToCase")
            .WithOpenApi();

            // 28.5 POST /api/controltower/tickets/{id}/status
            app.MapPost("/api/controltower/tickets/{id}/status", async (Guid id, UpdateTicketStatusDto dto, MiddlewareDbContext db) =>
            {
                var ticket = await db.SupportTickets.FindAsync(id);
                if (ticket == null) return Results.NotFound();

                var validStatuses = new[] { "Submitted", "Under Review", "In Progress", "Waiting for Customer", "Resolved", "Closed" };
                if (string.IsNullOrEmpty(dto.Status) || !validStatuses.Contains(dto.Status, StringComparer.OrdinalIgnoreCase))
                {
                    return Results.BadRequest(new { Error = $"Invalid status. Must be one of: {string.Join(", ", validStatuses)}" });
                }

                ticket.Status = dto.Status;
                ticket.StatusMessage = dto.StatusMessage;
                ticket.UpdatedAt = DateTime.UtcNow;

                // Queue CommandDirective for Lab
                var command = new CommandDirective
                {
                    Id = Guid.NewGuid(),
                    LabId = ticket.LabId,
                    CommandType = "UpdateTicketStatus",
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        TicketId = ticket.Id,
                        Status = ticket.Status,
                        StatusMessage = ticket.StatusMessage,
                        UpdatedAt = ticket.UpdatedAt
                    }),
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };
                db.CommandDirectives.Add(command);

                // Queue StoredEvent for audit trail
                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = ticket.LabId,
                    EventType = "SupportTicketStatusUpdated",
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        TicketId = ticket.Id,
                        Status = ticket.Status,
                        StatusMessage = ticket.StatusMessage,
                        UpdatedAt = ticket.UpdatedAt
                    }),
                    OccurredAt = DateTime.UtcNow,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                return Results.Ok(new { Success = true });
            })
            .WithName("UpdateTicketStatus")
            .WithOpenApi();

            // 29. GET /api/controltower/labs
            app.MapGet("/api/controltower/labs", async (MiddlewareDbContext db) =>
            {
                var labs = await db.Labs.ToListAsync();
                var result = new List<object>();

                foreach (var l in labs)
                {
                    var latestSnapshot = await db.HealthSnapshots
                        .Where(s => s.LabId == l.Id)
                        .OrderByDescending(s => s.Timestamp)
                        .FirstOrDefaultAsync();

                    result.Add(new
                    {
                        l.Id,
                        l.LabCode,
                        l.LabName,
                        l.ContactPerson,
                        l.Email,
                        l.Phone,
                        l.LicenseType,
                        l.MaximumBranches,
                        l.BranchCount,
                        l.ExpiryDate,
                        l.EnabledFeatures,
                        l.GeographicalRegion,
                        l.ActiveVersion,
                        l.OSVersion,
                        l.DotNetVersion,
                        l.LastSeenAt,
                        l.RolloutRing,
                        Status = l.LastSeenAt.HasValue && l.LastSeenAt >= DateTime.UtcNow.AddMinutes(-5) ? "Online" : "Offline",
                        LicenseStatus = l.Status,
                        LatestSnapshot = latestSnapshot != null ? new
                        {
                            latestSnapshot.CpuUsagePercent,
                            latestSnapshot.MemoryUsageMB,
                            latestSnapshot.DiskFreeSpaceGB,
                            latestSnapshot.PendingOutboxCount,
                            latestSnapshot.DeadLetterCount,
                            latestSnapshot.Timestamp
                        } : null
                    });
                }

                return Results.Ok(result);
            })
            .WithName("GetLabsList")
            .WithOpenApi();

            // POST /api/controltower/labs
            app.MapPost("/api/controltower/labs", async (RegisterLabDto dto, MiddlewareDbContext db) =>
            {
                if (string.IsNullOrWhiteSpace(dto.LabName))
                {
                    return Results.BadRequest(new { error = "Laboratory Name is required." });
                }

                // Generate a unique sequential Lab ID
                var prefix = "LAB";
                var lastLabs = await db.Labs
                    .Where(l => l.Id.StartsWith(prefix))
                    .ToListAsync();
                
                int maxSuffix = 1;
                foreach (var l in lastLabs)
                {
                    if (int.TryParse(l.Id.Substring(prefix.Length), out var suffix))
                    {
                        if (suffix > maxSuffix) maxSuffix = suffix;
                    }
                }
                var nextLabId = $"{prefix}{(maxSuffix + 1):D3}";

                // Generate raw secure license key
                var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                var random = new Random();
                var parts = new string[4];
                for (int i = 0; i < 4; i++)
                {
                    var segment = new char[4];
                    for (int j = 0; j < 4; j++)
                    {
                        segment[j] = chars[random.Next(chars.Length)];
                    }
                    parts[i] = new string(segment);
                }
                var rawLicenseKey = $"TBZ-{string.Join("-", parts)}";
                var hashedKey = ApiKeyHasher.Hash(rawLicenseKey);

                var newLab = new Lab
                {
                    Id = nextLabId,
                    LabCode = nextLabId,
                    LabName = dto.LabName,
                    ContactPerson = dto.ContactPerson,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    ApiKeyHash = hashedKey,
                    Status = "Active",
                    RolloutRing = "Production",
                    LicenseType = dto.LicenseType ?? "Commercial",
                    MaximumBranches = dto.MaximumBranches ?? 1,
                    BranchCount = 0,
                    ExpiryDate = dto.ExpiryDate,
                    EnabledFeatures = dto.EnabledFeatures ?? new List<string>(),
                    CreatedAt = DateTime.UtcNow
                };

                db.Labs.Add(newLab);
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    success = true,
                    labId = nextLabId,
                    licenseKey = rawLicenseKey
                });
            })
            .WithName("RegisterLaboratory")
            .WithOpenApi();

            // PUT /api/controltower/labs/{id}/rollout-ring
            app.MapPut("/api/controltower/labs/{id}/rollout-ring", async (string id, UpdateLabRolloutRingDto dto, MiddlewareDbContext db) =>
            {
                var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == id);
                if (lab == null) return Results.NotFound(new { error = "Laboratory not found." });

                var ring = dto.RolloutRing ?? "";
                if (ring != "Canary" && ring != "Early" && ring != "Production" && ring != "Disabled" && ring != "")
                {
                    return Results.BadRequest(new { error = "Invalid rollout ring. Allowed values: Canary, Early, Production, Disabled, or empty." });
                }

                var oldRing = lab.RolloutRing;
                lab.RolloutRing = ring;

                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = id,
                    EventType = "RolloutRingChanged",
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        LabId = id,
                        OldRolloutRing = oldRing,
                        NewRolloutRing = ring
                    }),
                    OccurredAt = DateTime.UtcNow,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();

                return Results.Ok(new { success = true, labId = id, rolloutRing = ring });
            })
            .WithName("UpdateLabRolloutRing")
            .WithOpenApi();

            // PUT /api/controltower/labs/{id}/properties
            app.MapPut("/api/controltower/labs/{id}/properties", async (string id, UpdateLabPropertiesDto dto, MiddlewareDbContext db) =>
            {
                var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == id);
                if (lab == null) return Results.NotFound(new { error = "Laboratory not found." });

                if (!string.IsNullOrWhiteSpace(dto.LabName))
                {
                    lab.LabName = dto.LabName;
                }
                lab.ContactPerson = dto.ContactPerson;
                lab.Email = dto.Email;
                lab.Phone = dto.Phone;

                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = id,
                    EventType = "LaboratoryInformationUpdated",
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        LabId = id,
                        LabName = lab.LabName,
                        ContactPerson = lab.ContactPerson,
                        Email = lab.Email,
                        Phone = lab.Phone
                    }),
                    OccurredAt = DateTime.UtcNow,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                return Results.Ok(new { success = true, labId = id });
            })
            .WithName("UpdateLabProperties")
            .WithOpenApi();

            // PUT /api/controltower/labs/{id}/license
            app.MapPut("/api/controltower/labs/{id}/license", async (string id, ManageLicenseDto dto, MiddlewareDbContext db) =>
            {
                var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == id);
                if (lab == null) return Results.NotFound(new { error = "Laboratory not found." });

                if (dto.LicenseType != null) lab.LicenseType = dto.LicenseType;
                if (dto.MaximumBranches.HasValue) lab.MaximumBranches = dto.MaximumBranches.Value;
                lab.ExpiryDate = dto.ExpiryDate;
                if (dto.EnabledFeatures != null) lab.EnabledFeatures = dto.EnabledFeatures;

                if (!string.IsNullOrEmpty(dto.Status) && lab.Status != dto.Status)
                {
                    var oldStatus = lab.Status;
                    lab.Status = dto.Status;

                    var statusEvent = dto.Status == "Active" ? "LicenseActivated" : "LicenseDeactivated";
                    db.StoredEvents.Add(new StoredEvent
                    {
                        Id = Guid.NewGuid(),
                        EventId = Guid.NewGuid(),
                        LabId = id,
                        EventType = statusEvent,
                        PayloadJson = System.Text.Json.JsonSerializer.Serialize(new { Status = dto.Status, OldStatus = oldStatus }),
                        OccurredAt = DateTime.UtcNow,
                        ReceivedAt = DateTime.UtcNow
                    });
                }

                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = id,
                    EventType = "LicenseUpdated",
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        LicenseType = lab.LicenseType,
                        MaximumBranches = lab.MaximumBranches,
                        ExpiryDate = lab.ExpiryDate,
                        EnabledFeatures = lab.EnabledFeatures
                    }),
                    OccurredAt = DateTime.UtcNow,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                return Results.Ok(new { success = true, labId = id });
            })
            .WithName("ManageLicense")
            .WithOpenApi();

            // POST /api/controltower/labs/{id}/extend-trial
            app.MapPost("/api/controltower/labs/{id}/extend-trial", async (string id, ExtendTrialDto dto, MiddlewareDbContext db) =>
            {
                var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == id);
                if (lab == null) return Results.NotFound(new { error = "Laboratory not found." });

                var days = dto.DaysToExtend <= 0 ? 7 : dto.DaysToExtend;
                var baseDate = (lab.ExpiryDate.HasValue && lab.ExpiryDate.Value > DateTime.UtcNow) 
                    ? lab.ExpiryDate.Value 
                    : DateTime.UtcNow;
                var newExpiry = baseDate.AddDays(days);
                lab.ExpiryDate = newExpiry;
                lab.Status = "Active";

                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = id,
                    EventType = "LicenseTrialExtended",
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        DaysExtended = days,
                        NewExpiry = newExpiry.ToString("o")
                    }),
                    OccurredAt = DateTime.UtcNow,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                return Results.Ok(new { success = true, labId = id, newExpiry = newExpiry });
            })
            .WithName("ExtendTrial")
            .WithOpenApi();

            // POST /api/controltower/labs/{id}/regenerate-key
            app.MapPost("/api/controltower/labs/{id}/regenerate-key", async (string id, MiddlewareDbContext db) =>
            {
                var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == id);
                if (lab == null) return Results.NotFound(new { error = "Laboratory not found." });

                // Generate new raw secure license key
                var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                var random = new Random();
                var parts = new string[4];
                for (int i = 0; i < 4; i++)
                {
                    var segment = new char[4];
                    for (int j = 0; j < 4; j++)
                    {
                        segment[j] = chars[random.Next(chars.Length)];
                    }
                    parts[i] = new string(segment);
                }
                var rawLicenseKey = $"TBZ-{string.Join("-", parts)}";
                var hashedKey = ApiKeyHasher.Hash(rawLicenseKey);

                lab.ApiKeyHash = hashedKey;

                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = id,
                    EventType = "LicenseKeyRegenerated",
                    PayloadJson = "{}",
                    OccurredAt = DateTime.UtcNow,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                return Results.Ok(new { success = true, licenseKey = rawLicenseKey });
            })
            .WithName("RegenerateLabLicenseKey")
            .WithOpenApi();

            // POST /api/controltower/labs/{id}/renew-subscription
            app.MapPost("/api/controltower/labs/{id}/renew-subscription", async (string id, MiddlewareDbContext db) =>
            {
                var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == id);
                if (lab == null) return Results.NotFound(new { error = "Laboratory not found." });

                // Extend ExpiryDate by exactly one year from current ExpiryDate, or from UtcNow if null/past
                var baseDate = (lab.ExpiryDate.HasValue && lab.ExpiryDate.Value > DateTime.UtcNow)
                    ? lab.ExpiryDate.Value
                    : DateTime.UtcNow;
                var newExpiry = baseDate.AddYears(1);
                lab.ExpiryDate = newExpiry;
                lab.Status = "Active"; // Ensure status is Active upon renewal

                db.StoredEvents.Add(new StoredEvent
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    LabId = id,
                    EventType = "SubscriptionRenewed",
                    PayloadJson = System.Text.Json.JsonSerializer.Serialize(new { NewExpiry = newExpiry }),
                    OccurredAt = DateTime.UtcNow,
                    ReceivedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                return Results.Ok(new { success = true, newExpiry = newExpiry });
            })
            .WithName("RenewLabSubscription")
            .WithOpenApi();

            // 30. GET /api/controltower/labs/{id}/timeline
            app.MapGet("/api/controltower/labs/{id}/timeline", async (string id, MiddlewareDbContext db) =>
            {
                var telemetryTypes = TBZ.Middleware.Api.Registry.EventMetadataRegistry.GetEventTypesByCategory("Telemetry").ToList();

                var events = await db.StoredEvents
                    .Where(e => e.LabId == id && !telemetryTypes.Contains(e.EventType))
                    .OrderByDescending(e => e.OccurredAt)
                    .Take(100)
                    .ToListAsync();

                var timeline = events.Select(e =>
                {
                    var metadata = TBZ.Middleware.Api.Registry.EventMetadataRegistry.GetMetadata(e.EventType);
                    var formattedDescription = TBZ.Middleware.Api.Registry.EventMetadataRegistry.FormatDescription(metadata, e.PayloadJson);

                    return new
                    {
                        Time = e.OccurredAt,
                        Type = metadata.Category,
                        Description = formattedDescription,
                        Icon = metadata.Icon
                    };
                }).ToList();

                return Results.Ok(timeline);
            })
            .WithName("GetLabTimeline")
            .WithOpenApi();

            // 31. GET /api/controltower/diagnostics/{bundleId}/download
            app.MapGet("/api/controltower/diagnostics/{bundleId}/download", async (Guid bundleId, MiddlewareDbContext db) =>
            {
                var bundle = await db.DiagnosticsBundles.FindAsync(bundleId);
                if (bundle == null) return Results.NotFound();

                if (bundle.Status != "Ready")
                {
                    return Results.BadRequest(new { error = $"Diagnostic bundle status is '{bundle.Status}' and cannot be downloaded." });
                }

                var zipPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "diagnostics-bundles", $"{bundleId}.zip");
                if (!File.Exists(zipPath))
                {
                    return Results.NotFound(new { error = "Diagnostic ZIP archive was deleted or is temporarily missing." });
                }

                return Results.File(zipPath, "application/zip", $"{bundleId}.zip");
            })
            .WithName("DownloadDiagnosticBundle")
            .WithOpenApi();

            // 32. GET /api/controltower/diagnostics/{bundleId}/summary
            app.MapGet("/api/controltower/diagnostics/{bundleId}/summary", async (Guid bundleId, MiddlewareDbContext db) =>
            {
                var bundle = await db.DiagnosticsBundles.FindAsync(bundleId);
                if (bundle == null) return Results.NotFound();

                string manifestJson = "{}";
                string hostJson = "{}";
                string healthJson = "{}";
                string logsText = "";
                string summaryMd = "";

                var extractPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "diagnostics-bundles", bundleId.ToString());
                if (Directory.Exists(extractPath))
                {
                    var manifestFile = Path.Combine(extractPath, "bundle_manifest.json");
                    if (File.Exists(manifestFile)) manifestJson = await File.ReadAllTextAsync(manifestFile);

                    var hostFile = Path.Combine(extractPath, "MachineContext", "host_inventory.json");
                    if (File.Exists(hostFile)) hostJson = await File.ReadAllTextAsync(hostFile);

                    var healthFile = Path.Combine(extractPath, "HealthContext", "health_snapshot.json");
                    if (File.Exists(healthFile)) healthJson = await File.ReadAllTextAsync(healthFile);

                    var logsFile = Path.Combine(extractPath, "DiagnosticContext", "active_logs.txt");
                    if (File.Exists(logsFile))
                    {
                        var lines = await File.ReadAllLinesAsync(logsFile);
                        logsText = string.Join("\n", lines.Take(100));
                    }

                    var summaryFile = Path.Combine(extractPath, "summary.md");
                    if (File.Exists(summaryFile)) summaryMd = await File.ReadAllTextAsync(summaryFile);
                }

                object? manifest = null;
                object? hostInventory = null;
                object? healthSnapshot = null;

                try { manifest = System.Text.Json.JsonSerializer.Deserialize<object>(manifestJson); } catch {}
                try { hostInventory = System.Text.Json.JsonSerializer.Deserialize<object>(hostJson); } catch {}
                try { healthSnapshot = System.Text.Json.JsonSerializer.Deserialize<object>(healthJson); } catch {}

                return Results.Ok(new
                {
                    BundleId = bundle.Id,
                    LabId = bundle.LabId,
                    Status = bundle.Status,
                    BundleSizeBytes = bundle.BundleSizeBytes,
                    ChecksumSha256 = bundle.ChecksumSha256,
                    CompletedAt = bundle.CompletedAt,
                    ErrorMessage = bundle.ErrorMessage,
                    Manifest = manifest,
                    HostInventory = hostInventory,
                    HealthSnapshot = healthSnapshot,
                    SummaryMarkdown = summaryMd,
                    RecentLogs = logsText
                });
            })
            .WithName("GetDiagnosticBundleSummary")
            .WithOpenApi();

            // 33. GET /api/controltower/diagnostics/{bundleId}/logs
            app.MapGet("/api/controltower/diagnostics/{bundleId}/logs", async (Guid bundleId, MiddlewareDbContext db) =>
            {
                var bundle = await db.DiagnosticsBundles.FindAsync(bundleId);
                if (bundle == null) return Results.NotFound();

                var logsFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "diagnostics-bundles", bundleId.ToString(), "DiagnosticContext", "active_logs.txt");
                if (!File.Exists(logsFile))
                {
                    return Results.NotFound(new { error = "Log file not found." });
                }

                return Results.Text(await File.ReadAllTextAsync(logsFile), "text/plain");
            })
            .WithName("GetDiagnosticBundleLogs")
            .WithOpenApi();

            // 34. POST /api/controltower/releases
            app.MapPost("/api/controltower/releases", async (HttpRequest request, MiddlewareDbContext db, ILoggerFactory loggerFactory) =>
            {
                var logger = loggerFactory.CreateLogger("ControlTowerEndpoints");
                var otaDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ota-packages");
                var tempFilePath = Path.Combine(otaDir, $"{Guid.NewGuid()}.tmp.zip");

                try
                {
                    var form = await request.ReadFormAsync();
                    var file = form.Files.GetFile("file");
                    var releaseNotes = form["releaseNotes"].ToString();
                    var rolloutRing = form["rolloutRing"].ToString();

                    if (file == null || file.Length == 0)
                    {
                        throw new Exception("Validation failed: No file uploaded or the uploaded file is empty.");
                    }

                    Directory.CreateDirectory(otaDir);

                    using (var tempStream = new FileStream(tempFilePath, FileMode.Create))
                    {
                        await file.CopyToAsync(tempStream);
                    }

                    string sha256Hash;
                    using (var sha256 = System.Security.Cryptography.SHA256.Create())
                    using (var readStream = new FileStream(tempFilePath, FileMode.Open, FileAccess.Read))
                    {
                        var hashBytes = await sha256.ComputeHashAsync(readStream);
                        sha256Hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                    }

                    string version;
                    int schemaVersion;
                    string targetArchitecture;
                    long requiredFreeSpaceBytes;
                    string? signature = null;
                    string? signatureAlgorithm = null;

                    using (var archive = new System.IO.Compression.ZipArchive(File.OpenRead(tempFilePath)))
                    {
                        var entry = archive.GetEntry("release.json");
                        if (entry == null)
                        {
                            throw new Exception("Validation failed: Manifest release.json was not found in the root of the ZIP archive.");
                        }

                        using var reader = new StreamReader(entry.Open());
                        var manifestText = await reader.ReadToEndAsync();
                        
                        System.Text.Json.JsonDocument doc;
                        try
                        {
                            doc = System.Text.Json.JsonDocument.Parse(manifestText);
                        }
                        catch (System.Text.Json.JsonException jsonEx)
                        {
                            throw new Exception($"Validation failed: release.json contains invalid JSON syntax. Detail: {jsonEx.Message}", jsonEx);
                        }

                        using (doc)
                        {
                            var root = doc.RootElement;
                            if (!root.TryGetProperty("version", out var versionProp) || string.IsNullOrEmpty(versionProp.GetString()))
                            {
                                throw new Exception("Validation failed: The 'version' parameter is required and cannot be null or empty in release.json.");
                            }
                            version = versionProp.GetString()!;

                            if (!root.TryGetProperty("schemaVersion", out var schemaProp))
                            {
                                throw new Exception("Validation failed: The 'schemaVersion' parameter is missing in release.json.");
                            }
                            schemaVersion = schemaProp.GetInt32();

                            if (!root.TryGetProperty("requiredFreeSpaceBytes", out var spaceProp))
                            {
                                throw new Exception("Validation failed: The 'requiredFreeSpaceBytes' parameter is missing in release.json.");
                            }
                            requiredFreeSpaceBytes = spaceProp.GetInt64();

                            targetArchitecture = root.TryGetProperty("targetArchitecture", out var archProp) ? archProp.GetString() ?? "x64" : "x64";

                            if (root.TryGetProperty("signature", out var sigProp)) signature = sigProp.GetString();
                            if (root.TryGetProperty("signatureAlgorithm", out var algoProp)) signatureAlgorithm = algoProp.GetString();
                        }
                    }

                    // Check if this package architecture is already registered for this release version
                    var release = await db.Releases.FirstOrDefaultAsync(r => r.Version == version);
                    if (release != null)
                    {
                        var existingPackage = await db.ReleasePackages.AnyAsync(p => p.ReleaseId == release.Id && p.TargetArchitecture == targetArchitecture);
                        if (existingPackage)
                        {
                            throw new Exception($"Validation failed: A package for version '{version}' and architecture '{targetArchitecture}' has already been uploaded.");
                        }
                    }

                    var packageFileName = $"{Guid.NewGuid()}.zip";
                    var permanentFilePath = Path.Combine(otaDir, packageFileName);
                    File.Move(tempFilePath, permanentFilePath);

                    if (release == null)
                    {
                        release = new Release
                        {
                            Id = Guid.NewGuid(),
                            Version = version,
                            ReleaseNotes = releaseNotes,
                            RolloutRing = rolloutRing,
                            CanaryPercentage = 100,
                            Status = "Stable",
                            CreatedAt = DateTime.UtcNow,
                            PublishedAt = DateTime.UtcNow
                        };
                        db.Releases.Add(release);
                    }

                    var package = new ReleasePackage
                    {
                        Id = Guid.NewGuid(),
                        ReleaseId = release.Id,
                        TargetArchitecture = targetArchitecture,
                        PackageFileName = packageFileName,
                        ChecksumSha256 = sha256Hash,
                        RequiredFreeSpaceBytes = requiredFreeSpaceBytes,
                        SchemaVersion = schemaVersion,
                        Signature = signature,
                        SignatureAlgorithm = signatureAlgorithm
                    };
                    db.ReleasePackages.Add(package);

                    var policy = new DeploymentPolicy
                    {
                        Id = Guid.NewGuid(),
                        ReleaseId = release.Id,
                        DeploymentTimeoutSeconds = 600,
                        HeartbeatTimeoutSeconds = 300,
                        RollbackThresholdPercentage = 5.0
                    };
                    db.DeploymentPolicies.Add(policy);

                    db.StoredEvents.Add(new StoredEvent
                    {
                        Id = Guid.NewGuid(),
                        EventId = Guid.NewGuid(),
                        LabId = "SYSTEM",
                        EventType = "OTAPackageUploaded",
                        PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                        {
                            ReleaseId = release.Id,
                            Version = version,
                            TargetArchitecture = targetArchitecture,
                            PackageFileName = packageFileName,
                            ChecksumSha256 = sha256Hash
                        }),
                        OccurredAt = DateTime.UtcNow,
                        ReceivedAt = DateTime.UtcNow
                    });

                    db.StoredEvents.Add(new StoredEvent
                    {
                        Id = Guid.NewGuid(),
                        EventId = Guid.NewGuid(),
                        LabId = "SYSTEM",
                        EventType = "ReleasePublished",
                        PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                        {
                            ReleaseId = release.Id,
                            Version = version,
                            Status = release.Status,
                            RolloutRing = release.RolloutRing
                        }),
                        OccurredAt = DateTime.UtcNow,
                        ReceivedAt = DateTime.UtcNow
                    });

                    await db.SaveChangesAsync();

                    return Results.Ok(new { success = true, releaseId = release.Id, packageId = package.Id, version });
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Exception during OTA release package process.");
                    if (File.Exists(tempFilePath)) File.Delete(tempFilePath);

                    var env = request.HttpContext.RequestServices.GetService<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
                    bool isDev = env?.EnvironmentName == "Development" || env == null;

                    if (isDev)
                    {
                        return Results.BadRequest(new { error = ex.Message, stackTrace = ex.StackTrace });
                    }
                    else
                    {
                        return Results.BadRequest(new { error = $"Failed to process release package: {ex.Message}" });
                    }
                }
            })
            .DisableAntiforgery()
            .WithName("UploadReleasePackage")
            .WithOpenApi();

            // 35. GET /api/controltower/updates/check
            app.MapGet("/api/controltower/updates/check", async (string labId, string currentVersion, MiddlewareDbContext db) =>
            {
                 var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == labId);
                 if (lab == null) return Results.NotFound(new { error = "Laboratory not found." });

                  if (string.IsNullOrWhiteSpace(lab.RolloutRing))
                  {
                      return Results.Ok(new
                      {
                          updateAvailable = false,
                          status = "LabNotConfigured",
                          message = "Lab rollout ring is not configured."
                      });
                  }

                  if (lab.RolloutRing == "Disabled")
                  {
                      return Results.Ok(new
                      {
                          updateAvailable = false,
                          status = "Disabled",
                          message = "Updates are disabled for this laboratory."
                      });
                  }

                var eligibleRings = lab.RolloutRing switch
                {
                    "Canary" => new[] { "Canary", "Early", "Production" },
                    "Early" => new[] { "Early", "Production" },
                    _ => new[] { "Production" }
                };

                var candidateReleases = await db.Releases
                    .Where(r => eligibleRings.Contains(r.RolloutRing) && (r.Status == "Stable" || r.Status == "Beta"))
                    .ToListAsync();

                var latestRelease = candidateReleases
                    .Select(r => new { Release = r, ParsedVersion = Version.TryParse(r.Version.Replace("v", ""), out var v) ? v : new Version(0, 0, 0) })
                    .OrderByDescending(x => x.ParsedVersion)
                    .FirstOrDefault();

                var parsedCurrent = Version.TryParse(currentVersion.Replace("v", ""), out var currV) ? currV : new Version(0, 0, 0);

                if (latestRelease != null && latestRelease.ParsedVersion > parsedCurrent)
                {
                    var release = latestRelease.Release;

                    int hashBucket = Math.Abs(labId.GetHashCode()) % 100;
                    if (hashBucket < release.CanaryPercentage)
                    {
                        var package = await db.ReleasePackages
                            .FirstOrDefaultAsync(p => p.ReleaseId == release.Id);

                        if (package != null)
                        {
                            var deployment = new Deployment
                            {
                                Id = Guid.NewGuid(),
                                LabId = labId,
                                ReleaseId = release.Id,
                                Status = "Pending",
                                StartedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                            db.Deployments.Add(deployment);
                            await db.SaveChangesAsync();

                            return Results.Ok(new
                            {
                                updateAvailable = true,
                                deploymentId = deployment.Id,
                                packageId = package.Id,
                                version = release.Version,
                                checksumSha256 = package.ChecksumSha256,
                                requiredFreeSpaceBytes = package.RequiredFreeSpaceBytes,
                                schemaVersion = package.SchemaVersion,
                                signature = package.Signature,
                                signatureAlgorithm = package.SignatureAlgorithm,
                                downloadUrl = $"/api/controltower/packages/{package.Id}/download"
                            });
                        }
                    }
                }

                return Results.Ok(new { updateAvailable = false });
            })
            .WithName("CheckLatestUpdate")
            .WithOpenApi();

            // GET /api/controltower/releases/{version}/eligibility
            app.MapGet("/api/controltower/releases/{version}/eligibility", async (string version, MiddlewareDbContext db) =>
            {
                var cleanVersion = version.Replace("v", "").Trim();
                var targetRelease = await db.Releases.FirstOrDefaultAsync(r => r.Version.Replace("v", "").Trim() == cleanVersion);
                if (targetRelease == null) return Results.NotFound(new { error = $"Release version '{version}' not found." });

                var labs = await db.Labs.ToListAsync();
                var labsList = new List<object>();

                int eligibleCount = 0;
                int disabledCount = 0;
                int ringMismatchCount = 0;
                int unconfiguredCount = 0;
                int alreadyNewerCount = 0;
                int canaryPercentageCount = 0;

                foreach (var lab in labs)
                {
                    bool eligible = true;
                    string? failedAt = null;
                    string reason = "Eligible";
                    string reasonDetail = "Lab is eligible to receive this update.";

                    if (string.IsNullOrWhiteSpace(lab.RolloutRing))
                    {
                        eligible = false;
                        failedAt = "RolloutRing";
                        reason = "LabNotConfigured";
                        reasonDetail = "Lab rollout ring is unconfigured.";
                    }
                    else if (lab.RolloutRing == "Disabled")
                    {
                        eligible = false;
                        failedAt = "RolloutRing";
                        reason = "Disabled";
                        reasonDetail = "Lab updates are disabled.";
                    }
                    else
                    {
                        var eligibleRings = lab.RolloutRing switch
                        {
                            "Canary" => new[] { "Canary", "Early", "Production" },
                            "Early" => new[] { "Early", "Production" },
                            _ => new[] { "Production" }
                        };

                        bool ringMatch = eligibleRings.Contains(targetRelease.RolloutRing);
                        if (!ringMatch)
                        {
                            eligible = false;
                            failedAt = "RolloutRing";
                            reason = "RolloutRingMismatch";
                            reasonDetail = $"Lab ring '{lab.RolloutRing}' is not compatible with release ring '{targetRelease.RolloutRing}'.";
                        }
                        else
                        {
                            var parsedTarget = Version.TryParse(cleanVersion, out var tv) ? tv : new Version(0, 0, 0);
                            var parsedActive = Version.TryParse(lab.ActiveVersion.Replace("v", ""), out var av) ? av : new Version(0, 0, 0);
                            bool isNewer = parsedTarget > parsedActive;

                            if (!isNewer)
                            {
                                eligible = false;
                                failedAt = "VersionCheck";
                                reason = "AlreadyNewerVersion";
                                reasonDetail = $"Lab version '{lab.ActiveVersion}' is newer than or equal to target version '{targetRelease.Version}'.";
                            }
                            else
                            {
                                int hashBucket = Math.Abs(lab.Id.GetHashCode()) % 100;
                                bool inCanary = hashBucket < targetRelease.CanaryPercentage;

                                if (!inCanary)
                                {
                                    eligible = false;
                                    failedAt = "CanaryPercentage";
                                    reason = "CanaryPercentage";
                                    reasonDetail = $"Lab hash bucket ({hashBucket}) is not within release canary percentage ({targetRelease.CanaryPercentage}%).";
                                }
                            }
                        }
                    }

                    if (eligible) eligibleCount++;
                    else if (reason == "LabNotConfigured") unconfiguredCount++;
                    else if (reason == "Disabled") disabledCount++;
                    else if (reason == "AlreadyNewerVersion") alreadyNewerCount++;
                    else if (reason == "RolloutRingMismatch") ringMismatchCount++;
                    else if (reason == "CanaryPercentage") canaryPercentageCount++;

                    labsList.Add(new
                    {
                        labId = lab.Id,
                        labName = lab.LabName,
                        eligible,
                        failedAt,
                        reason,
                        reasonDetail,
                        currentVersion = lab.ActiveVersion,
                        targetVersion = targetRelease.Version,
                        ring = lab.RolloutRing
                    });
                }

                return Results.Ok(new
                {
                    summary = new
                    {
                        eligible = eligibleCount,
                        disabled = disabledCount,
                        ringMismatch = ringMismatchCount,
                        unconfigured = unconfiguredCount,
                        alreadyNewer = alreadyNewerCount,
                        canaryPercentage = canaryPercentageCount
                    },
                    labs = labsList
                });
            })
            .WithName("GetReleaseEligibility")
            .WithOpenApi();

            // 36. GET /api/controltower/packages/{packageId}/download
            app.MapGet("/api/controltower/packages/{packageId}/download", async (Guid packageId, MiddlewareDbContext db) =>
            {
                var package = await db.ReleasePackages.FindAsync(packageId);
                if (package == null) return Results.NotFound();

                var filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ota-packages", package.PackageFileName);
                if (!File.Exists(filePath)) return Results.NotFound(new { error = "Package file not found." });

                return Results.File(filePath, "application/zip", package.PackageFileName);
            })
            .WithName("DownloadPackageZip")
            .WithOpenApi();

            // 37. POST /api/controltower/deployments/events
            app.MapPost("/api/controltower/deployments/events", async (DeploymentEventDto dto, MiddlewareDbContext db) =>
            {
                var deployment = await db.Deployments.FindAsync(dto.DeploymentId);
                if (deployment == null) return Results.NotFound(new { error = "Deployment not found." });

                string mappedStatus = dto.EventType;
                if (dto.EventType == "Healthy")
                {
                    mappedStatus = "Completed";
                }
                
                deployment.Status = mappedStatus;
                deployment.UpdatedAt = DateTime.UtcNow;

                var depEvent = new DeploymentEvent
                {
                    Id = Guid.NewGuid(),
                    DeploymentId = dto.DeploymentId,
                    EventType = dto.EventType,
                    OccurredAt = DateTime.UtcNow,
                    PayloadJson = dto.PayloadJson
                };
                db.DeploymentEvents.Add(depEvent);
                await db.SaveChangesAsync();

                return Results.Ok(new { success = true });
            })
            .WithName("ReportDeploymentLifecycleEvent")
            .WithOpenApi();

            // 38. GET /api/controltower/releases
            app.MapGet("/api/controltower/releases", async (MiddlewareDbContext db) =>
            {
                var releases = await db.Releases.OrderByDescending(r => r.CreatedAt).ToListAsync();
                var result = new List<object>();

                foreach (var r in releases)
                {
                    var packages = await db.ReleasePackages.Where(p => p.ReleaseId == r.Id).ToListAsync();
                    var policy = await db.DeploymentPolicies.FirstOrDefaultAsync(p => p.ReleaseId == r.Id);

                    result.Add(new
                    {
                        r.Id,
                        r.Version,
                        r.ReleaseNotes,
                        r.RolloutRing,
                        r.CanaryPercentage,
                        r.Status,
                        r.CreatedAt,
                        r.PublishedAt,
                        Packages = packages.Select(p => new
                        {
                            p.Id,
                            p.TargetArchitecture,
                            p.ChecksumSha256,
                            p.RequiredFreeSpaceBytes,
                            p.SchemaVersion
                        }),
                        Policy = policy != null ? new
                        {
                            policy.DeploymentTimeoutSeconds,
                            policy.HeartbeatTimeoutSeconds,
                            policy.RollbackThresholdPercentage
                        } : null
                    });
                }
                return Results.Ok(result);
            })
            .WithName("GetReleasesList")
            .WithOpenApi();

            // 39. POST /api/controltower/releases/{id}/publish
            app.MapPost("/api/controltower/releases/{id}/publish", async (Guid id, [Microsoft.AspNetCore.Mvc.FromQuery] int canaryPercentage, MiddlewareDbContext db) =>
            {
                var release = await db.Releases.FindAsync(id);
                if (release == null) return Results.NotFound();

                release.Status = "Stable";
                release.CanaryPercentage = canaryPercentage;
                release.PublishedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();

                return Results.Ok(new { success = true });
            })
            .WithName("PublishRelease")
            .WithOpenApi();

            // 40. POST /api/controltower/releases/{id}/pause
            app.MapPost("/api/controltower/releases/{id}/pause", async (Guid id, MiddlewareDbContext db) =>
            {
                var release = await db.Releases.FindAsync(id);
                if (release == null) return Results.NotFound();

                release.Status = "Paused";
                await db.SaveChangesAsync();

                return Results.Ok(new { success = true });
            })
            .WithName("PauseReleaseRollout")
            .WithOpenApi();

            // 41. POST /api/controltower/releases/{id}/resume
            app.MapPost("/api/controltower/releases/{id}/resume", async (Guid id, MiddlewareDbContext db) =>
            {
                var release = await db.Releases.FindAsync(id);
                if (release == null) return Results.NotFound();

                release.Status = "Stable";
                await db.SaveChangesAsync();

                return Results.Ok(new { success = true });
            })
            .WithName("ResumeReleaseRollout")
            .WithOpenApi();

            // 42. POST /api/controltower/releases/{id}/cancel
            app.MapPost("/api/controltower/releases/{id}/cancel", async (Guid id, MiddlewareDbContext db) =>
            {
                var release = await db.Releases.FindAsync(id);
                if (release == null) return Results.NotFound();

                release.Status = "Cancelled";

                var deployments = await db.Deployments
                    .Where(d => d.ReleaseId == id && (d.Status == "Pending" || d.Status == "Downloading"))
                    .ToListAsync();

                foreach (var d in deployments)
                {
                    d.Status = "Cancelled";
                    d.UpdatedAt = DateTime.UtcNow;
                }

                await db.SaveChangesAsync();
                return Results.Ok(new { success = true });
            })
            .WithName("CancelReleaseRollout")
            .WithOpenApi();

            // 43. GET /api/controltower/deployments
            app.MapGet("/api/controltower/deployments", async (MiddlewareDbContext db) =>
            {
                var deployments = await db.Deployments.OrderByDescending(d => d.UpdatedAt).ToListAsync();
                var result = new List<object>();

                foreach (var d in deployments)
                {
                    var events = await db.DeploymentEvents
                        .Where(e => e.DeploymentId == d.Id)
                        .OrderBy(e => e.OccurredAt)
                        .ToListAsync();

                    var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == d.LabId);

                    result.Add(new
                    {
                        d.Id,
                        d.LabId,
                        LabName = lab?.LabName ?? "Unknown Lab",
                        d.ReleaseId,
                        d.Status,
                        d.StartedAt,
                        d.UpdatedAt,
                        Events = events.Select(e => new
                        {
                            e.EventType,
                            e.OccurredAt,
                            e.PayloadJson
                        })
                    });
                }
                return Results.Ok(result);
            })
            .WithName("GetDeploymentsList")
            .WithOpenApi();
        }
    }

    public record LinkTicketDto(Guid CaseId);
    public record UpdateTicketStatusDto(string Status, string? StatusMessage);
    public record DeploymentEventDto(Guid DeploymentId, string EventType, string? PayloadJson);
    public record UpdateLabRolloutRingDto(string RolloutRing);
    public record RegisterLabDto(string LabName, string? ContactPerson, string? Email, string? Phone, string? LicenseType, int? MaximumBranches, DateTime? ExpiryDate, List<string>? EnabledFeatures);
    public record UpdateLabPropertiesDto(string? LabName, string? ContactPerson, string? Email, string? Phone);
    public record ManageLicenseDto(string? LicenseType, int? MaximumBranches, DateTime? ExpiryDate, List<string>? EnabledFeatures, string? Status);
    public record ExtendTrialDto(int DaysToExtend);
}

