using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Application.Interfaces;
using TBZ.Middleware.Domain;

namespace TBZ.Middleware.Workers
{
    public class NotificationOutboxWorker : BackgroundService
    {
        private readonly ILogger<NotificationOutboxWorker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly string _workerId;

        public NotificationOutboxWorker(
            ILogger<NotificationOutboxWorker> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _workerId = $"worker-{Guid.NewGuid():N}";
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Notification Outbox Worker {WorkerId} started.", _workerId);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<INotificationDbContext>();
                    var providerResolver = scope.ServiceProvider.GetRequiredService<INotificationProviderResolver>();

                    await ProcessNextBatchAsync(db, providerResolver, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Worker {WorkerId} encountered an error in execution loop.", _workerId);
                }

                await Task.Delay(5000, stoppingToken);
            }
        }

        public async Task ProcessNextBatchAsync(
            INotificationDbContext db,
            INotificationProviderResolver providerResolver,
            CancellationToken stoppingToken)
        {
            var now = DateTime.UtcNow;

            // Fetch and lock pending/retrying notifications
            var itemsToLock = await db.NotificationOutboxes
                .Include(o => o.NotificationMessage)
                .Where(o => (o.Status == NotificationStatus.Pending || o.Status == NotificationStatus.Failed)
                            && o.Attempts < 5
                            && (o.NextRetry == null || o.NextRetry <= now)
                            && (o.LockedUntil == null || o.LockedUntil <= now))
                .OrderBy(o => o.CreatedAt)
                .Take(10)
                .ToListAsync(stoppingToken);

            if (itemsToLock.Any())
            {
                _logger.LogInformation("Worker {WorkerId} locking {Count} outbox notifications for processing.", _workerId, itemsToLock.Count);

                foreach (var item in itemsToLock)
                {
                    item.Status = NotificationStatus.Sending;
                    item.LockedUntil = now.AddMinutes(2);
                    item.WorkerId = _workerId;
                    item.UpdatedAt = now;
                }
                await db.SaveChangesAsync(stoppingToken);

                foreach (var outboxItem in itemsToLock)
                {
                    try
                    {
                        var msg = outboxItem.NotificationMessage;
                        if (msg == null)
                        {
                            throw new InvalidOperationException("Notification message details are missing.");
                        }

                        var variables = new Dictionary<string, string>();
                        if (!string.IsNullOrEmpty(msg.VariablesJson))
                        {
                            variables = JsonSerializer.Deserialize<Dictionary<string, string>>(msg.VariablesJson) 
                                        ?? new Dictionary<string, string>();
                        }

                        _logger.LogInformation("Worker {WorkerId} dispatching notification {Id} via {Channel} to {Recipient}.", 
                            _workerId, outboxItem.Id, msg.Channel, msg.Recipient);

                        var provider = providerResolver.Resolve(msg.Channel);
                        var result = await provider.SendAsync(msg, variables);

                        if (result.Success)
                        {
                            outboxItem.Status = NotificationStatus.Sent;
                            outboxItem.LockedUntil = null;
                            outboxItem.WorkerId = null;
                            outboxItem.UpdatedAt = DateTime.UtcNow;

                            msg.SentAt = DateTime.UtcNow;
                            msg.MessageId = result.MessageId;
                            msg.ConversationId = result.ConversationId;
                            
                            _logger.LogInformation("Worker {WorkerId} successfully dispatched notification {Id}. Provider MessageId: {MessageId}.", 
                                _workerId, outboxItem.Id, result.MessageId);
                        }
                        else
                        {
                            throw new Exception(result.ErrorMessage ?? "Provider returned failure.");
                        }
                    }
                    catch (Exception ex)
                    {
                        outboxItem.Attempts++;
                        outboxItem.LastError = ex.Message;
                        outboxItem.LockedUntil = null;
                        outboxItem.WorkerId = null;
                        outboxItem.UpdatedAt = DateTime.UtcNow;

                        _logger.LogWarning(ex, "Worker {WorkerId} failed dispatch for outbox notification {Id} (Attempt {Count}/5).", 
                            _workerId, outboxItem.Id, outboxItem.Attempts);

                        if (outboxItem.Attempts >= 5)
                        {
                            outboxItem.Status = NotificationStatus.Failed;
                            if (outboxItem.NotificationMessage != null)
                            {
                                outboxItem.NotificationMessage.FailedAt = DateTime.UtcNow;
                            }
                        }
                        else
                        {
                            outboxItem.Status = NotificationStatus.Failed;
                            outboxItem.NextRetry = DateTime.UtcNow.AddSeconds(Math.Pow(2, outboxItem.Attempts));
                        }
                    }
                }

                await db.SaveChangesAsync(stoppingToken);
            }
        }
    }
}
