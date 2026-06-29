using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;

namespace TBZ.Middleware.Application.Interfaces
{
    public interface INotificationDbContext
    {
        DbSet<NotificationMessage> NotificationMessages { get; }
        DbSet<NotificationOutbox> NotificationOutboxes { get; }
        DbSet<NotificationTemplate> NotificationTemplates { get; }
        DbSet<NotificationWebhookEvent> NotificationWebhookEvents { get; }
        DbSet<NotificationInbox> NotificationInboxes { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
