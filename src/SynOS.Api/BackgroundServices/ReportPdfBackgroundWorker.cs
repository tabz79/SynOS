using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Services;
using SynOS.Services.Operational;

namespace SynOS.Api.BackgroundServices
{
    public class ReportPdfBackgroundWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IOperationalEventChannel _eventChannel;
        private readonly ILogger<ReportPdfBackgroundWorker> _logger;

        public ReportPdfBackgroundWorker(
            IServiceProvider serviceProvider,
            IOperationalEventChannel eventChannel,
            ILogger<ReportPdfBackgroundWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _eventChannel = eventChannel;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ReportPdfBackgroundWorker starting in Event-Driven Mode.");

            try
            {
                await foreach (var eventId in _eventChannel.ReadAllAsync(stoppingToken))
                {
                    try
                    {
                        using var scope = _serviceProvider.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

                        var evt = await dbContext.BranchOperationalEvents
                            .AsNoTracking()
                            .FirstOrDefaultAsync(e => e.EventId == eventId, stoppingToken);

                        if (evt == null || evt.EventType != "REPORT_SIGNED")
                        {
                            continue;
                        }

                        Guid? reportId = evt.SourceId;
                        if (!reportId.HasValue && Guid.TryParse(evt.TokenId, out var parsedReportId))
                        {
                            reportId = parsedReportId;
                        }

                        if (!reportId.HasValue)
                        {
                            _logger.LogWarning("REPORT_SIGNED event {EventId} missing valid ReportId (SourceId/TokenId).", eventId);
                            continue;
                        }

                        _logger.LogInformation("PDF generation queued for ReportId: {ReportId} (EventId: {EventId})", reportId.Value, eventId);
                        _logger.LogInformation("PDF generation started for ReportId: {ReportId}", reportId.Value);

                        var reportService = scope.ServiceProvider.GetRequiredService<IReportService>();
                        await reportService.EnsureAndRenderReportPdfAsync(reportId.Value, forceReRender: false);

                        _logger.LogInformation("PDF generation completed for ReportId: {ReportId}", reportId.Value);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "PDF generation failed for ReportId: Event {EventId}. Exception: {Message}", eventId, ex.Message);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Graceful shutdown
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "ReportPdfBackgroundWorker encountered an unhandled exception.");
            }
        }
    }
}
