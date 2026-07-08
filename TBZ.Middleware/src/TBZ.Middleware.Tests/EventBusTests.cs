using System;
using System.Threading.Tasks;
using Xunit;
using TBZ.Middleware.Application.Core;
using TBZ.Middleware.Application.Events;

namespace TBZ.Middleware.Tests
{
    public class EventBusTests
    {
        [Fact]
        public async Task EventBus_Should_Publish_And_Trigger_Subscriber()
        {
            // Arrange
            var eventBus = new OperationalEventBus();
            var eventId = Guid.NewGuid();
            var labId = "LAB001";
            var triggered = false;
            HeartbeatReceivedEvent? receivedEvent = null;

            eventBus.Subscribe<HeartbeatReceivedEvent>(async @event =>
            {
                triggered = true;
                receivedEvent = @event;
                await Task.CompletedTask;
            });

            var testEvent = new HeartbeatReceivedEvent
            {
                EventId = eventId,
                LabId = labId,
                BranchId = Guid.NewGuid().ToString(),
                OccurredAt = DateTimeOffset.UtcNow,
                PayloadJson = "{}"
            };

            // Act
            await eventBus.PublishAsync(testEvent);

            // Assert
            Assert.True(triggered);
            Assert.NotNull(receivedEvent);
            Assert.Equal(eventId, receivedEvent.EventId);
            Assert.Equal(labId, receivedEvent.LabId);
        }

        [Fact]
        public async Task EventBus_Should_Not_Fail_When_No_Subscribers()
        {
            // Arrange
            var eventBus = new OperationalEventBus();
            var testEvent = new HeartbeatReceivedEvent
            {
                EventId = Guid.NewGuid(),
                LabId = "LAB002"
            };

            // Act & Assert (Should not throw exception)
            var exception = await Record.ExceptionAsync(async () => await eventBus.PublishAsync(testEvent));
            Assert.Null(exception);
        }
    }
}
