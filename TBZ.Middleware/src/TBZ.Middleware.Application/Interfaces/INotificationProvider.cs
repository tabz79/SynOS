using System.Collections.Generic;
using System.Threading.Tasks;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Application.DTOs;

namespace TBZ.Middleware.Application.Interfaces
{
    public interface INotificationProvider
    {
        string Channel { get; } // "WhatsApp", "Email", "SMS", etc.
        Task<ProviderSendResult> SendAsync(NotificationMessage message, Dictionary<string, string> variables);
    }
}
