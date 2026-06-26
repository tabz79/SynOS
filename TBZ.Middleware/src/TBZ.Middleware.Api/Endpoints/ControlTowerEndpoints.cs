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
        }
    }
}
