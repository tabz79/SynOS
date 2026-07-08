using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Services;
using Xunit;

namespace SynOS.Tests
{
    public class UpdateServiceTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new SynOSDbContext(options);
        }

        [Fact]
        public async Task RunPreflightChecks_Should_Pass_For_Valid_Manifest()
        {
            // Arrange
            using var db = GetDbContext();
            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<UpdateService>>();
            var diagMock = new Mock<IDiagnosticsService>();

            var service = new UpdateService(db, configMock.Object, loggerMock.Object, diagMock.Object);

            var manifest = new
            {
                TargetArchitecture = "x64",
                Prerequisites = new
                {
                    RequiredFreeSpaceBytes = 1000000 // 1 MB
                }
            };
            var manifestJson = JsonSerializer.Serialize(manifest);

            // Act
            var result = await service.RunPreflightChecksAsync(manifestJson);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task EvaluateMaintenanceWindow_Should_Defer_When_Active_Visits_Exist()
        {
            // Arrange
            using var db = GetDbContext();
            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<UpdateService>>();
            var diagMock = new Mock<IDiagnosticsService>();

            // Seed active visit
            db.Visits.Add(new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = Guid.NewGuid(),
                BranchId = Guid.NewGuid(),
                Status = SynOS.Models.Enums.VisitStatus.InLab,
                Token = "T101",
                Department = "Pathology"
            });
            await db.SaveChangesAsync();

            var service = new UpdateService(db, configMock.Object, loggerMock.Object, diagMock.Object);

            // Act
            var result = await service.EvaluateMaintenanceWindowAsync();

            // Assert
            Assert.False(result); // Should be deferred (return false) due to active visit
        }
    }
}
