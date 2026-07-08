using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SynOS.Services;

namespace SynOS.Api.BackgroundServices
{
    public class ExpiredLockCleanupService : BackgroundService
    {
        private readonly ILogger<ExpiredLockCleanupService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IRestoreStateCoordinator _restoreStateCoordinator;

        public ExpiredLockCleanupService(
            ILogger<ExpiredLockCleanupService> logger,
            IServiceProvider serviceProvider,
            IRestoreStateCoordinator restoreStateCoordinator)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _restoreStateCoordinator = restoreStateCoordinator;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ExpiredLockCleanupService is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                if (_restoreStateCoordinator != null && _restoreStateCoordinator.IsRestoreInProgress)
                {
                    _logger.LogInformation("Database restore in progress. Pausing ExpiredLockCleanupService execution...");
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                    continue;
                }

                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var editLockService = scope.ServiceProvider.GetRequiredService<IEditLockService>();
                        await editLockService.ExpireLocksAsync();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while expiring locks.");
                }

                // Wait for 1 minute before running again
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }

            _logger.LogInformation("ExpiredLockCleanupService is stopping.");
        }
    }
}
