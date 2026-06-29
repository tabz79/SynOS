using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Moq.Protected;
using TBZ.Middleware.Application.Core;
using TBZ.Middleware.Application.DTOs;
using TBZ.Middleware.Application.Interfaces;
using TBZ.Middleware.Application.Providers.WhatsApp;
using TBZ.Middleware.Application.Providers.WhatsApp.Services;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;
using TBZ.Middleware.Workers;
using Xunit;

namespace TBZ.Middleware.Tests
{
    public class NotificationEngineTests
    {
        private MiddlewareDbContext CreateInMemoryDbContext()
        {
            var connection = new SqliteConnection("Filename=:memory:");
            connection.Open();

            var options = new DbContextOptionsBuilder<MiddlewareDbContext>()
                .UseSqlite(connection)
                .Options;

            var context = new MiddlewareDbContext(options);
            context.Database.EnsureCreated();

            return context;
        }

        [Fact]
        public void TemplateRenderer_RendersBodyCorrectly()
        {
            // Arrange
            var renderer = new NotificationTemplateRenderer();
            var pattern = "Hello {PatientName}, your results for {LabName} are ready.";
            var variables = new Dictionary<string, string>
            {
                { "PatientName", "Alice" },
                { "LabName", "TBZ Labs" }
            };

            // Act
            var rendered = renderer.RenderBody(pattern, variables);

            // Assert
            Assert.Equal("Hello Alice, your results for TBZ Labs are ready.", rendered);
        }

        [Fact]
        public void TemplateRenderer_MapsPositionalParametersCorrectly()
        {
            // Arrange
            var renderer = new NotificationTemplateRenderer();
            var template = new NotificationTemplate
            {
                TemplateName = "test_template",
                VariableMappingsJson = JsonSerializer.Serialize(new List<string> { "PatientName", "DownloadLink" })
            };
            var variables = new Dictionary<string, string>
            {
                { "PatientName", "Alice" },
                { "DownloadLink", "http://download.url" }
            };

            // Act
            var parameters = renderer.MapPositionalParameters(template, variables);

            // Assert
            Assert.Equal(2, parameters.Length);
            Assert.Equal("Alice", parameters[0]);
            Assert.Equal("http://download.url", parameters[1]);
        }

        [Fact]
        public async Task NotificationService_Enqueue_CreatesCorrectDbRecords()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            var resolverMock = new Mock<INotificationProviderResolver>();
            var service = new NotificationService(db, resolverMock.Object);

            var request = new NotificationRequest
            {
                Recipient = "+1234567890",
                TemplateName = "report_ready",
                Variables = new Dictionary<string, string> { { "PatientName", "Alice" } },
                CorrelationId = "corr-123"
            };

            // Act
            await service.EnqueueNotificationAsync(request);

            // Assert
            var msg = await db.NotificationMessages.FirstOrDefaultAsync();
            Assert.NotNull(msg);
            Assert.Equal("+1234567890", msg.Recipient);
            Assert.Equal("WhatsApp", msg.Channel);
            Assert.Equal("report_ready", msg.TemplateName);
            Assert.Equal("corr-123", msg.CorrelationId);

            var outbox = await db.NotificationOutboxes.FirstOrDefaultAsync();
            Assert.NotNull(outbox);
            Assert.Equal(msg.Id, outbox.NotificationMessageId);
            Assert.Equal(NotificationStatus.Pending, outbox.Status);
        }

        [Fact]
        public async Task OutboxWorker_ProcessesPendingMessageCorrectly()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();

            var msg = new NotificationMessage
            {
                Id = Guid.NewGuid(),
                Channel = "WhatsApp",
                Recipient = "+1234567890",
                TemplateName = "report_ready",
                VariablesJson = JsonSerializer.Serialize(new Dictionary<string, string> { { "PatientName", "Alice" } })
            };
            db.NotificationMessages.Add(msg);

            var outbox = new NotificationOutbox
            {
                Id = Guid.NewGuid(),
                NotificationMessageId = msg.Id,
                Status = NotificationStatus.Pending,
                Attempts = 0,
                NextRetry = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };
            db.NotificationOutboxes.Add(outbox);
            await db.SaveChangesAsync();

            var providerMock = new Mock<INotificationProvider>();
            providerMock.Setup(p => p.Channel).Returns("WhatsApp");
            providerMock.Setup(p => p.SendAsync(It.IsAny<NotificationMessage>(), It.IsAny<Dictionary<string, string>>()))
                .ReturnsAsync(new ProviderSendResult
                {
                    Success = true,
                    MessageId = "wamid.123456",
                    ConversationId = "conv.111"
                });

            var resolverMock = new Mock<INotificationProviderResolver>();
            resolverMock.Setup(r => r.Resolve("WhatsApp")).Returns(providerMock.Object);

            var loggerMock = new Mock<Microsoft.Extensions.Logging.ILogger<NotificationOutboxWorker>>();
            var serviceProviderMock = new Mock<IServiceProvider>();

            var worker = new NotificationOutboxWorker(loggerMock.Object, serviceProviderMock.Object);

            // Act
            await worker.ProcessNextBatchAsync(db, resolverMock.Object, CancellationToken.None);

            // Assert
            var updatedOutbox = await db.NotificationOutboxes.FirstOrDefaultAsync();
            Assert.NotNull(updatedOutbox);
            Assert.Equal(NotificationStatus.Sent, updatedOutbox.Status);
            Assert.Null(updatedOutbox.LockedUntil);

            var updatedMsg = await db.NotificationMessages.FirstOrDefaultAsync();
            Assert.NotNull(updatedMsg);
            Assert.NotNull(updatedMsg.SentAt);
            Assert.Equal("wamid.123456", updatedMsg.MessageId);
            Assert.Equal("conv.111", updatedMsg.ConversationId);
        }
    }
}
