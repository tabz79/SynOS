using System;

namespace SynOS.Models.Events
{
    public interface IDomainEvent
    {
        Guid EventId { get; }
        string EventType { get; }
        string AggregateType { get; }
        string AggregateId { get; }
        Guid? BranchId { get; }
        DateTime OccurredAt { get; }
        object Payload { get; }
    }
}
