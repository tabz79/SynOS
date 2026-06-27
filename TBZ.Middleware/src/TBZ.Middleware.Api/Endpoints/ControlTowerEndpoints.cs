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
                
                // Connection Metadata defaults to "Not Configured"
                var connectionStatus = "Not Configured";
                var businessAccount = "N/A";
                
                // If there are any delivery facts or queue items, we can claim Connected for demo metrics
                var totalQueue = await db.DeliveryQueueItems.CountAsync(q => q.LabId == resolvedLabId);
                if (totalQueue > 0)
                {
                    connectionStatus = "Connected";
                    businessAccount = "Divya Diagnostics WhatsApp Biz";
                }

                var delivered = await db.DeliveryFacts
                    .CountAsync(f => f.DeliveryMethod == "WhatsApp" && f.Status == "Delivered");

                var sent = await db.DeliveryQueueItems
                    .CountAsync(q => q.LabId == resolvedLabId && q.Status == "Sent");

                var pending = await db.DeliveryQueueItems
                    .CountAsync(q => q.LabId == resolvedLabId && q.Status == "Pending");

                var failed = await db.DeliveryQueueItems
                    .CountAsync(q => q.LabId == resolvedLabId && q.Status == "Failed");

                return Results.Ok(new
                {
                    ConnectionStatus = connectionStatus,
                    BusinessAccount = businessAccount,
                    Sent = sent,
                    Delivered = delivered,
                    Pending = pending,
                    Failed = failed,
                    TotalQueue = totalQueue
                });
            })
            .WithName("GetWhatsAppSummary")
            .WithOpenApi();

            // 19. GET /api/controltower/whatsapp/logs
            app.MapGet("/api/controltower/whatsapp/logs", async (
                HttpContext context,
                string? labId,
                MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var logs = await db.DeliveryQueueItems
                    .Where(q => q.LabId == resolvedLabId)
                    .OrderByDescending(q => q.CreatedAt)
                    .Take(50)
                    .Select(q => new
                    {
                        q.Id,
                        q.Phone,
                        q.MessageType,
                        q.Status,
                        q.CreatedAt,
                        q.SentAt
                    })
                    .ToListAsync();

                return Results.Ok(logs);
            })
            .WithName("GetWhatsAppLogs")
            .WithOpenApi();

            // 20. GET /api/controltower/whatsapp/templates
            app.MapGet("/api/controltower/whatsapp/templates", (HttpContext context) =>
            {
                return Results.Ok(new[]
                {
                    new { Name = "visit_finalized_alert", Body = "Hello {{1}}, your test results for {{2}} are now finalized. View report here: {{3}}" },
                    new { Name = "invoice_billing_receipt", Body = "Dear {{1}}, thank you for choosing Divya Diagnostics. Your invoice for ₹{{2}} has been generated: {{3}}" },
                    new { Name = "critical_alert_low_hemoglobin", Body = "CRITICAL ALERT: Hello Dr. {{1}}, patient {{2}} returned a critical value of {{3}} for {{4}}." }
                });
            })
            .WithName("GetWhatsAppTemplates")
            .WithOpenApi();
        }
    }
}
