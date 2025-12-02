using SynOS.Models.DTOs.Notifications;

namespace SynOS.Services;

public interface IWhatsAppSender
{
    Task<NotificationSendResult> SendAsync(string toPhone10Digits, string message);
}
