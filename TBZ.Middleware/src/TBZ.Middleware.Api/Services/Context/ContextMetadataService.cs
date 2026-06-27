using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services.Context
{
    public class ContextMetadataService
    {
        private readonly MiddlewareDbContext _db;

        public ContextMetadataService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<KnowledgeMetadataDto> GetMetadataAsync(string labId)
        {
            var earliestFact = await _db.DailyOperationsFacts
                .Where(f => f.LabId == labId)
                .OrderBy(f => f.Date)
                .Select(f => (DateTime?)f.Date)
                .FirstOrDefaultAsync();

            var latestFact = await _db.DailyOperationsFacts
                .Where(f => f.LabId == labId)
                .OrderByDescending(f => f.Date)
                .Select(f => (DateTime?)f.Date)
                .FirstOrDefaultAsync();

            var totalDays = await _db.DailyOperationsFacts
                .Where(f => f.LabId == labId)
                .Select(f => f.Date)
                .Distinct()
                .CountAsync();

            var totalPatients = await _db.DailyOperationsFacts
                .Where(f => f.LabId == labId)
                .SumAsync(f => f.PatientsRegistered);

            // Fetch projection checkpoints
            var checkpoints = await _db.ProjectionCheckpoints.ToListAsync();
            long maxSequence = checkpoints.Any() ? checkpoints.Max(c => c.LastProcessedSequence) : 0;
            var lastProjectionAt = checkpoints.Any() ? checkpoints.Max(c => c.UpdatedAt) : (DateTime?)null;

            var projectionStatus = "Up-to-date";
            if (lastProjectionAt.HasValue && (DateTime.UtcNow - lastProjectionAt.Value) > TimeSpan.FromMinutes(10))
            {
                projectionStatus = "Lagging";
            }

            var coverage = (earliestFact.HasValue && latestFact.HasValue)
                ? $"{earliestFact.Value:yyyy-MM-dd} to {latestFact.Value:yyyy-MM-dd}"
                : "No data available";

            return new KnowledgeMetadataDto
            {
                SchemaVersion = "1.1",
                GeneratedAt = DateTime.UtcNow,
                Source = "ProjectionFacts",
                ProjectionSequence = maxSequence,
                Coverage = coverage,
                AvailableSince = earliestFact,
                TotalDays = totalDays,
                TotalPatients = totalPatients,
                ProjectionStatus = projectionStatus,
                LastProjectionAt = lastProjectionAt,
                Capabilities = new ContextCapabilitiesDto()
            };
        }
    }
}
