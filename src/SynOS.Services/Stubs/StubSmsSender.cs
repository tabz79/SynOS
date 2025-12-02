using SynOS.Models.DTOs.Notifications;
using Microsoft.Extensions.Logging;

namespace SynOS.Services.Stubs;

public class StubSmsSender : ISmsSender
{
    private readonly ILogger<StubSmsSender> _logger;

    public StubSmsSender(ILogger<StubSmsSender> logger)
    {
        _logger = logger;
    }

    public Task<NotificationSendResult> SendAsync(string toPhone10Digits, string message)
    {
        _logger.LogInformation("STUB: Sending SMS to {Phone}: {Message}", toPhone10Digits, message);
        return Task.FromResult(new NotificationSendResult(true, "STUB_SMS_MSG_ID_456", null, "{ \"status\": \"sent\" }"));
    }
}
