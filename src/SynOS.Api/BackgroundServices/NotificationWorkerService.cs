using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Enums;
using SynOS.Services;
using SynOS.Models.DTOs.Notifications;
using System.Text.Json; // For deserializing EmailPayload

namespace SynOS.Api.BackgroundServices;

public class NotificationWorkerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NotificationWorkerService> _logger;
    private readonly TimeSpan _pollingInterval = TimeSpan.FromMinutes(2); // Process every 2 minutes

    public NotificationWorkerService(IServiceProvider serviceProvider, ILogger<NotificationWorkerService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification Worker Service running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogDebug("Notification Worker Service checking for pending notifications.");
            await ProcessNotificationQueue(stoppingToken);

            try
            {
                await Task.Delay(_pollingInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Notification Worker Service stopping gracefully.");
                break;
            }
        }
    }

    private async Task ProcessNotificationQueue(CancellationToken stoppingToken)
    {
        using (var scope = _serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
            var whatsAppSender = scope.ServiceProvider.GetRequiredService<IWhatsAppSender>();
            var smsSender = scope.ServiceProvider.GetRequiredService<ISmsSender>();
            var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

            var pendingNotifications = await context.NotificationQueues
                .Where(nq => nq.Status == NotificationStatus.Pending &&
                             (nq.NextRetryAt == null || nq.NextRetryAt <= DateTimeOffset.UtcNow))
                .OrderBy(nq => nq.CreatedAt)
                .Take(50) // Process in batches
                .ToListAsync(stoppingToken);

            foreach (var notification in pendingNotifications)
            {
                if (stoppingToken.IsCancellationRequested) return;

                NotificationSendResult result;
                try
                {
                    result = notification.Type switch
                    {
                        NotificationType.SMS => await smsSender.SendAsync(notification.Recipient, notification.Content),
                        NotificationType.EMAIL => await SendEmailWithPayload(emailSender, notification.Recipient, notification.Content),
                        NotificationType.WHATSAPP => await whatsAppSender.SendAsync(notification.Recipient, notification.Content),
                        _ => new NotificationSendResult(false, null, $"Unsupported notification type: {notification.Type}", null)
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending notification {QueueId} of type {Type}", notification.QueueId, notification.Type);
                    result = new NotificationSendResult(false, null, ex.Message, null);
                }

                if (result.Success)
                {
                    notification.Status = NotificationStatus.Sent;
                    notification.SentAt = DateTimeOffset.UtcNow;
                    _logger.LogInformation("Notification {QueueId} ({Type}) sent successfully. ProviderMessageId: {ProviderMessageId}", notification.QueueId, notification.Type, result.ProviderMessageId);
                }
                else
                {
                    notification.RetryCount++;
                    notification.ErrorMessage = result.ErrorMessage;
                    _logger.LogWarning("Notification {QueueId} ({Type}) failed. Attempt {Attempt}/{MaxRetries}. Error: {Error}", notification.QueueId, notification.Type, notification.RetryCount, notification.MaxRetries, result.ErrorMessage);

                    if (notification.RetryCount >= notification.MaxRetries)
                    {
                        notification.Status = NotificationStatus.Failed;
                        _logger.LogError("Notification {QueueId} ({Type}) exhausted all retry attempts and failed permanently.", notification.QueueId, notification.Type);
                    }
                    else
                    {
                        notification.NextRetryAt = GetNextRetryTime(notification.RetryCount);
                        _logger.LogInformation("Notification {QueueId} ({Type}) will be retried at {NextRetryAt}", notification.QueueId, notification.Type, notification.NextRetryAt);
                    }
                }
                // Add delivery attempt log (optional, but good for detailed tracking)
                var deliveryAttempt = new DeliveryAttempt
                {
                    LogId = notification.TargetId, // This assumes TargetId is a DeliveryLog.LogId
                    Attempt = notification.RetryCount == 0 ? 1 : notification.RetryCount,
                    SentAt = DateTimeOffset.UtcNow,
                    Status = notification.Status,
                    ErrorMessage = notification.ErrorMessage,
                    ResponseData = result.RawResponseJson
                };
                context.DeliveryAttempts.Add(deliveryAttempt);
            }

            await context.SaveChangesAsync(stoppingToken);
        }
    }

    private async Task<NotificationSendResult> SendEmailWithPayload(IEmailSender emailSender, string recipient, string content)
    {
        try
        {
            var emailPayload = JsonSerializer.Deserialize<EmailPayload>(content);
            if (emailPayload == null)
            {
                _logger.LogError("Failed to deserialize EmailPayload for recipient {Recipient}", recipient);
                return new NotificationSendResult(false, null, "Failed to deserialize email payload.", null);
            }
            return await emailSender.SendAsync(recipient, emailPayload);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Json deserialization error for email content: {Content}", content);
            return new NotificationSendResult(false, null, $"Json deserialization error: {ex.Message}", null);
        }
    }

    private DateTimeOffset GetNextRetryTime(int retryCount)
    {
        return DateTimeOffset.UtcNow.AddMinutes(retryCount switch
        {
            1 => 1,
            2 => 5,
            3 => 15,
            _ => 30 // Default for more than 3 retries, or unknown
        });
    }
}
