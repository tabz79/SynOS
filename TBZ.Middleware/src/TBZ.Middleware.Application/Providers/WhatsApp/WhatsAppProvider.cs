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

        public async Task<ProviderSendResult> SendAsync(NotificationMessage message, Dictionary<string, string> variables)
        {
            try
            {
                // Resolve the template pattern and language mappings
                var template = await _db.NotificationTemplates
                    .FirstOrDefaultAsync(t => t.TemplateName == message.TemplateName && t.Approved);

                var language = template?.Language ?? "en";
                var parameters = _templateRenderer.MapPositionalParameters(template!, variables);

                var sendResult = await _whatsAppService.SendTemplateAsync(message.Recipient, message.TemplateName, language, parameters);

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
