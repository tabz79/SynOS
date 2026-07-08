using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SynOS.Services.Operational;
using SynOS.Services;
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
        private readonly IRestoreStateCoordinator _restoreStateCoordinator;

        public OperationalStatsProjectionWorker(
            IServiceProvider serviceProvider,
            IOperationalEventChannel eventChannel,
            ILogger<OperationalStatsProjectionWorker> logger,
            IRestoreStateCoordinator restoreStateCoordinator)
        {
            _serviceProvider = serviceProvider;
            _eventChannel = eventChannel;
            _logger = logger;
            _restoreStateCoordinator = restoreStateCoordinator;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OperationalStatsProjectionWorker is starting in Event-Driven Mode.");

            // Wait if database restore is in progress before doing initial catch-up
            while (_restoreStateCoordinator != null && _restoreStateCoordinator.IsRestoreInProgress)
            {
                _logger.LogInformation("Database restore in progress. Pausing OperationalStatsProjectionWorker initial catch-up...");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }

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
            catch (OperationCanceledException)
            {
                // Expected during shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during Worker consistency catch-up.");
            }

            _logger.LogInformation("Worker: Catch-up complete. Awaiting real-time events...");

            try
            {
                // 2. Event-Driven Real-Time Processing
                await foreach (var eventId in _eventChannel.ReadAllAsync(stoppingToken))
                {
                    // Wait if database restore is in progress before projecting the event
                    while (_restoreStateCoordinator != null && _restoreStateCoordinator.IsRestoreInProgress)
                    {
                        _logger.LogInformation("Database restore in progress. Pausing OperationalStatsProjectionWorker event processing...");
                        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                    }

                    try
                    {
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            var projector = scope.ServiceProvider.GetRequiredService<IOperationalStatsProjector>();
                            await projector.ProjectSingleEventAsync(eventId, stoppingToken);
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        // Expected during shutdown
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error occurred while projecting event {EventId}.", eventId);
                        // Do not crash the worker on a single event failure. The event remains in the DB for manual replay if needed.
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Expected during host shutdown
            }

            _logger.LogInformation("OperationalStatsProjectionWorker is stopping.");
        }
    }
}
