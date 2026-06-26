using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
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
            app.MapGet("/api/controltower/overview", async (HttpContext context, string? labId, string? branchId, DateTime? date, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var targetDate = (date ?? DateTime.UtcNow).Date;

                // Today's Throughput
                var opsFact = await db.DailyOperationsFacts.FirstOrDefaultAsync(f => 
                    f.LabId == resolvedLabId && f.Date == targetDate);

                // Active Queues (Backlogs) calculated from WorkflowFacts & DeliveryFacts
                var workflowQuery = db.WorkflowFacts.Where(w => w.LabId == resolvedLabId);
                if (!string.IsNullOrEmpty(branchId))
                {
                    workflowQuery = workflowQuery.Where(w => w.BranchId == branchId);
                }

                var backlogAwaitingPayment = await workflowQuery.CountAsync(w => 
                    w.VisitCreatedAt != null && w.PaymentReceivedAt == null);

                var backlogAwaitingSampleDraw = await workflowQuery.CountAsync(w => 
                    w.PaymentReceivedAt != null && w.SampleCollectedAt == null);

                var backlogAwaitingProcessing = await workflowQuery.CountAsync(w => 
                    w.SampleCollectedAt != null && w.ProcessingStartedAt == null);

                var backlogAwaitingVerification = await workflowQuery.CountAsync(w => 
                    w.ProcessingStartedAt != null && w.ReportSignedAt == null);

                // Join with WorkflowFacts to filter by LabId/BranchId
                var deliveryQuery = db.DeliveryFacts.AsQueryable();
                if (!string.IsNullOrEmpty(branchId))
                {
                    deliveryQuery = from d in db.DeliveryFacts
                                    join w in db.WorkflowFacts on d.PatientId equals w.PatientId
                                    where w.LabId == resolvedLabId && w.BranchId == branchId
                                    select d;
                }
                else
                {
                    deliveryQuery = from d in db.DeliveryFacts
                                    join w in db.WorkflowFacts on d.PatientId equals w.PatientId
                                    where w.LabId == resolvedLabId
                                    select d;
                }
                
                var backlogPendingDispatch = await deliveryQuery.CountAsync(d => d.Status == "Pending");

                var dto = new OverviewDto
                {
                    LabId = resolvedLabId,
                    BranchId = branchId,
                    Date = targetDate,
                    RegistrationsToday = opsFact?.PatientsRegistered ?? 0,
                    BillsCreatedToday = opsFact?.BillsCreated ?? 0,
                    SamplesCollectedToday = opsFact?.SamplesCollected ?? 0,
                    ReportsSignedToday = opsFact?.ReportsSigned ?? 0,
                    ReportsDeliveredToday = opsFact?.ReportsDelivered ?? 0,
                    RevenueCollectedToday = opsFact?.RevenueCollected ?? 0,
                    PaymentsCountToday = opsFact?.PaymentsCount ?? 0,
                    BacklogAwaitingPayment = backlogAwaitingPayment,
                    BacklogAwaitingSampleDraw = backlogAwaitingSampleDraw,
                    BacklogAwaitingProcessing = backlogAwaitingProcessing,
                    BacklogAwaitingVerification = backlogAwaitingVerification,
                    BacklogPendingDispatch = backlogPendingDispatch
                };

                return Results.Ok(dto);
            })
            .WithName("GetOverview")
            .WithOpenApi();

            // 2. GET /api/controltower/health
            app.MapGet("/api/controltower/health", async (HttpContext context, string? labId, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);

                // Live Lab Health metrics from in-memory cache populated via headers
                LabHealthCache.Metrics.TryGetValue(resolvedLabId, out var liveMetrics);

                // Last Event Received timestamp from StoredEvents (permitted explicitly for Health endpoint)
                var lastEventReceived = await db.StoredEvents
                    .Where(e => e.LabId == resolvedLabId)
                    .OrderByDescending(e => e.Sequence)
                    .Select(e => (DateTime?)e.ReceivedAt)
                    .FirstOrDefaultAsync();

                // Health checks for each projection worker checkpoint
                var checkpoints = await db.ProjectionCheckpoints.ToListAsync();
                var workersHealth = checkpoints.Select(c => new WorkerHealthDto
                {
                    WorkerName = c.ProjectionName,
                    LastProcessedSequence = c.LastProcessedSequence,
                    LastUpdatedAtUtc = c.UpdatedAt,
                    IsHealthy = (DateTime.UtcNow - c.UpdatedAt) < TimeSpan.FromMinutes(5)
                }).ToList();

                var lastProjectionTime = checkpoints.Count > 0 
                    ? checkpoints.Max(c => c.UpdatedAt) 
                    : (DateTime?)null;

                var dto = new HealthDto
                {
                    LabId = resolvedLabId,
                    PendingOutboxEvents = liveMetrics?.PendingOutboxCount ?? 0,
                    DeadLetterEvents = liveMetrics?.DeadLetterCount ?? 0,
                    LastEventReceived = lastEventReceived ?? liveMetrics?.LastEventReceivedAt,
                    LastProjectionTime = lastProjectionTime,
                    Workers = workersHealth
                };

                return Results.Ok(dto);
            })
            .WithName("GetHealth")
            .WithOpenApi();

            // 3. GET /api/controltower/workflow
            app.MapGet("/api/controltower/workflow", async (HttpContext context, string? labId, string? branchId, DateTime? startDate, DateTime? endDate, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                var query = db.WorkflowFacts.Where(w => 
                    w.LabId == resolvedLabId && 
                    w.VisitCreatedAt >= start && 
                    w.VisitCreatedAt <= end);

                if (!string.IsNullOrEmpty(branchId))
                {
                    query = query.Where(w => w.BranchId == branchId);
                }

                var factsList = await query.ToListAsync();

                // Compute averages in memory
                double ComputeAvgMinutes(Func<Domain.WorkflowFact, double?> diffSelector)
                {
                    var values = factsList.Select(diffSelector).Where(v => v.HasValue).Select(v => v!.Value).ToList();
                    return values.Count > 0 ? Math.Round(values.Average(), 2) : 0;
                }

                var avgRegToCheckout = ComputeAvgMinutes(f => 
                    (f.PaymentReceivedAt.HasValue && f.VisitCreatedAt.HasValue) 
                        ? (f.PaymentReceivedAt.Value - f.VisitCreatedAt.Value).TotalMinutes 
                        : (double?)null);

                var avgCheckoutToDraw = ComputeAvgMinutes(f => 
                    (f.SampleCollectedAt.HasValue && f.PaymentReceivedAt.HasValue) 
                        ? (f.SampleCollectedAt.Value - f.PaymentReceivedAt.Value).TotalMinutes 
                        : (double?)null);

                var avgDrawToProc = ComputeAvgMinutes(f => 
                    (f.ProcessingStartedAt.HasValue && f.SampleCollectedAt.HasValue) 
                        ? (f.ProcessingStartedAt.Value - f.SampleCollectedAt.Value).TotalMinutes 
                        : (double?)null);

                var avgProcToSign = ComputeAvgMinutes(f => 
                    (f.ReportSignedAt.HasValue && f.ProcessingStartedAt.HasValue) 
                        ? (f.ReportSignedAt.Value - f.ProcessingStartedAt.Value).TotalMinutes 
                        : (double?)null);

                var avgSignToDeliv = ComputeAvgMinutes(f => 
                    (f.ReportDeliveredAt.HasValue && f.ReportSignedAt.HasValue) 
                        ? (f.ReportDeliveredAt.Value - f.ReportSignedAt.Value).TotalMinutes 
                        : (double?)null);

                var avgOverall = ComputeAvgMinutes(f => 
                    (f.ReportDeliveredAt.HasValue && f.VisitCreatedAt.HasValue) 
                        ? (f.ReportDeliveredAt.Value - f.VisitCreatedAt.Value).TotalMinutes 
                        : (double?)null);

                var completedCount = factsList.Count(f => f.ReportSignedAt.HasValue);

                var dto = new WorkflowTatDto
                {
                    LabId = resolvedLabId,
                    BranchId = branchId,
                    AvgRegistrationToCheckoutMinutes = avgRegToCheckout,
                    AvgCheckoutToSampleDrawMinutes = avgCheckoutToDraw,
                    AvgSampleDrawToProcessingMinutes = avgDrawToProc,
                    AvgProcessingToReportSignedMinutes = avgProcToSign,
                    AvgReportSignedToReportDeliveredMinutes = avgSignToDeliv,
                    AvgOverallTurnaroundTimeMinutes = avgOverall,
                    TotalCompletedVisitsCount = completedCount
                };

                return Results.Ok(dto);
            })
            .WithName("GetWorkflowTat")
            .WithOpenApi();

            // 4. GET /api/controltower/revenue
            app.MapGet("/api/controltower/revenue", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var start = (startDate ?? DateTime.UtcNow.AddDays(-30)).Date;
                var end = (endDate ?? DateTime.UtcNow).Date;

                var opsFacts = await db.DailyOperationsFacts
                    .Where(f => f.LabId == resolvedLabId && f.Date >= start && f.Date <= end)
                    .OrderBy(f => f.Date)
                    .ToListAsync();

                var dto = new RevenueSummaryDto
                {
                    LabId = resolvedLabId,
                    DailyData = opsFacts.Select(f => new DailyRevenueDto
                    {
                        Date = f.Date,
                        RevenueCollected = f.RevenueCollected,
                        PaymentsCount = f.PaymentsCount,
                        BillsCreated = f.BillsCreated,
                        AvgBillValue = f.BillsCreated > 0 ? Math.Round(f.RevenueCollected / f.BillsCreated, 2) : 0
                    }).ToList()
                };

                return Results.Ok(dto);
            })
            .WithName("GetRevenue")
            .WithOpenApi();

            // 5. GET /api/controltower/tests
            app.MapGet("/api/controltower/tests", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var start = (startDate ?? DateTime.UtcNow.AddDays(-30)).Date;
                var end = (endDate ?? DateTime.UtcNow).Date;

                var testFacts = await db.TestVolumeFacts
                    .Where(f => f.LabId == resolvedLabId && f.Date >= start && f.Date <= end)
                    .ToListAsync();

                var topTests = testFacts
                    .GroupBy(f => f.TestCode)
                    .Select(g => new TestVolumeItemDto
                    {
                        TestCode = g.Key,
                        VolumeCount = g.Sum(x => x.VolumeCount)
                    })
                    .OrderByDescending(x => x.VolumeCount)
                    .Take(20)
                    .ToList();

                var deptVolumes = testFacts
                    .GroupBy(f => f.Department)
                    .Select(g => new DepartmentVolumeDto
                    {
                        Department = g.Key,
                        VolumeCount = g.Sum(x => x.VolumeCount)
                    })
                    .OrderByDescending(x => x.VolumeCount)
                    .ToList();

                var dto = new TestVolumeSummaryDto
                {
                    LabId = resolvedLabId,
                    TopTests = topTests,
                    DepartmentVolumes = deptVolumes
                };

                return Results.Ok(dto);
            })
            .WithName("GetTests")
            .WithOpenApi();

            // 6. GET /api/controltower/delivery
            app.MapGet("/api/controltower/delivery", async (HttpContext context, string? labId, string? branchId, DateTime? startDate, DateTime? endDate, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                // Join with WorkflowFacts to filter by LabId / BranchId
                var query = from d in db.DeliveryFacts
                            join w in db.WorkflowFacts on d.PatientId equals w.PatientId
                            where w.LabId == resolvedLabId && d.CreatedAt >= start && d.CreatedAt <= end
                            select new { d, w };

                if (!string.IsNullOrEmpty(branchId))
                {
                    query = query.Where(x => x.w.BranchId == branchId);
                }

                var deliveryData = await query.Select(x => x.d).ToListAsync();

                var totalRequested = deliveryData.Count(d => d.RequestedAt.HasValue);
                var totalDelivered = deliveryData.Count(d => d.Status == "Delivered");
                var totalPending = deliveryData.Count(d => d.Status == "Pending");

                var speeds = deliveryData
                    .Where(d => d.RequestedAt.HasValue && d.DeliveredAt.HasValue)
                    .Select(d => (d.DeliveredAt.Value - d.RequestedAt.Value).TotalMinutes)
                    .ToList();

                var avgSpeed = speeds.Count > 0 ? Math.Round(speeds.Average(), 2) : 0;

                var breakdown = deliveryData
                    .GroupBy(d => d.DeliveryMethod ?? "Unknown")
                    .Select(g => new DeliveryMethodBreakdownDto
                    {
                        DeliveryMethod = g.Key,
                        Count = g.Count()
                    })
                    .OrderByDescending(x => x.Count)
                    .ToList();

                var dto = new DeliverySummaryDto
                {
                    LabId = resolvedLabId,
                    BranchId = branchId,
                    TotalRequested = totalRequested,
                    TotalDelivered = totalDelivered,
                    TotalPending = totalPending,
                    AvgDeliverySpeedMinutes = avgSpeed,
                    MethodsBreakdown = breakdown
                };

                return Results.Ok(dto);
            })
            .WithName("GetDelivery")
            .WithOpenApi();

            // 7. GET /api/controltower/trends?days=7|30|90
            app.MapGet("/api/controltower/trends", async (HttpContext context, string? labId, int? days, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var numDays = days ?? 30;
                if (numDays != 7 && numDays != 30 && numDays != 90)
                {
                    numDays = 30; // Fallback to 30 days
                }

                var currentStart = DateTime.UtcNow.Date.AddDays(-numDays);
                var currentEnd = DateTime.UtcNow.Date;
                var previousStart = DateTime.UtcNow.Date.AddDays(-numDays * 2);
                var previousEnd = currentStart;

                var trendsData = await db.TrendFacts
                    .Where(f => f.LabId == resolvedLabId && f.Date >= previousStart && f.Date <= currentEnd)
                    .ToListAsync();

                // Fetch Doctor & Partner names for friendly display in trends
                var doctorNames = await db.DoctorReferralFacts
                    .Where(f => f.LabId == resolvedLabId && f.DoctorId != "Direct")
                    .Select(f => new { f.DoctorId, f.DoctorName })
                    .Distinct()
                    .ToDictionaryAsync(x => x.DoctorId, x => x.DoctorName);

                var partnerNames = await db.ReferralPartnerFacts
                    .Where(f => f.LabId == resolvedLabId && f.ReferralPartnerId != "Direct")
                    .Select(f => new { f.ReferralPartnerId, f.ReferralPartnerName })
                    .Distinct()
                    .ToDictionaryAsync(x => x.ReferralPartnerId, x => x.ReferralPartnerName);

                var dto = new TrendsSummaryDto();

                // Test volume trends
                dto.Tests = trendsData
                    .Where(t => t.EntityType == "Test")
                    .GroupBy(t => t.EntityKey)
                    .Select(g => {
                        var currentCount = g.Where(x => x.Date >= currentStart).Sum(x => x.Count);
                        var previousCount = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Count);
                        var currentRev = g.Where(x => x.Date >= currentStart).Sum(x => x.Revenue);
                        var previousRev = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Revenue);
                        return new TrendItemDto {
                            Key = g.Key,
                            Name = g.Key,
                            CurrentPeriodCount = currentCount,
                            PreviousPeriodCount = previousCount,
                            CountGrowthRate = previousCount == 0 ? (currentCount > 0 ? 100.0 : 0.0) : Math.Round(((double)(currentCount - previousCount) / previousCount) * 100, 2),
                            CurrentPeriodRevenue = currentRev,
                            PreviousPeriodRevenue = previousRev,
                            RevenueGrowthRate = previousRev == 0 ? (currentRev > 0 ? 100.0 : 0.0) : (double)Math.Round(((currentRev - previousRev) / previousRev) * 100, 2)
                        };
                    })
                    .OrderByDescending(x => x.CurrentPeriodCount)
                    .ToList();

                // Department trends
                dto.Departments = trendsData
                    .Where(t => t.EntityType == "Department")
                    .GroupBy(t => t.EntityKey)
                    .Select(g => {
                        var currentCount = g.Where(x => x.Date >= currentStart).Sum(x => x.Count);
                        var previousCount = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Count);
                        var currentRev = g.Where(x => x.Date >= currentStart).Sum(x => x.Revenue);
                        var previousRev = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Revenue);
                        return new TrendItemDto {
                            Key = g.Key,
                            Name = g.Key,
                            CurrentPeriodCount = currentCount,
                            PreviousPeriodCount = previousCount,
                            CountGrowthRate = previousCount == 0 ? (currentCount > 0 ? 100.0 : 0.0) : Math.Round(((double)(currentCount - previousCount) / previousCount) * 100, 2),
                            CurrentPeriodRevenue = currentRev,
                            PreviousPeriodRevenue = previousRev,
                            RevenueGrowthRate = previousRev == 0 ? (currentRev > 0 ? 100.0 : 0.0) : (double)Math.Round(((currentRev - previousRev) / previousRev) * 100, 2)
                        };
                    })
                    .OrderByDescending(x => x.CurrentPeriodCount)
                    .ToList();

                // Doctor trends
                dto.Doctors = trendsData
                    .Where(t => t.EntityType == "Doctor")
                    .GroupBy(t => t.EntityKey)
                    .Select(g => {
                        var currentCount = g.Where(x => x.Date >= currentStart).Sum(x => x.Count);
                        var previousCount = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Count);
                        var currentRev = g.Where(x => x.Date >= currentStart).Sum(x => x.Revenue);
                        var previousRev = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Revenue);
                        
                        doctorNames.TryGetValue(g.Key, out var docName);
                        var name = string.IsNullOrEmpty(docName) ? (g.Key == "Direct" ? "Self-Referral" : "Unknown Doctor") : docName;

                        return new TrendItemDto {
                            Key = g.Key,
                            Name = name,
                            CurrentPeriodCount = currentCount,
                            PreviousPeriodCount = previousCount,
                            CountGrowthRate = previousCount == 0 ? (currentCount > 0 ? 100.0 : 0.0) : Math.Round(((double)(currentCount - previousCount) / previousCount) * 100, 2),
                            CurrentPeriodRevenue = currentRev,
                            PreviousPeriodRevenue = previousRev,
                            RevenueGrowthRate = previousRev == 0 ? (currentRev > 0 ? 100.0 : 0.0) : (double)Math.Round(((currentRev - previousRev) / previousRev) * 100, 2)
                        };
                    })
                    .OrderByDescending(x => x.CurrentPeriodRevenue)
                    .ToList();

                // Referral partner trends
                dto.Partners = trendsData
                    .Where(t => t.EntityType == "ReferralPartner")
                    .GroupBy(t => t.EntityKey)
                    .Select(g => {
                        var currentCount = g.Where(x => x.Date >= currentStart).Sum(x => x.Count);
                        var previousCount = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Count);
                        var currentRev = g.Where(x => x.Date >= currentStart).Sum(x => x.Revenue);
                        var previousRev = g.Where(x => x.Date >= previousStart && x.Date < currentStart).Sum(x => x.Revenue);
                        
                        partnerNames.TryGetValue(g.Key, out var partName);
                        var name = string.IsNullOrEmpty(partName) ? (g.Key == "Direct" ? "Direct" : "Unknown Partner") : partName;

                        return new TrendItemDto {
                            Key = g.Key,
                            Name = name,
                            CurrentPeriodCount = currentCount,
                            PreviousPeriodCount = previousCount,
                            CountGrowthRate = previousCount == 0 ? (currentCount > 0 ? 100.0 : 0.0) : Math.Round(((double)(currentCount - previousCount) / previousCount) * 100, 2),
                            CurrentPeriodRevenue = currentRev,
                            PreviousPeriodRevenue = previousRev,
                            RevenueGrowthRate = previousRev == 0 ? (currentRev > 0 ? 100.0 : 0.0) : (double)Math.Round(((currentRev - previousRev) / previousRev) * 100, 2)
                        };
                    })
                    .OrderByDescending(x => x.CurrentPeriodRevenue)
                    .ToList();

                return Results.Ok(dto);
            })
            .WithName("GetTrends")
            .WithOpenApi();

            // 8. GET /api/controltower/demographics
            app.MapGet("/api/controltower/demographics", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                var rawFacts = await db.PatientDemographicFacts
                    .Where(f => f.LabId == resolvedLabId && f.Date >= start.Date && f.Date <= end.Date)
                    .ToListAsync();

                var data = rawFacts
                    .GroupBy(f => new { f.AgeGroup, f.Gender })
                    .Select(g => new DemographicMetricDto
                    {
                        AgeGroup = g.Key.AgeGroup,
                        Gender = g.Key.Gender,
                        PatientCount = g.Sum(x => x.PatientCount),
                        Revenue = g.Sum(x => x.Revenue),
                        TestCount = g.Sum(x => x.TestCount)
                    })
                    .ToList();

                return Results.Ok(new DemographicsSummaryDto { Metrics = data });
            })
            .WithName("GetDemographics")
            .WithOpenApi();

            // 9. GET /api/controltower/referrals
            app.MapGet("/api/controltower/referrals", async (HttpContext context, string? labId, DateTime? startDate, DateTime? endDate, MiddlewareDbContext db) =>
            {
                var resolvedLabId = GetLabId(context, labId);
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                var rawDoctors = await db.DoctorReferralFacts
                    .Where(f => f.LabId == resolvedLabId && f.Date >= start.Date && f.Date <= end.Date)
                    .ToListAsync();

                var doctors = rawDoctors
                    .GroupBy(f => new { f.DoctorId, f.DoctorName })
                    .Select(g => new DoctorReferralSummaryDto
                    {
                        DoctorId = g.Key.DoctorId,
                        DoctorName = g.Key.DoctorName,
                        PatientCount = g.Sum(x => x.PatientCount),
                        RevenueGenerated = g.Sum(x => x.RevenueGenerated),
                        TestCount = g.Sum(x => x.TestCount)
                    })
                    .OrderByDescending(x => x.RevenueGenerated)
                    .ToList();

                var rawPartners = await db.ReferralPartnerFacts
                    .Where(f => f.LabId == resolvedLabId && f.Date >= start.Date && f.Date <= end.Date)
                    .ToListAsync();

                var partners = rawPartners
                    .GroupBy(f => new { f.ReferralPartnerId, f.ReferralPartnerName, f.ReferralPartnerLocation })
                    .Select(g => new ReferralPartnerSummaryDto
                    {
                        PartnerId = g.Key.ReferralPartnerId,
                        PartnerName = g.Key.ReferralPartnerName,
                        PartnerLocation = g.Key.ReferralPartnerLocation,
                        PatientCount = g.Sum(x => x.PatientCount),
                        RevenueGenerated = g.Sum(x => x.RevenueGenerated),
                        TestCount = g.Sum(x => x.TestCount)
                    })
                    .OrderByDescending(x => x.RevenueGenerated)
                    .ToList();

                return Results.Ok(new ReferralsSummaryDto { Doctors = doctors, Partners = partners });
            })
            .WithName("GetReferrals")
            .WithOpenApi();
        }
    }
}
