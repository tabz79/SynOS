using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SynOS.Data;
using SynOS.Services;
using Xunit;

namespace SynOS.Tests
{
    public class SupportServiceTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new SynOSDbContext(options);
        }

        [Fact]
        public async Task CreateTicket_Should_Queue_SupportTicketCreated_Outbox_Event()
        {
            // Arrange
            using var db = GetDbContext();
            var diagMock = new Mock<IDiagnosticsService>();
            var loggerMock = new Mock<ILogger<SupportService>>();

            var service = new SupportService(db, diagMock.Object, loggerMock.Object);

            var title = "Disk Space Critical";
            var desc = "D: drive is above 95% capacity";
            var priority = "Critical";
            var category = "Performance";

            // Act
            var ticketId = await service.CreateTicketAsync(title, desc, priority, category);

            // Assert
            var outboxEvent = await db.OutboxEvents.FirstOrDefaultAsync(e => e.AggregateId == ticketId.ToString());
            Assert.NotNull(outboxEvent);
            Assert.Equal("SupportTicketCreated", outboxEvent.EventType);
            Assert.Equal("Support", outboxEvent.AggregateType);

            using var doc = JsonDocument.Parse(outboxEvent.PayloadJson);
            var root = doc.RootElement;
            Assert.Equal(ticketId.ToString(), root.GetProperty("TicketId").GetString());
            Assert.Equal(title, root.GetProperty("Title").GetString());
            Assert.Equal(priority, root.GetProperty("Priority").GetString());
        }
    }
}
