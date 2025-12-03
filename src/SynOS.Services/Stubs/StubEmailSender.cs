using SynOS.Models.DTOs.Notifications;
using Microsoft.Extensions.Logging;

namespace SynOS.Services.Stubs;

public class StubEmailSender : IEmailSender
{
    private readonly ILogger<StubEmailSender> _logger;

    public StubEmailSender(ILogger<StubEmailSender> logger)
    {
        _logger = logger;
    }

    public Task<NotificationSendResult> SendAsync(string toEmail, EmailPayload payload)
    {
        _logger.LogInformation("STUB: Sending Email to {Email} with Subject: {Subject}", toEmail, payload.Subject);
        return Task.FromResult(new NotificationSendResult(true, "STUB_EMAIL_MSG_ID_789", null, "{ \"status\": \"sent\" }"));
    }
}