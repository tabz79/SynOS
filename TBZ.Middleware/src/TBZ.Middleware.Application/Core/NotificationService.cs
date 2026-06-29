using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using TBZ.Middleware.Application.DTOs;
using TBZ.Middleware.Application.Interfaces;
using TBZ.Middleware.Domain;

namespace TBZ.Middleware.Application.Core
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationDbContext _db;
        private readonly INotificationProviderResolver _providerResolver;

        public NotificationService(INotificationDbContext db, INotificationProviderResolver providerResolver)
        {
            _db = db;
            _providerResolver = providerResolver;
        }

        private string ResolveChannel(NotificationRequest request)
        {
            // V1 always resolves to "WhatsApp".
            // Future channels (Email, SMS, Push) can be integrated here based on preferences.
            return "WhatsApp";
        }

        public async Task<NotificationResult> SendAsync(NotificationRequest request)
        {
            try
            {
                var channel = ResolveChannel(request);
                var provider = _providerResolver.Resolve(channel);

                var message = new NotificationMessage
                {
                    Id = Guid.NewGuid(),
                    CorrelationId = request.CorrelationId,
                    Channel = channel,
                    Recipient = request.Recipient,
                    TemplateName = request.TemplateName,
                    VariablesJson = JsonSerializer.Serialize(request.Variables),
                    CreatedAt = DateTime.UtcNow
                };

                _db.NotificationMessages.Add(message);
                await _db.SaveChangesAsync();

                var sendResult = await provider.SendAsync(message, request.Variables);

                if (sendResult.Success)
                {
                    message.SentAt = DateTime.UtcNow;
                    message.MessageId = sendResult.MessageId;
                    message.ConversationId = sendResult.ConversationId;
                    await _db.SaveChangesAsync();

                    return new NotificationResult
                    {
                        Success = true,
                        NotificationMessageId = message.Id,
                        MessageId = sendResult.MessageId
                    };
                }

                message.FailedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                return new NotificationResult
                {
                    Success = false,
                    NotificationMessageId = message.Id,
                    ErrorMessage = sendResult.ErrorMessage
                };
            }
            catch (Exception ex)
            {
                return new NotificationResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task EnqueueNotificationAsync(NotificationRequest request)
        {
            var channel = ResolveChannel(request);

            var message = new NotificationMessage
            {
                Id = Guid.NewGuid(),
                LabId = request.LabId,
                CorrelationId = request.CorrelationId,
                Channel = channel,
                Recipient = request.Recipient,
                TemplateName = request.TemplateName,
                VariablesJson = JsonSerializer.Serialize(request.Variables),
                CreatedAt = DateTime.UtcNow
            };

            var outbox = new NotificationOutbox
            {
                Id = Guid.NewGuid(),
                LabId = request.LabId,
                NotificationMessageId = message.Id,
                Status = NotificationStatus.Pending,
                Attempts = 0,
                NextRetry = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.NotificationMessages.Add(message);
            _db.NotificationOutboxes.Add(outbox);
            await _db.SaveChangesAsync();
        }
    }
}
