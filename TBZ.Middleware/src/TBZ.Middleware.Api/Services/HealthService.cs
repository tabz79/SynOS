using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Api.Endpoints;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class HealthService
    {
        private readonly MiddlewareDbContext _db;

        public HealthService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<HealthDto> GetAsync(string resolvedLabId)
        {
            // Live Lab Health metrics from in-memory cache populated via headers
            LabHealthCache.Metrics.TryGetValue(resolvedLabId, out var liveMetrics);

            // Last Event Received timestamp from StoredEvents (permitted explicitly for Health endpoint)
            var lastEventReceived = await _db.StoredEvents
                .Where(e => e.LabId == resolvedLabId)
                .OrderByDescending(e => e.Sequence)
                .Select(e => (DateTime?)e.ReceivedAt)
                .FirstOrDefaultAsync();

            // Health checks for each projection worker checkpoint
            var checkpoints = await _db.ProjectionCheckpoints.ToListAsync();
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

            return new HealthDto
            {
                LabId = resolvedLabId,
                PendingOutboxEvents = liveMetrics?.PendingOutboxCount ?? 0,
                DeadLetterEvents = liveMetrics?.DeadLetterCount ?? 0,
                LastEventReceived = lastEventReceived ?? liveMetrics?.LastEventReceivedAt,
                LastProjectionTime = lastProjectionTime,
                Workers = workersHealth
            };
        }
    }
}
