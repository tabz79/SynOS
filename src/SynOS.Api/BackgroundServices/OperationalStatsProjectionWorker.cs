using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SynOS.Services.Operational;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace SynOS.Api.BackgroundServices
{
    public class OperationalStatsProjectionWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IOperationalEventChannel _eventChannel;
        private readonly ILogger<OperationalStatsProjectionWorker> _logger;

        public OperationalStatsProjectionWorker(
            IServiceProvider serviceProvider,
            IOperationalEventChannel eventChannel,
            ILogger<OperationalStatsProjectionWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _eventChannel = eventChannel;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OperationalStatsProjectionWorker is starting in Event-Driven Mode.");

            // 1. Initial State Consistency & Catch-Up (No Polling)
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var projector = scope.ServiceProvider.GetRequiredService<IOperationalStatsProjector>();
                    
                    _logger.LogInformation("Worker: Running Consistency Check and Catch-up...");
                    await projector.EnsureStateConsistencyAsync(stoppingToken);
                    await projector.ProjectPendingEventsAsync(stoppingToken); // Catch up on any events missed while offline
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during Worker consistency catch-up.");
            }

            _logger.LogInformation("Worker: Catch-up complete. Awaiting real-time events...");

            // 2. Event-Driven Real-Time Processing
            await foreach (var eventId in _eventChannel.ReadAllAsync(stoppingToken))
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var projector = scope.ServiceProvider.GetRequiredService<IOperationalStatsProjector>();
                        await projector.ProjectSingleEventAsync(eventId, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while projecting event {EventId}.", eventId);
                    // Do not crash the worker on a single event failure. The event remains in the DB for manual replay if needed.
                }
            }

            _logger.LogInformation("OperationalStatsProjectionWorker is stopping.");
        }
    }
}
