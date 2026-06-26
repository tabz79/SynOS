using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class DashboardService
    {
        private readonly MiddlewareDbContext _db;
        private readonly OperationalService _operationalService;
        private readonly BusinessService _businessService;
        private readonly IntelligenceService _intelligenceService;

        public DashboardService(
            MiddlewareDbContext db,
            OperationalService operationalService,
            BusinessService businessService,
            IntelligenceService intelligenceService)
        {
            _db = db;
            _operationalService = operationalService;
            _businessService = businessService;
            _intelligenceService = intelligenceService;
        }

        public async Task<DashboardDto> GetDashboardAsync(
            string resolvedLabId,
            string? branchId,
            DateTime? date,
            DateTime? startDate,
            DateTime? endDate,
            int? trendDays)
        {
            var targetDate = date ?? DateTime.UtcNow;
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            // Compute Metadata
            // 1. Last Event Received timestamp from StoredEvents
            var lastEventReceived = await _db.StoredEvents
                .Where(e => e.LabId == resolvedLabId)
                .OrderByDescending(e => e.Sequence)
                .Select(e => (DateTime?)e.ReceivedAt)
                .FirstOrDefaultAsync();

            // 2. Health checks for each projection worker checkpoint to determine ProjectionStatus
            var checkpoints = await _db.ProjectionCheckpoints.ToListAsync();
            var allHealthy = checkpoints.Count > 0 && checkpoints.All(c => (DateTime.UtcNow - c.UpdatedAt) < TimeSpan.FromMinutes(5));
            var projectionStatus = allHealthy ? "Up-to-date" : "Syncing";

            var metadata = new DashboardMetadataDto
            {
                GeneratedAt = DateTime.UtcNow,
                LabId = resolvedLabId,
                BranchId = branchId,
                TimeRange = $"{start:yyyy-MM-dd} to {end:yyyy-MM-dd}",
                ProjectionStatus = projectionStatus,
                LastEventReceived = lastEventReceived
            };

            // Call sections in parallel
            var operationalTask = _operationalService.GetAsync(resolvedLabId, branchId, targetDate, start, end);
            var businessTask = _businessService.GetAsync(resolvedLabId, start, end);
            var intelligenceTask = _intelligenceService.GetAsync(resolvedLabId, start, end, trendDays);

            await Task.WhenAll(operationalTask, businessTask, intelligenceTask);

            return new DashboardDto
            {
                Metadata = metadata,
                Operational = await operationalTask,
                Business = await businessTask,
                Intelligence = await intelligenceTask
            };
        }
    }
}
