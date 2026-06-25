using System;
using System.Collections.Generic;

namespace SynOS.Models.Events
{
    public class MiddlewareOutboxService : IMiddlewareOutboxService
    {
        private readonly List<IDomainEvent> _events = new();

        public void Enqueue(IDomainEvent domainEvent)
        {
            if (domainEvent == null) return;
            _events.Add(domainEvent);
        }

        public IReadOnlyList<IDomainEvent> GetPendingEvents()
        {
            return _events;
        }

        public void Clear()
        {
            _events.Clear();
        }
    }

    public class NullMiddlewareOutboxService : IMiddlewareOutboxService
    {
        public void Enqueue(IDomainEvent domainEvent) { }
        public IReadOnlyList<IDomainEvent> GetPendingEvents() => Array.Empty<IDomainEvent>();
        public void Clear() { }
    }
}
