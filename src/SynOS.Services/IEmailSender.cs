using SynOS.Models.DTOs.Notifications;

namespace SynOS.Services;

public interface IEmailSender
{
    Task<NotificationSendResult> SendAsync(string toEmail, EmailPayload payload);
}
