using System.Threading.Tasks;
using TBZ.Middleware.Application.DTOs;

namespace TBZ.Middleware.Application.Interfaces
{
    public interface INotificationService
    {
        Task<NotificationResult> SendAsync(NotificationRequest request);
        Task EnqueueNotificationAsync(NotificationRequest request);
    }
}
