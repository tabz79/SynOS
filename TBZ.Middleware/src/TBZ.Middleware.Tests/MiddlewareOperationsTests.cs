using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;
using Xunit;

namespace TBZ.Middleware.Tests
{
    public class MiddlewareOperationsTests
    {
        private MiddlewareDbContext GetDbContext()
        {
            var connection = new Microsoft.Data.Sqlite.SqliteConnection("Filename=:memory:");
            connection.Open();

            var options = new DbContextOptionsBuilder<MiddlewareDbContext>()
                .UseSqlite(connection)
                .Options;

            var context = new MiddlewareDbContext(options);
            context.Database.EnsureCreated();

            return context;
        }

        [Fact]
        public async Task CommandDirective_Lifecycle_Should_Advance_Correctly()
        {
            // Arrange
            using var db = GetDbContext();
            var command = new CommandDirective
            {
                Id = Guid.NewGuid(),
                LabId = "LAB001",
                CommandType = "RunDiagnostics",
                PayloadJson = "{}",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            db.CommandDirectives.Add(command);
            await db.SaveChangesAsync();

            // Assert Pending
            var saved = await db.CommandDirectives.FindAsync(command.Id);
            Assert.NotNull(saved);
            Assert.Equal("Pending", saved.Status);

            // Act Dispatch
            saved.Status = "Dispatched";
            saved.DispatchedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Assert Dispatched
            var dispatched = await db.CommandDirectives.FindAsync(command.Id);
            Assert.NotNull(dispatched);
            Assert.Equal("Dispatched", dispatched.Status);
            Assert.NotNull(dispatched.DispatchedAt);
        }

        [Fact]
        public async Task HealthSnapshot_Creation_Should_Persist_Fields()
        {
            // Arrange
            using var db = GetDbContext();
            var snapshot = new HealthSnapshot
            {
                Id = Guid.NewGuid(),
                LabId = "LAB001",
                Timestamp = DateTime.UtcNow,
                CpuUsagePercent = 25.4,
                MemoryUsageMB = 512.0,
                DiskFreeSpaceGB = 120.5,
                PendingOutboxCount = 3,
                DeadLetterCount = 1
            };

            // Act
            db.HealthSnapshots.Add(snapshot);
            await db.SaveChangesAsync();

            // Assert
            var saved = await db.HealthSnapshots.FindAsync(snapshot.Id);
            Assert.NotNull(saved);
            Assert.Equal(25.4, saved.CpuUsagePercent);
            Assert.Equal(3, saved.PendingOutboxCount);
        }
    }
}
