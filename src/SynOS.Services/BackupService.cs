using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Data.SqlClient;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class BackupService : IBackupService
    {
        private readonly SynOSDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BackupService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IRestoreStateCoordinator _restoreStateCoordinator;

        public BackupService(
            SynOSDbContext context,
            IConfiguration configuration,
            ILogger<BackupService> logger)
            : this(context, configuration, logger, null, null)
        {
        }

        public BackupService(
            SynOSDbContext context,
            IConfiguration configuration,
            ILogger<BackupService> logger,
            IServiceProvider serviceProvider,
            IRestoreStateCoordinator restoreStateCoordinator)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _serviceProvider = serviceProvider;
            _restoreStateCoordinator = restoreStateCoordinator;
        }

        public async Task<Guid> ExecuteBackupAsync(string backupType)
        {
            var backupId = Guid.NewGuid();
            _logger.LogInformation("Executing database backup {BackupId} (Type: {BackupType})...", backupId, backupType);

            var totalSw = Stopwatch.StartNew();
            var backupSw = new Stopwatch();
            var compressSw = new Stopwatch();
            var encryptSw = new Stopwatch();

            var databaseName = "SynOSDb";
            if (_context.Database.IsRelational())
            {
                var connStr = _context.Database.GetDbConnection().ConnectionString;
                var connBuilder = new SqlConnectionStringBuilder(connStr);
                databaseName = connBuilder.InitialCatalog;
            }

            await PublishEventAsync("BackupStarted", backupId, new
            {
                BackupId = backupId,
                BackupType = backupType,
                DatabaseName = databaseName,
                StartedAt = DateTime.UtcNow
            });

            var baseDir = AppContext.BaseDirectory;
            var tempStagingPath = Path.Combine(baseDir, $"temp_backup_{backupId}");
            Directory.CreateDirectory(tempStagingPath);

            try
            {
                // 1. Resolve Physical Database Path and DB Size
                var mdfPath = "";
                long databaseSize = 0;
                string schemaVersion = "Initial";

                if (_context.Database.IsRelational())
                {
                    using (var command = _context.Database.GetDbConnection().CreateCommand())
                    {
                        command.CommandText = "SELECT physical_name FROM sys.database_files WHERE type = 0";
                        var wasOpen = _context.Database.GetDbConnection().State == System.Data.ConnectionState.Open;
                        if (!wasOpen) await _context.Database.OpenConnectionAsync();
                        try
                        {
                            mdfPath = (string?)await command.ExecuteScalarAsync() ?? "";
                        }
                        finally
                        {
                            if (!wasOpen) await _context.Database.CloseConnectionAsync();
                        }
                    }

                    if (!string.IsNullOrEmpty(mdfPath) && File.Exists(mdfPath))
                    {
                        databaseSize = new FileInfo(mdfPath).Length;
                    }

                    var migrations = await _context.Database.GetAppliedMigrationsAsync();
                    schemaVersion = migrations.LastOrDefault() ?? "Initial";
                }
                else
                {
                    mdfPath = "InMemoryDatabase";
                    databaseSize = 0;
                    schemaVersion = "InMemoryTestVersion";
                }

                // 2. Export config snapshot
                var configSnapshot = new
                {
                    FileStorageBasePath = _configuration["FileStorage:BasePath"] ?? "C:\\SynOS_Files",
                    InventoryValuationMethod = _configuration["Inventory:ValuationMethod"] ?? "FIFO",
                    FeaturesReferralEconomics = _configuration.GetValue<bool>("Features:ReferralEconomics:Enabled")
                };
                await File.WriteAllTextAsync(Path.Combine(tempStagingPath, "configurations.json"), JsonSerializer.Serialize(configSnapshot, new JsonSerializerOptions { WriteIndented = true }));

                // 3. Execute SQL Server BACKUP DATABASE (WITH INIT, COMPRESSION, CHECKSUM)
                var dbSnapshotFile = Path.Combine(tempStagingPath, "database_snapshot.bak");
                backupSw.Start();

                if (_context.Database.IsRelational())
                {
                    _logger.LogInformation("Backing up SQL Server database {DatabaseName} to {Path}...", databaseName, dbSnapshotFile);
                    var backupSql = $"BACKUP DATABASE [{databaseName}] TO DISK = @path WITH INIT, COMPRESSION, CHECKSUM";
                    try
                    {
                        using (var command = _context.Database.GetDbConnection().CreateCommand())
                        {
                            command.CommandText = backupSql;
                            var pathParam = command.CreateParameter();
                            pathParam.ParameterName = "@path";
                            pathParam.Value = dbSnapshotFile;
                            command.Parameters.Add(pathParam);

                            var wasOpen = _context.Database.GetDbConnection().State == System.Data.ConnectionState.Open;
                            if (!wasOpen) await _context.Database.OpenConnectionAsync();
                            try
                            {
                                await command.ExecuteNonQueryAsync();
                            }
                            finally
                            {
                                if (!wasOpen) await _context.Database.CloseConnectionAsync();
                            }
                        }
                    }
                    catch (SqlException ex) when (ex.Number == 1844 || ex.Message.Contains("COMPRESSION") || ex.Message.Contains("supported"))
                    {
                        _logger.LogWarning("SQL Server backup with COMPRESSION is not supported on this edition. Retrying without COMPRESSION...");
                        backupSql = $"BACKUP DATABASE [{databaseName}] TO DISK = @path WITH INIT, CHECKSUM";
                        using (var command = _context.Database.GetDbConnection().CreateCommand())
                        {
                            command.CommandText = backupSql;
                            var pathParam = command.CreateParameter();
                            pathParam.ParameterName = "@path";
                            pathParam.Value = dbSnapshotFile;
                            command.Parameters.Add(pathParam);

                            var wasOpen = _context.Database.GetDbConnection().State == System.Data.ConnectionState.Open;
                            if (!wasOpen) await _context.Database.OpenConnectionAsync();
                            try
                            {
                                await command.ExecuteNonQueryAsync();
                            }
                            finally
                            {
                                if (!wasOpen) await _context.Database.CloseConnectionAsync();
                            }
                        }
                    }
                    backupSw.Stop();

                    // 4. Verify the SQL backup using RESTORE VERIFYONLY
                    _logger.LogInformation("Verifying backup structure via RESTORE VERIFYONLY...");
                    var verifySql = "RESTORE VERIFYONLY FROM DISK = @path";
                    using (var command = _context.Database.GetDbConnection().CreateCommand())
                    {
                        command.CommandText = verifySql;
                        var pathParam = command.CreateParameter();
                        pathParam.ParameterName = "@path";
                        pathParam.Value = dbSnapshotFile;
                        command.Parameters.Add(pathParam);

                        var wasOpen = _context.Database.GetDbConnection().State == System.Data.ConnectionState.Open;
                        if (!wasOpen) await _context.Database.OpenConnectionAsync();
                        try
                        {
                            await command.ExecuteNonQueryAsync();
                        }
                        finally
                        {
                            if (!wasOpen) await _context.Database.CloseConnectionAsync();
                        }
                    }
                }
                else
                {
                    var dbData = new
                    {
                        SnapshotTime = DateTime.UtcNow,
                        VisitsCount = await _context.Visits.CountAsync(),
                        ReportsCount = await _context.Reports.CountAsync()
                    };
                    await File.WriteAllTextAsync(dbSnapshotFile, JsonSerializer.Serialize(dbData));
                    backupSw.Stop();
                }

                // 5. Compute SHA-256 Checksum of the database snapshot file
                string checksum;
                using (var sha256 = SHA256.Create())
                {
                    using (var fs = File.OpenRead(dbSnapshotFile))
                    {
                        var hash = await sha256.ComputeHashAsync(fs);
                        checksum = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
                    }
                }

                var appVersion = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "1.2.0";
                var labProfile = await _context.LabProfiles.FirstOrDefaultAsync();
                var labId = labProfile?.LabProfileId.ToString() ?? _configuration["Lab:Identifier"] ?? "LAB001";
                long backupFileSize = new FileInfo(dbSnapshotFile).Length;

                // 6. Save manifest metadata containing the checksum and duration telemetry
                var manifest = new
                {
                    BackupId = backupId,
                    BackupVersion = "1.0",
                    GeneratedAt = DateTime.UtcNow,
                    GeneratedBy = $"SynOS {appVersion}",
                    BackupType = backupType,
                    DatabaseVersion = _context.Database.IsRelational() ? "Microsoft SQL Server LocalDB" : "InMemory Test Database",
                    SchemaVersion = schemaVersion,
                    EncryptionVersion = "AES-256-CBC-v1",
                    Checksum = checksum,
                    LabId = labId,
                    DatabaseSize = databaseSize,
                    BackupSize = backupFileSize,
                    Durations = new
                    {
                        BackupDurationMs = backupSw.ElapsedMilliseconds
                    },
                    BundleContents = new[]
                    {
                        "database_snapshot.bak",
                        "configurations.json"
                    }
                };
                await File.WriteAllTextAsync(Path.Combine(tempStagingPath, "backup_manifest.json"), JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true }));

                // 7. Compress the folder to ZIP
                var backupFolder = Path.Combine(baseDir, "Backups");
                Directory.CreateDirectory(backupFolder);
                var zipPath = Path.Combine(backupFolder, $"backup_raw_{backupId}.zip");

                compressSw.Start();
                ZipFile.CreateFromDirectory(tempStagingPath, zipPath);
                compressSw.Stop();

                // 8. Encrypt ZIP archive using AES-256-CBC
                var encryptedPath = Path.Combine(backupFolder, $"backup_{backupId}.zip.enc");

                encryptSw.Start();
                await EncryptFileAsync(zipPath, encryptedPath);
                encryptSw.Stop();

                // Cleanup raw ZIP
                File.Delete(zipPath);

                totalSw.Stop();

                var durations = new
                {
                    BackupDurationMs = backupSw.ElapsedMilliseconds,
                    CompressionDurationMs = compressSw.ElapsedMilliseconds,
                    EncryptionDurationMs = encryptSw.ElapsedMilliseconds,
                    TotalDurationMs = totalSw.ElapsedMilliseconds
                };

                await PublishEventAsync("BackupCompleted", backupId, new
                {
                    BackupId = backupId,
                    BackupType = backupType,
                    DatabaseName = databaseName,
                    DatabaseSize = databaseSize,
                    BackupSize = new FileInfo(encryptedPath).Length,
                    Durations = durations,
                    CompletedAt = DateTime.UtcNow
                });

                await PublishEventAsync("BackupVerified", backupId, new
                {
                    BackupId = backupId,
                    Checksum = checksum,
                    VerifiedAt = DateTime.UtcNow
                });

                _logger.LogInformation("Database backup committed successfully. Location: {Path}, Checksum: {Checksum}, Duration: {Duration}ms", encryptedPath, checksum, totalSw.ElapsedMilliseconds);
                return backupId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to compile database backup.");
                throw;
            }
            finally
            {
                try
                {
                    if (Directory.Exists(tempStagingPath))
                    {
                        Directory.Delete(tempStagingPath, true);
                    }
                }
                catch {}
            }
        }

        public async Task<bool> VerifyBackupAsync(Guid backupId, string backupFilePath)
        {
            _logger.LogInformation("Verifying backup archive integrity for {Path}...", backupFilePath);

            if (!File.Exists(backupFilePath))
            {
                _logger.LogError("Verification Fail: Backup file does not exist.");
                return false;
            }

            var baseDir = AppContext.BaseDirectory;
            var decryptedPath = Path.Combine(baseDir, $"backup_verify_{backupId}.zip");
            var extractPath = Path.Combine(baseDir, $"temp_verify_{backupId}");

            try
            {
                // 1. Decrypt backup
                await DecryptFileAsync(backupFilePath, decryptedPath);

                // 2. Perform dry decompression test
                Directory.CreateDirectory(extractPath);
                ZipFile.ExtractToDirectory(decryptedPath, extractPath);

                // 3. Verify manifest contents and check checksum
                var manifestContent = await File.ReadAllTextAsync(Path.Combine(extractPath, "backup_manifest.json"));
                using var doc = JsonDocument.Parse(manifestContent);
                var root = doc.RootElement;
                var checksum = root.GetProperty("Checksum").GetString();

                // Compute hash of the extracted database_snapshot.bak file
                var dbSnapshotFile = Path.Combine(extractPath, "database_snapshot.bak");
                if (!File.Exists(dbSnapshotFile))
                {
                    _logger.LogError("Verification Fail: database_snapshot.bak missing from archive.");
                    return false;
                }

                string calculatedHash;
                using (var sha256 = SHA256.Create())
                {
                    using (var fs = File.OpenRead(dbSnapshotFile))
                    {
                        var hash = await sha256.ComputeHashAsync(fs);
                        calculatedHash = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
                    }
                }

                if (checksum != calculatedHash)
                {
                    _logger.LogError("Verification Fail: Checksum mismatch. Expected: {Expected}, Calculated: {Calculated}", checksum, calculatedHash);
                    return false;
                }

                // 4. Run SQL RESTORE VERIFYONLY on the decrypted backup file
                if (_context.Database.IsRelational())
                {
                    _logger.LogInformation("Verifying backup file via RESTORE VERIFYONLY against SQL Server...");
                    var verifySql = "RESTORE VERIFYONLY FROM DISK = @path";
                    using (var command = _context.Database.GetDbConnection().CreateCommand())
                    {
                        command.CommandText = verifySql;
                        var pathParam = command.CreateParameter();
                        pathParam.ParameterName = "@path";
                        pathParam.Value = dbSnapshotFile;
                        command.Parameters.Add(pathParam);

                        var wasOpen = _context.Database.GetDbConnection().State == System.Data.ConnectionState.Open;
                        if (!wasOpen) await _context.Database.OpenConnectionAsync();
                        try
                        {
                            await command.ExecuteNonQueryAsync();
                        }
                        finally
                        {
                            if (!wasOpen) await _context.Database.CloseConnectionAsync();
                        }
                    }
                }

                _logger.LogInformation("Backup integrity verification PASSED successfully.");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception during backup verification.");
                return false;
            }
            finally
            {
                try
                {
                    if (File.Exists(decryptedPath)) File.Delete(decryptedPath);
                    if (Directory.Exists(extractPath)) Directory.Delete(extractPath, true);
                }
                catch {}
            }
        }

        public async Task<bool> ExecuteRestoreAsync(Guid backupId, string backupFilePath, Guid initiatedByUserId)
        {
            var restoreSw = Stopwatch.StartNew();
            _logger.LogWarning("System entering maintenance/lockdown state for restore execution...");

            _restoreStateCoordinator?.BeginRestore();

            var connStr = "";
            var databaseName = "SynOSDb";

            if (_context.Database.IsRelational())
            {
                connStr = _context.Database.GetDbConnection().ConnectionString;
                var connBuilder = new SqlConnectionStringBuilder(connStr);
                databaseName = connBuilder.InitialCatalog;
            }

            await PublishEventAsync("RestoreStarted", backupId, new
            {
                BackupId = backupId,
                InitiatedBy = initiatedByUserId,
                StartedAt = DateTime.UtcNow
            });

            // 1. Create automatic Database Safety Snapshot before the restore begins
            try
            {
                await CreateSafetySnapshotAsync(databaseName, connStr);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Aborting Restore: Database Safety Snapshot creation failed.");
                await PublishEventAsync("RestoreFailed", backupId, new
                {
                    BackupId = backupId,
                    Reason = "Database Safety Snapshot creation failed. Restore aborted.",
                    ErrorDetail = ex.Message,
                    FailedAt = DateTime.UtcNow
                });
                _restoreStateCoordinator?.EndRestore();
                throw new InvalidOperationException($"Pre-restore Database Safety Snapshot creation failed: {ex.Message}. Restore aborted.", ex);
            }

            // 2. Automatically create an Emergency Backup of the current database
            try
            {
                _logger.LogInformation("Creating pre-restore Emergency Backup...");
                await ExecuteBackupAsync("Emergency");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Aborting Restore: Emergency pre-restore backup failed.");
                await PublishEventAsync("RestoreFailed", backupId, new
                {
                    BackupId = backupId,
                    Reason = "Emergency pre-restore backup execution failed.",
                    ErrorDetail = ex.Message,
                    FailedAt = DateTime.UtcNow
                });
                _restoreStateCoordinator?.EndRestore();
                return false;
            }

            // 3. Perform validation checks (Decrypt and SHA-256 verify)
            var verifySuccess = await VerifyBackupAsync(backupId, backupFilePath);
            if (!verifySuccess)
            {
                _logger.LogError("Restore aborted: Backup integrity checks failed.");
                await PublishEventAsync("RestoreFailed", backupId, new
                {
                    BackupId = backupId,
                    Reason = "Backup integrity validation check failed.",
                    FailedAt = DateTime.UtcNow
                });
                _restoreStateCoordinator?.EndRestore();
                return false;
            }

            var baseDir = AppContext.BaseDirectory;
            var decryptedPath = Path.Combine(baseDir, $"backup_restore_{backupId}.zip");
            var extractPath = Path.Combine(baseDir, $"temp_restore_{backupId}");

            try
            {
                // 5. Decrypt and extract
                await DecryptFileAsync(backupFilePath, decryptedPath);
                Directory.CreateDirectory(extractPath);
                ZipFile.ExtractToDirectory(decryptedPath, extractPath);

                var dbSnapshotFile = Path.Combine(extractPath, "database_snapshot.bak");

                if (!string.IsNullOrEmpty(connStr))
                {
                    // 6. Run RESTORE VERIFYONLY one final time on the staging SQL backup
                    _logger.LogInformation("Executing RESTORE VERIFYONLY on staging database_snapshot.bak...");
                    using (var command = _context.Database.GetDbConnection().CreateCommand())
                    {
                        command.CommandText = "RESTORE VERIFYONLY FROM DISK = @path";
                        var pathParam = command.CreateParameter();
                        pathParam.ParameterName = "@path";
                        pathParam.Value = dbSnapshotFile;
                        command.Parameters.Add(pathParam);

                        var wasOpen = _context.Database.GetDbConnection().State == System.Data.ConnectionState.Open;
                        if (!wasOpen) await _context.Database.OpenConnectionAsync();
                        try
                        {
                            await command.ExecuteNonQueryAsync();
                        }
                        finally
                        {
                            if (!wasOpen) await _context.Database.CloseConnectionAsync();
                        }
                    }

                    // 7. Dispose the active DbContext instance to sever tracking and active connections
                    _logger.LogInformation("Closing database connection and disposing EF Core DbContext...");
                    await _context.Database.CloseConnectionAsync();
                    await _context.DisposeAsync();

                    // Clear ADO.NET connection pools and dispose connections
                    _logger.LogInformation("Clearing SQL connection pools...");
                    SqlConnection.ClearAllPools();

                    var masterBuilder = new SqlConnectionStringBuilder(connStr)
                    {
                        InitialCatalog = "master"
                    };
                    var masterConnStr = masterBuilder.ConnectionString;

                    // 8. Connect to master database and execute Restore Database Commands
                    using (var connection = new SqlConnection(masterConnStr))
                    {
                        await connection.OpenAsync();

                        // Lock to SINGLE_USER
                        _logger.LogWarning("Disconnecting active sessions and locking database {DatabaseName} to SINGLE_USER...", databaseName);
                        var lockSql = $"ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE";
                        using (var command = new SqlCommand(lockSql, connection))
                        {
                            command.CommandTimeout = 120;
                            await command.ExecuteNonQueryAsync();
                        }

                        // Execute Restore Database Command
                        _logger.LogWarning("Restoring database {DatabaseName} from backup {Path}...", databaseName, dbSnapshotFile);
                        var restoreSql = $"RESTORE DATABASE [{databaseName}] FROM DISK = @backupPath WITH REPLACE";
                        using (var command = new SqlCommand(restoreSql, connection))
                        {
                            command.CommandTimeout = 240;
                            command.Parameters.AddWithValue("@backupPath", dbSnapshotFile);
                            await command.ExecuteNonQueryAsync();
                        }

                        // Unlock database back to MULTI_USER
                        _logger.LogInformation("Restoring database status to MULTI_USER...");
                        var unlockSql = $"ALTER DATABASE [{databaseName}] SET MULTI_USER";
                        using (var command = new SqlCommand(unlockSql, connection))
                        {
                            await command.ExecuteNonQueryAsync();
                        }
                    }

                    // Clear SQL connection pools again to make sure stale handles are purged
                    SqlConnection.ClearAllPools();
                }
                else
                {
                    _logger.LogInformation("Simulating restore actions for InMemory database...");
                    await Task.Delay(100);
                }

                // 9. Perform post-restore validation checks using a brand-new DbContext and DI Scope
                _logger.LogInformation("Executing Post-Restore Sanity Validation Checks on a fresh DbContext scope...");
                
                if (!string.IsNullOrEmpty(connStr))
                {
                    if (_serviceProvider == null)
                    {
                        throw new InvalidOperationException("Service Provider is not available to create a fresh DI scope.");
                    }

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var newContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                        
                        var canConnect = await newContext.Database.CanConnectAsync();
                        if (!canConnect)
                        {
                            throw new InvalidOperationException("Post-Restore Validation failed: Database is unreachable.");
                        }

                        // Validate core tables queryability
                        int visitsCount = await newContext.Visits.CountAsync();
                        int reportsCount = await newContext.Reports.CountAsync();
                        int outboxCount = await newContext.OutboxEvents.CountAsync();
                        var appliedMigrations = await newContext.Database.GetAppliedMigrationsAsync();

                        _logger.LogInformation("Sanity checks complete. Visits: {Visits}, Reports: {Reports}, Outbox Events: {Outbox}, Migrations: {Migrations}", 
                            visitsCount, reportsCount, outboxCount, appliedMigrations.Count());

                        // Reset restore flag before publishing events to outbox
                        _restoreStateCoordinator?.EndRestore();

                        // Publish RestoreCompleted event using the newContext
                        await PublishEventWithContextAsync(newContext, "RestoreCompleted", backupId, new
                        {
                            BackupId = backupId,
                            RestoreDurationMs = restoreSw.ElapsedMilliseconds,
                            CompletedAt = DateTime.UtcNow
                        });
                    }
                }
                else
                {
                    _logger.LogInformation("Skipping post-restore SQL validation checks for InMemory database provider.");
                    _restoreStateCoordinator?.EndRestore();
                }

                restoreSw.Stop();

                _logger.LogInformation("Restore completed successfully. System returned to healthy status. Duration: {Duration}ms", restoreSw.ElapsedMilliseconds);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Restore execution failed.");
                restoreSw.Stop();

                _restoreStateCoordinator?.EndRestore();

                if (!string.IsNullOrEmpty(connStr))
                {
                    // Attempt to unlock database in case of connection failure inside restore block
                    try
                    {
                        SqlConnection.ClearAllPools();
                        var masterBuilder = new SqlConnectionStringBuilder(connStr) { InitialCatalog = "master" };
                        using (var connection = new SqlConnection(masterBuilder.ConnectionString))
                        {
                            await connection.OpenAsync();
                            var unlockSql = $"ALTER DATABASE [{databaseName}] SET MULTI_USER";
                            using (var command = new SqlCommand(unlockSql, connection))
                            {
                                await command.ExecuteNonQueryAsync();
                            }
                        }
                    }
                    catch {}

                    // Attempt to publish RestoreFailed event using a new context scope
                    try
                    {
                        if (_serviceProvider != null)
                        {
                            using (var scope = _serviceProvider.CreateScope())
                            {
                                var newContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                                if (await newContext.Database.CanConnectAsync())
                                {
                                    await PublishEventWithContextAsync(newContext, "RestoreFailed", backupId, new
                                    {
                                        BackupId = backupId,
                                        Reason = "Restore SQL Server command or validation check threw an exception.",
                                        ErrorDetail = ex.Message,
                                        RestoreDurationMs = restoreSw.ElapsedMilliseconds,
                                        FailedAt = DateTime.UtcNow
                                    });
                                }
                            }
                        }
                    }
                    catch {}
                }



                return false;
            }
            finally
            {
                try
                {
                    if (File.Exists(decryptedPath)) File.Delete(decryptedPath);
                    if (Directory.Exists(extractPath)) Directory.Delete(extractPath, true);
                }
                catch {}
            }
        }

        public async Task<bool> RunSandboxedTestRestoreAsync(Guid backupId, string backupFilePath)
        {
            _logger.LogInformation("Running automated sandboxed test restore drill for {BackupId}...", backupId);

            var baseDir = AppContext.BaseDirectory;
            var decryptedPath = Path.Combine(baseDir, $"backup_sandbox_{backupId}.zip");
            var sandboxPath = Path.Combine(baseDir, $"temp_sandbox_{backupId}");

            try
            {
                if (!File.Exists(backupFilePath)) return false;

                // 1. Decrypt and extract to sandbox
                await DecryptFileAsync(backupFilePath, decryptedPath);
                Directory.CreateDirectory(sandboxPath);
                ZipFile.ExtractToDirectory(decryptedPath, sandboxPath);

                // 2. Validate DB snapshot structure
                var dbSnapshotFile = Path.Combine(sandboxPath, "database_snapshot.bak");
                if (!File.Exists(dbSnapshotFile))
                {
                    _logger.LogError("Sandbox Test Fail: Missing database_snapshot.bak in archive.");
                    return false;
                }

                // 3. Verify backup verifyonly against local sql server sandbox
                if (_context.Database.IsRelational())
                {
                    using (var command = _context.Database.GetDbConnection().CreateCommand())
                    {
                        command.CommandText = "RESTORE VERIFYONLY FROM DISK = @path";
                        var pathParam = command.CreateParameter();
                        pathParam.ParameterName = "@path";
                        pathParam.Value = dbSnapshotFile;
                        command.Parameters.Add(pathParam);

                        var wasOpen = _context.Database.GetDbConnection().State == System.Data.ConnectionState.Open;
                        if (!wasOpen) await _context.Database.OpenConnectionAsync();
                        try
                        {
                            await command.ExecuteNonQueryAsync();
                        }
                        finally
                        {
                            if (!wasOpen) await _context.Database.CloseConnectionAsync();
                        }
                    }
                }

                _logger.LogInformation("Sandbox verification query test PASSED successfully.");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Sandbox Test Fail: Exception thrown during restore drill.");
                return false;
            }
            finally
            {
                try
                {
                    if (File.Exists(decryptedPath)) File.Delete(decryptedPath);
                    if (Directory.Exists(sandboxPath)) Directory.Delete(sandboxPath, true);
                }
                catch {}
            }
        }

        private async Task CreateSafetySnapshotAsync(string databaseName, string connStr)
        {
            if (!_context.Database.IsRelational())
            {
                _logger.LogInformation("[Sandbox] Creating simulated safety snapshot...");
                var mockTimestamp = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString().Substring(0, 8)}";
                var mockBaseDir = AppContext.BaseDirectory;
                var mockSafetyDir = Path.Combine(mockBaseDir, "Backups", "SafetySnapshots", mockTimestamp);
                Directory.CreateDirectory(mockSafetyDir);
                
                var mockManifest = new
                {
                    Timestamp = DateTime.UtcNow,
                    DatabaseName = databaseName,
                    SynOSVersion = "1.2.0-mock",
                    SchemaVersion = "InMemoryTestVersion",
                    Files = new[]
                    {
                        new { FileName = "SynOSDb.mdf", FileSize = 0L },
                        new { FileName = "SynOSDb_log.ldf", FileSize = 0L }
                    }
                };
                
                await File.WriteAllTextAsync(
                    Path.Combine(mockSafetyDir, "manifest.json"),
                    JsonSerializer.Serialize(mockManifest, new JsonSerializerOptions { WriteIndented = true })
                );
                return;
            }

            _logger.LogInformation("Initiating dynamic Database Safety Snapshot...");
            var masterBuilder = new SqlConnectionStringBuilder(connStr) { InitialCatalog = "master" };
            var masterConnStr = masterBuilder.ConnectionString;

            var dbFiles = new List<string>();
            try
            {
                using (var connection = new SqlConnection(masterConnStr))
                {
                    await connection.OpenAsync();
                    using (var command = new SqlCommand("SELECT physical_name FROM sys.master_files WHERE database_id = DB_ID(@dbName)", connection))
                    {
                        command.Parameters.AddWithValue("@dbName", databaseName);
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                dbFiles.Add(reader.GetString(0));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to query active database files for safety snapshot.");
                throw new InvalidOperationException("Failed to discover database files dynamically.", ex);
            }

            if (dbFiles.Count == 0)
            {
                throw new InvalidOperationException($"No database files discovered dynamically for database '{databaseName}'.");
            }

            var timestamp = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString().Substring(0, 8)}";
            var baseDir = AppContext.BaseDirectory;
            var safetySnapshotDir = Path.Combine(baseDir, "Backups", "SafetySnapshots", timestamp);
            Directory.CreateDirectory(safetySnapshotDir);

            _logger.LogWarning("Setting database {DatabaseName} to OFFLINE to release locks for safety snapshot file copy...", databaseName);
            
            bool wentOffline = false;
            try
            {
                using (var connection = new SqlConnection(masterConnStr))
                {
                    await connection.OpenAsync();
                    var offlineSql = $@"
                        ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                        ALTER DATABASE [{databaseName}] SET OFFLINE WITH ROLLBACK IMMEDIATE;";
                    using (var command = new SqlCommand(offlineSql, connection))
                    {
                        command.CommandTimeout = 120;
                        await command.ExecuteNonQueryAsync();
                    }
                }
                wentOffline = true;

                var filesMetadata = new List<object>();
                foreach (var file in dbFiles)
                {
                    if (File.Exists(file))
                    {
                        var fileName = Path.GetFileName(file);
                        var destPath = Path.Combine(safetySnapshotDir, fileName);
                        _logger.LogInformation("Copying database file {Source} to {Dest}...", file, destPath);
                        File.Copy(file, destPath, overwrite: true);
                        
                        filesMetadata.Add(new
                        {
                            FileName = fileName,
                            FileSize = new FileInfo(destPath).Length
                        });
                    }
                    else
                    {
                        throw new FileNotFoundException($"Active database file not found on disk: {file}");
                    }
                }

                // Bring back online
                using (var connection = new SqlConnection(masterConnStr))
                {
                    await connection.OpenAsync();
                    var onlineSql = $@"
                        ALTER DATABASE [{databaseName}] SET ONLINE;
                        ALTER DATABASE [{databaseName}] SET MULTI_USER;";
                    using (var command = new SqlCommand(onlineSql, connection))
                    {
                        await command.ExecuteNonQueryAsync();
                    }
                }
                wentOffline = false;

                var appVersion = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "1.2.0";
                var migrations = await _context.Database.GetAppliedMigrationsAsync();
                var schemaVersion = migrations.LastOrDefault() ?? "Initial";

                var manifest = new
                {
                    Timestamp = DateTime.UtcNow,
                    DatabaseName = databaseName,
                    SynOSVersion = appVersion,
                    SchemaVersion = schemaVersion,
                    Files = filesMetadata
                };
                
                await File.WriteAllTextAsync(
                    Path.Combine(safetySnapshotDir, "manifest.json"),
                    JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true })
                );

                _logger.LogInformation("Database Safety Snapshot created successfully at: {Path}", safetySnapshotDir);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Safety snapshot copy process encountered an error.");
                
                if (wentOffline)
                {
                    _logger.LogWarning("Attempting to restore database {DatabaseName} back to ONLINE status...", databaseName);
                    try
                    {
                        using (var connection = new SqlConnection(masterConnStr))
                        {
                            await connection.OpenAsync();
                            var onlineSql = $@"
                                ALTER DATABASE [{databaseName}] SET ONLINE;
                                ALTER DATABASE [{databaseName}] SET MULTI_USER;";
                            using (var command = new SqlCommand(onlineSql, connection))
                            {
                                await command.ExecuteNonQueryAsync();
                            }
                        }
                    }
                    catch (Exception restoreEx)
                    {
                        _logger.LogCritical(restoreEx, "CRITICAL: Failed to bring database back online after failed safety snapshot copy!");
                    }
                }

                throw;
            }
        }

        private async Task EncryptFileAsync(string sourcePath, string destPath)
        {
            var key = SHA256.HashData(Encoding.UTF8.GetBytes("TBZ-BACKUP-KEY-12345-67890"));
            var iv = new byte[16];
            Array.Copy(key, iv, 16);

            using var aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;

            using var sourceStream = new FileStream(sourcePath, FileMode.Open, FileAccess.Read);
            using var destStream = new FileStream(destPath, FileMode.Create, FileAccess.Write);
            using var encryptor = aes.CreateEncryptor();
            using var cryptoStream = new CryptoStream(destStream, encryptor, CryptoStreamMode.Write);

            await sourceStream.CopyToAsync(cryptoStream);
        }

        private async Task DecryptFileAsync(string sourcePath, string destPath)
        {
            var key = SHA256.HashData(Encoding.UTF8.GetBytes("TBZ-BACKUP-KEY-12345-67890"));
            var iv = new byte[16];
            Array.Copy(key, iv, 16);

            using var aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;

            using var sourceStream = new FileStream(sourcePath, FileMode.Open, FileAccess.Read);
            using var destStream = new FileStream(destPath, FileMode.Create, FileAccess.Write);
            using var decryptor = aes.CreateDecryptor();
            using var cryptoStream = new CryptoStream(sourceStream, decryptor, CryptoStreamMode.Read);

            await cryptoStream.CopyToAsync(destStream);
        }

        private async Task PublishEventAsync(string eventType, Guid backupId, object payload)
        {
            if (_restoreStateCoordinator?.IsRestoreInProgress ?? false)
            {
                _logger.LogWarning("Skipping Outbox event publication during active restore phase: {EventType}", eventType);
                return;
            }

            try
            {
                SynOSDbContext context = _context;
                if (_serviceProvider != null)
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                        await PublishEventWithContextAsync(context, eventType, backupId, payload);
                        return;
                    }
                }
                await PublishEventWithContextAsync(context, eventType, backupId, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish outbox event {EventType}", eventType);
            }
        }

        private async Task PublishEventWithContextAsync(SynOSDbContext context, string eventType, Guid backupId, object payload)
        {
            try
            {
                var outboxEvent = new OutboxEvent
                {
                    Id = Guid.NewGuid(),
                    EventVersion = 1,
                    EventType = eventType,
                    AggregateType = "BackupSystem",
                    AggregateId = backupId.ToString(),
                    LabId = "LAB001",
                    PayloadJson = JsonSerializer.Serialize(payload),
                    CreatedAt = DateTime.UtcNow,
                    Status = "Pending"
                };
                context.OutboxEvents.Add(outboxEvent);
                await context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish outbox event {EventType}", eventType);
            }
        }


    }
}
