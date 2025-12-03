using SynOS.Models.DTOs.Notifications;

namespace SynOS.Services;

public interface ISmsSender
{
    Task<NotificationSendResult> SendAsync(string toPhone10Digits, string message);
}
