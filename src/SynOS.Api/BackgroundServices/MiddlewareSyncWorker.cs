using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Api.BackgroundServices
{
    public class MiddlewareSyncWorker : BackgroundService
    {
        private readonly ILogger<MiddlewareSyncWorker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly HttpClient _httpClient;
        private readonly string _apiUrl;
        private readonly string _apiKey;

        public MiddlewareSyncWorker(
            ILogger<MiddlewareSyncWorker> logger,
            IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _httpClient = new HttpClient();
            
            _apiUrl = configuration["Middleware:ApiUrl"] ?? "http://localhost:5000/api/events";
            _apiKey = configuration["Middleware:ApiKey"] ?? "LAB001_SECRET_API_KEY";
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("MiddlewareSyncWorker is starting. Target API: {ApiUrl}", _apiUrl);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SyncPendingEventsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during middleware event sync execution loop.");
                }

                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }

            _logger.LogInformation("MiddlewareSyncWorker is stopping.");
        }

        private async Task SyncPendingEventsAsync(CancellationToken stoppingToken)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

                // Fetch up to 100 pending or failed events ordered by CreatedAt
                var events = await dbContext.OutboxEvents
                    .Where(e => e.Status == "Pending" || e.Status == "Failed")
                    .OrderBy(e => e.CreatedAt)
                    .Take(100)
                    .ToListAsync(stoppingToken);

                if (events.Count == 0)
                {
                    return;
                }

                _logger.LogInformation("Found {Count} outbox events to sync.", events.Count);

                foreach (var evt in events)
                {
                    if (stoppingToken.IsCancellationRequested) break;

                    bool isSuccess = false;
                    try
                    {
                        var payload = new
                        {
                            eventId = evt.Id,
                            eventType = evt.EventType,
                            aggregateType = evt.AggregateType,
                            aggregateId = evt.AggregateId,
                            labId = evt.LabId,
                            branchId = evt.BranchId,
                            payloadJson = evt.PayloadJson,
                            occurredAt = evt.CreatedAt
                        };

                        var json = JsonSerializer.Serialize(payload);
                        var request = new HttpRequestMessage(HttpMethod.Post, _apiUrl)
                        {
                            Content = new StringContent(json, Encoding.UTF8, "application/json")
                        };

                        var pendingCount = await dbContext.OutboxEvents.CountAsync(e => e.Status == "Pending" || e.Status == "Failed", stoppingToken);
                        var deadLetterCount = await dbContext.OutboxEvents.CountAsync(e => e.Status == "DeadLetter", stoppingToken);

                        request.Headers.Add("X-Lab-Id", evt.LabId);
                        request.Headers.Add("X-Api-Key", _apiKey);
                        request.Headers.Add("X-Pending-Outbox-Count", pendingCount.ToString());
                        request.Headers.Add("X-Dead-Letter-Count", deadLetterCount.ToString());

                        _logger.LogInformation("[INTEGRATION DEB] Hop 1: OutboxWorker POST to /api/events. EventId: {EventId}, EventType: {EventType}", evt.Id, evt.EventType);
                        var response = await _httpClient.SendAsync(request, stoppingToken);

                        if (response.StatusCode == System.Net.HttpStatusCode.OK || 
                            response.StatusCode == System.Net.HttpStatusCode.AlreadyReported)
                        {
                            isSuccess = true;
                            _logger.LogInformation("[INTEGRATION DEB] Hop 1 Success: OutboxWorker POST completed successfully for Event {EventId} (Status: {Status}).", evt.Id, response.StatusCode);
                        }
                        else
                        {
                            _logger.LogWarning("[INTEGRATION DEB] Hop 1 Fail: Middleware API returned status code {StatusCode} for Event {EventId}.", response.StatusCode, evt.Id);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send Event {EventId} to Middleware API.", evt.Id);
                    }

                    if (isSuccess)
                    {
                        evt.Status = "Sent";
                        evt.SentAt = DateTime.UtcNow;
                    }
                    else
                    {
                        evt.RetryCount++;
                        if (evt.RetryCount > 50)
                        {
                            evt.Status = "DeadLetter";
                            _logger.LogError("Event {EventId} has exceeded max retries (50) and has been moved to Dead Letter Queue.", evt.Id);
                        }
                        else
                        {
                            evt.Status = "Failed";
                        }
                    }

                    // Save each event immediately to ensure exactly-once semantics/outbox checkpointing
                    await dbContext.SaveChangesAsync(stoppingToken);
                }
            }
        }
    }
}
