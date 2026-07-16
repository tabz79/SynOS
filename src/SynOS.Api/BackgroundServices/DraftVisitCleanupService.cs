using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Enums;
using SynOS.Services;

namespace SynOS.Api.BackgroundServices
{
    public class DraftVisitCleanupService : BackgroundService
    {
        private readonly ILogger<DraftVisitCleanupService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IRestoreStateCoordinator _restoreStateCoordinator;

        public DraftVisitCleanupService(
            ILogger<DraftVisitCleanupService> logger,
            IServiceProvider serviceProvider,
            IRestoreStateCoordinator restoreStateCoordinator)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _restoreStateCoordinator = restoreStateCoordinator;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DraftVisitCleanupService is starting.");

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        if (!SynOS.Api.Services.SystemSetupState.IsConfigured)
                        {
                            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                            continue;
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }

                    if (_restoreStateCoordinator != null && _restoreStateCoordinator.IsRestoreInProgress)
                    {
                        _logger.LogInformation("Database restore in progress. Pausing DraftVisitCleanupService execution...");
                        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                        continue;
                    }

                    try
                    {
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                            var receptionFlowService = scope.ServiceProvider.GetRequiredService<IReceptionFlowService>();

                            // Find all draft or pending payment visits older than 24 hours
                            var cutoff = DateTime.UtcNow.AddHours(-24);
                            var oldDraftVisitIds = await context.Visits
                                .AsNoTracking()
                                .Where(v => (v.Status == VisitStatus.Draft || v.Status == VisitStatus.PendingPayment) && v.CreatedAt < cutoff)
                                .Select(v => v.VisitId)
                                .ToListAsync(stoppingToken);

                            if (oldDraftVisitIds.Any())
                            {
                                _logger.LogInformation("Found {Count} draft/pending payment visits older than 24 hours to auto-remove.", oldDraftVisitIds.Count);

                                foreach (var visitId in oldDraftVisitIds)
                                {
                                    try
                                    {
                                        await receptionFlowService.DeleteVisitAsync(visitId, Guid.Empty);
                                    }
                                    catch (Exception ex)
                                    {
                                        _logger.LogError(ex, "Failed to auto-remove draft visit {VisitId}", visitId);
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        _logger.LogError(ex, "An error occurred during draft visit cleanup.");
                    }

                    // Wait for 1 hour before running again
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected during host shutdown
            }

            _logger.LogInformation("DraftVisitCleanupService is stopping.");
        }
    }
}
