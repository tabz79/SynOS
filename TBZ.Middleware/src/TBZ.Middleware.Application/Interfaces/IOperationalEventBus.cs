using System;
using System.Threading.Tasks;

namespace TBZ.Middleware.Application.Interfaces
{
    public interface IOperationalEventBus
    {
        void Subscribe<TEvent>(Func<TEvent, Task> handler) where TEvent : class;
        Task PublishAsync<TEvent>(TEvent @event) where TEvent : class;
    }
}
