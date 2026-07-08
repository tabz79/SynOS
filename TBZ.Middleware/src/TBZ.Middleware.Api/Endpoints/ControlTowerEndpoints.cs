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

                // Transition status to "Dispatched"
                foreach (var cmd in pending)
                {
                    cmd.Status = "Dispatched";
                    cmd.DispatchedAt = DateTime.UtcNow;
                }
                await db.SaveChangesAsync();

                return Results.Ok(pending);
            })
            .WithName("GetPendingCommands")
            .WithOpenApi();

            // 22. POST /api/commands/status
            app.MapPost("/api/commands/status", async (Guid commandId, string status, MiddlewareDbContext db) =>
            {
                var command = await db.CommandDirectives.FindAsync(commandId);
                if (command == null) return Results.NotFound();

                command.Status = status;
                if (status == "Executed")
                {
                    command.ExecutedAt = DateTime.UtcNow;
                }
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
        }
    }
}
