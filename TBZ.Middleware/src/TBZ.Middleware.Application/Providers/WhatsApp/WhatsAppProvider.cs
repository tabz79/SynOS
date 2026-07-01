using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Application.Core;
using TBZ.Middleware.Application.DTOs;
using TBZ.Middleware.Application.Interfaces;
using TBZ.Middleware.Domain;

namespace TBZ.Middleware.Application.Providers.WhatsApp
{
    public class WhatsAppProvider : INotificationProvider
    {
        private readonly IWhatsAppService _whatsAppService;
        private readonly INotificationDbContext _db;
        private readonly NotificationTemplateRenderer _templateRenderer;

        public WhatsAppProvider(
            IWhatsAppService whatsAppService,
            INotificationDbContext db,
            NotificationTemplateRenderer templateRenderer)
        {
            _whatsAppService = whatsAppService;
            _db = db;
            _templateRenderer = templateRenderer;
        }

        public string Channel => "WhatsApp";

        private string FormatToE164(string phone)
        {
            if (string.IsNullOrEmpty(phone)) return phone;
            var cleaned = new string(System.Linq.Enumerable.ToArray(System.Linq.Enumerable.Where(phone, char.IsDigit)));
            if (cleaned.Length == 10)
            {
                return "91" + cleaned;
            }
            return cleaned;
        }

        public async Task<ProviderSendResult> SendAsync(NotificationMessage message, Dictionary<string, string> variables)
        {
            try
            {
                var recipient = FormatToE164(message.Recipient);

                var template = await _db.NotificationTemplates
                    .FirstOrDefaultAsync(t => t.TemplateName == message.TemplateName && t.Approved);

                if (template == null)
                {
                    throw new InvalidOperationException($"Notification template '{message.TemplateName}' is not configured.");
                }

                var apiTemplateName = template.TemplateName;
                var apiLanguage = template.Language ?? "en";
                var parameters = _templateRenderer.MapPositionalParameters(template, variables);

                var sendResult = await _whatsAppService.SendTemplateAsync(recipient, apiTemplateName, apiLanguage, parameters);

                return new ProviderSendResult
                {
                    Success = sendResult.Success,
                    MessageId = sendResult.MessageId,
                    ConversationId = sendResult.ConversationId,
                    ErrorMessage = sendResult.ErrorMessage,
                    RawPayload = sendResult.RawResponse
                };
            }
            catch (Exception ex)
            {
                return new ProviderSendResult
                {
                    Success = false,
                    ErrorMessage = $"WhatsAppProvider exception: {ex.Message}"
                };
            }
        }
    }
}
