using SynOS.Models.DTOs.Notifications;
using Microsoft.Extensions.Logging;

namespace SynOS.Services.Stubs;

public class StubWhatsAppSender : IWhatsAppSender
{
    private readonly ILogger<StubWhatsAppSender> _logger;

    public StubWhatsAppSender(ILogger<StubWhatsAppSender> logger)
    {
        _logger = logger;
    }

    public Task<NotificationSendResult> SendAsync(string toPhone10Digits, string message)
    {
        _logger.LogInformation("STUB: Sending WhatsApp to {Phone}: {Message}", toPhone10Digits, message);
        return Task.FromResult(new NotificationSendResult(true, "STUB_WA_MSG_ID_123", null, "{ \"status\": \"sent\" }"));
    }
}
