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
            var backupMock = new Mock<IBackupService>();
            var keystoreMock = new Mock<ITrustedKeyStore>();

            var service = new UpdateService(
                db, 
                configMock.Object, 
                loggerMock.Object, 
                diagMock.Object, 
                backupMock.Object, 
                keystoreMock.Object);

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
    }
}
