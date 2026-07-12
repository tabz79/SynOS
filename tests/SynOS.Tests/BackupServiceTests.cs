using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SynOS.Data;
using SynOS.Services;
using Xunit;

namespace SynOS.Tests
{
    public class BackupServiceTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new SynOSDbContext(options);
        }

        [Fact]
        public async Task ExecuteBackup_Should_Create_Encrypted_Backup_File()
        {
            // Arrange
            using var db = GetDbContext();
            var configMock = new Mock<IConfiguration>();
            configMock.Setup(c => c["FileStorage:BasePath"]).Returns("C:\\SynOS_Files");
            configMock.Setup(c => c["Inventory:ValuationMethod"]).Returns("FIFO");
            configMock.Setup(c => c["Backup:EncryptionKey"]).Returns("TBZ-BACKUP-KEY-12345-67890");
            
            var sectionMock = new Mock<IConfigurationSection>();
            sectionMock.Setup(s => s.Value).Returns("true");
            configMock.Setup(c => c.GetSection("Features:ReferralEconomics:Enabled")).Returns(sectionMock.Object);

            var loggerMock = new Mock<ILogger<BackupService>>();

            var service = new BackupService(db, configMock.Object, loggerMock.Object);

            // Act
            var backupId = await service.ExecuteBackupAsync("Full");

            // Assert
            var baseDir = AppContext.BaseDirectory;
            var backupFilePath = Path.Combine(baseDir, "Backups", $"backup_{backupId}.zip.enc");
            
            Assert.True(File.Exists(backupFilePath));

            // Clean up
            try
            {
                if (File.Exists(backupFilePath)) File.Delete(backupFilePath);
            }
            catch {}
        }

        [Fact]
        public async Task VerifyBackup_Should_Pass_For_Newly_Created_Backup()
        {
            // Arrange
            using var db = GetDbContext();
            var configMock = new Mock<IConfiguration>();
            configMock.Setup(c => c["FileStorage:BasePath"]).Returns("C:\\SynOS_Files");
            configMock.Setup(c => c["Inventory:ValuationMethod"]).Returns("FIFO");
            configMock.Setup(c => c["Backup:EncryptionKey"]).Returns("TBZ-BACKUP-KEY-12345-67890");
            
            var sectionMock = new Mock<IConfigurationSection>();
            sectionMock.Setup(s => s.Value).Returns("true");
            configMock.Setup(c => c.GetSection("Features:ReferralEconomics:Enabled")).Returns(sectionMock.Object);

            var loggerMock = new Mock<ILogger<BackupService>>();

            var service = new BackupService(db, configMock.Object, loggerMock.Object);

            var backupId = await service.ExecuteBackupAsync("Full");
            var baseDir = AppContext.BaseDirectory;
            var backupFilePath = Path.Combine(baseDir, "Backups", $"backup_{backupId}.zip.enc");

            // Act
            var verifyResult = await service.VerifyBackupAsync(backupId, backupFilePath);

            // Assert
            Assert.True(verifyResult);

            // Clean up
            try
            {
                if (File.Exists(backupFilePath)) File.Delete(backupFilePath);
            }
            catch {}
        }
    }
}
