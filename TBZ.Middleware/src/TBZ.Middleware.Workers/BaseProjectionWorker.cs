using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public abstract class BaseProjectionWorker : BackgroundService
    {
        private readonly ILogger _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IProjectionHandler _handler;

        protected BaseProjectionWorker(
            ILogger logger, 
            IServiceProvider serviceProvider, 
            IProjectionHandler handler)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _handler = handler;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Projection Worker {WorkerName} starting...", _handler.ProjectionName);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<MiddlewareDbContext>();

                    // 1. Get current checkpoint sequence
                    var checkpoint = await db.ProjectionCheckpoints.FindAsync(_handler.ProjectionName);
                    long lastSequence = checkpoint?.LastProcessedSequence ?? 0;

                    // 2. Fetch a batch of 100 new events ordered by Sequence ascending
                    var events = await db.StoredEvents
                        .Where(e => e.Sequence > lastSequence)
                        .OrderBy(e => e.Sequence)
                        .Take(100)
                        .ToListAsync(stoppingToken);

                    if (events.Count > 0)
                    {
                        _logger.LogInformation("Worker {WorkerName} processing {Count} events starting from sequence {Sequence}...", 
                            _handler.ProjectionName, events.Count, lastSequence);

                        long maxSequence = lastSequence;

                        foreach (var evt in events)
                        {
                            await _handler.ProjectEventAsync(evt, db);
                            maxSequence = Math.Max(maxSequence, evt.Sequence);
                        }

                        // 3. Update checkpoint
                        if (checkpoint == null)
                        {
                            db.ProjectionCheckpoints.Add(new ProjectionCheckpoint
                            {
                                ProjectionName = _handler.ProjectionName,
                                LastProcessedSequence = maxSequence,
                                UpdatedAt = DateTime.UtcNow
                            });
                        }
                        else
                        {
                            checkpoint.LastProcessedSequence = maxSequence;
                            checkpoint.UpdatedAt = DateTime.UtcNow;
                            db.Entry(checkpoint).State = EntityState.Modified;
                        }

                        // 4. Save inside database transaction
                        await db.SaveChangesAsync(stoppingToken);
                        
                        _logger.LogInformation("Worker {WorkerName} advanced checkpoint to sequence {Sequence}.", 
                            _handler.ProjectionName, maxSequence);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error executing projection step for Worker {WorkerName}.", _handler.ProjectionName);
                }

                // Poll every 2 seconds
                await Task.Delay(2000, stoppingToken);
            }

            _logger.LogInformation("Projection Worker {WorkerName} stopped.", _handler.ProjectionName);
        }
    }
}
