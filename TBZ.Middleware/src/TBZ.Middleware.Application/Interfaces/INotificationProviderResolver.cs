namespace TBZ.Middleware.Application.Interfaces
{
    public interface INotificationProviderResolver
    {
        INotificationProvider Resolve(string channel);
    }
}
