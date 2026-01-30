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
        private readonly ILogger<OperationalStatsProjectionWorker> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromSeconds(5);

        public OperationalStatsProjectionWorker(
            IServiceProvider serviceProvider,
            ILogger<OperationalStatsProjectionWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OperationalStatsProjectionWorker is starting. Interval: {Interval}s", _interval.TotalSeconds);

            bool isFirstRun = true;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var projector = scope.ServiceProvider.GetRequiredService<IOperationalStatsProjector>();
                        
                        if (isFirstRun)
                        {
                            _logger.LogInformation("Worker: Running Consistency Check...");
                            await projector.EnsureStateConsistencyAsync(stoppingToken);
                            isFirstRun = false;
                        }

                        // _logger.LogInformation("Worker: Projecting Events...");
                        await projector.ProjectPendingEventsAsync(stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while executing OperationalStatsProjectionWorker.");
                }

                await Task.Delay(_interval, stoppingToken);
            }

            _logger.LogInformation("OperationalStatsProjectionWorker is stopping.");
        }
    }
}
