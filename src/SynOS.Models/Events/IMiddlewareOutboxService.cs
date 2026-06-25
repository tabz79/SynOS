using System.Collections.Generic;

namespace SynOS.Models.Events
{
    public interface IMiddlewareOutboxService
    {
        void Enqueue(IDomainEvent domainEvent);
        IReadOnlyList<IDomainEvent> GetPendingEvents();
        void Clear();
    }
}
