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
        private readonly IServiceProvider? _serviceProvider;
        private readonly IRestoreStateCoordinator? _restoreStateCoordinator;
        private readonly IBackupKeyProvider _backupKeyProvider;

        public BackupService(
            SynOSDbContext context,
            IConfiguration configuration,
            ILogger<BackupService> logger)
            : this(context, configuration, logger, null, null, null)
        {
        }

        public BackupService(
            SynOSDbContext context,
            IConfiguration configuration,
            ILogger<BackupService> logger,
            IServiceProvider? serviceProvider,
            IRestoreStateCoordinator? restoreStateCoordinator,
            IBackupKeyProvider? backupKeyProvider)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _serviceProvider = serviceProvider;
            _restoreStateCoordinator = restoreStateCoordinator;
            _backupKeyProvider = backupKeyProvider 
                ?? serviceProvider?.GetService<IBackupKeyProvider>() 
                ?? new WindowsBackupKeyProvider(configuration, serviceProvider ?? new ServiceCollection().BuildServiceProvider());
        }

        private string GetWorkingDirectory()
        {
            var path = _configuration["Working:Directory"];
            if (string.IsNullOrEmpty(path))
            {
                if (AppContext.BaseDirectory.Contains("Program Files", StringComparison.OrdinalIgnoreCase))
                {
                    return "C:\\SynOS_Files";
                }
                return AppContext.BaseDirectory;
            }
            return path;
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

            var baseDir = GetWorkingDirectory();
            var tempStagingPath = Path.Combine(baseDir, "BackupStaging", $"temp_backup_{backupId}");
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

                    try
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
                    }
                    catch (Exception backupEx)
                    {
                        _logger.LogWarning(backupEx, "Backup to staging path {Path} failed. Attempting fallback to C:\\Windows\\Temp...", dbSnapshotFile);
                        var fallbackPath = Path.Combine("C:\\Windows\\Temp", $"backup_{databaseName}_{backupId}.bak");
                        try
                        {
                            var backupSql = $"BACKUP DATABASE [{databaseName}] TO DISK = @path WITH INIT, CHECKSUM";
                            using (var command = _context.Database.GetDbConnection().CreateCommand())
                            {
                                command.CommandText = backupSql;
                                var pathParam = command.CreateParameter();
                                pathParam.ParameterName = "@path";
                                pathParam.Value = fallbackPath;
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
                            
                            File.Copy(fallbackPath, dbSnapshotFile, overwrite: true);
                            File.Delete(fallbackPath);
                        }
                        catch (Exception fallbackEx)
                        {
                            _logger.LogError(fallbackEx, "Fallback backup to C:\\Windows\\Temp also failed.");
                            throw new InvalidOperationException("Failed to execute database backup using all backup paths.", fallbackEx);
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
                var labId = labProfile?.LabId ?? _configuration["Middleware:LabId"] ?? "LAB001";
                long backupFileSize = new FileInfo(dbSnapshotFile).Length;

                // 6. Save manifest metadata containing the checksum and duration telemetry
                var manifest = new
                {
                    BackupId = backupId,
                    BackupVersion = "2.0",
                    KeyId = _backupKeyProvider.GetKeyId(),
                    GeneratedAt = DateTime.UtcNow,
                    GeneratedBy = $"SynOS {appVersion}",
                    BackupType = backupType,
                    DatabaseVersion = _context.Database.IsRelational() ? "Microsoft SQL Server LocalDB" : "InMemory Test Database",
                    SchemaVersion = schemaVersion,
                    EncryptionVersion = "AES-256-GCM-v1",
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

        private void GrantFileAccessToAll(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    var fileInfo = new FileInfo(path);
                    var security = fileInfo.GetAccessControl();
                    security.AddAccessRule(new FileSystemAccessRule(
                        new SecurityIdentifier(WellKnownSidType.WorldSid, null),
                        FileSystemRights.FullControl,
                        AccessControlType.Allow));
                    fileInfo.SetAccessControl(security);
                }
                else if (Directory.Exists(path))
                {
                    var dirInfo = new DirectoryInfo(path);
                    var security = dirInfo.GetAccessControl();
                    security.AddAccessRule(new FileSystemAccessRule(
                        new SecurityIdentifier(WellKnownSidType.WorldSid, null),
                        FileSystemRights.FullControl,
                        InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
                        PropagationFlags.None,
                        AccessControlType.Allow));
                    dirInfo.SetAccessControl(security);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to set ACL permissions on {Path}", path);
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

            if (backupFilePath.EndsWith(".bak", StringComparison.OrdinalIgnoreCase))
            {
                if (_context.Database.IsRelational())
                {
                    _logger.LogInformation("Verifying raw .bak database backup via RESTORE VERIFYONLY...");
                    var verifySql = "RESTORE VERIFYONLY FROM DISK = @path";
                    using (var command = _context.Database.GetDbConnection().CreateCommand())
                    {
                        command.CommandText = verifySql;
                        var pathParam = command.CreateParameter();
                        pathParam.ParameterName = "@path";
                        pathParam.Value = backupFilePath;
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
                _logger.LogInformation("Raw .bak backup integrity verification PASSED successfully.");
                return true;
            }

            var baseDir = GetWorkingDirectory();
            var decryptedPath = Path.Combine(baseDir, "Restore", $"backup_verify_{backupId}.zip");
            var extractPath = Path.Combine(baseDir, "Restore", $"temp_verify_{backupId}");
            bool isEncrypted = backupFilePath.EndsWith(".zip.enc", StringComparison.OrdinalIgnoreCase) || 
                              backupFilePath.EndsWith(".enc", StringComparison.OrdinalIgnoreCase);

            try
            {
                // Ensure Restore directory exists
                var restoreFolder = Path.Combine(baseDir, "Restore");
                Directory.CreateDirectory(restoreFolder);
                GrantFileAccessToAll(restoreFolder);

                // 1. Decrypt backup if encrypted
                if (isEncrypted)
                {
                    await DecryptFileAsync(backupFilePath, decryptedPath);
                    GrantFileAccessToAll(decryptedPath);
                }
                else
                {
                    decryptedPath = backupFilePath;
                }

                // 2. Perform dry decompression test
                Directory.CreateDirectory(extractPath);
                GrantFileAccessToAll(extractPath);
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
                GrantFileAccessToAll(dbSnapshotFile);

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
                    if (isEncrypted && File.Exists(decryptedPath)) File.Delete(decryptedPath);
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

            User restoringUser = null;
            List<UserRole> restoringUserRoles = null;
            List<UserBranchRole> restoringUserBranchRoles = null;
            List<UserWorkspaceAccess> restoringUserWorkspaceAccesses = null;
            Employee restoringEmployee = null;

            if (initiatedByUserId != Guid.Empty && _context.Database.IsRelational())
            {
                try
                {
                    restoringUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == initiatedByUserId);
                    if (restoringUser != null)
                    {
                        restoringUserRoles = await _context.UserRoles.AsNoTracking().Where(ur => ur.UserId == initiatedByUserId).ToListAsync();
                        restoringUserBranchRoles = await _context.UserBranchRoles.AsNoTracking().Where(ubr => ubr.UserId == initiatedByUserId).ToListAsync();
                        restoringUserWorkspaceAccesses = await _context.UserWorkspaceAccesses.AsNoTracking().Where(uwa => uwa.UserId == initiatedByUserId).ToListAsync();
                        restoringEmployee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == initiatedByUserId);
                        _logger.LogInformation("Successfully cached credentials and profile for restoring user: {Username}", restoringUser.Username);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to load restoring user details for preservation before restore.");
                }
            }

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

            var baseDir = GetWorkingDirectory();
            var decryptedPath = Path.Combine(baseDir, "Restore", $"backup_restore_{backupId}.zip");
            var extractPath = Path.Combine(baseDir, "Restore", $"temp_restore_{backupId}");
            bool isEncrypted = backupFilePath.EndsWith(".zip.enc", StringComparison.OrdinalIgnoreCase) || 
                              backupFilePath.EndsWith(".enc", StringComparison.OrdinalIgnoreCase);

            try
            {
                string dbSnapshotFile;
                if (backupFilePath.EndsWith(".bak", StringComparison.OrdinalIgnoreCase))
                {
                    dbSnapshotFile = backupFilePath;
                }
                else
                {
                    // Ensure Restore directory exists
                    Directory.CreateDirectory(Path.Combine(baseDir, "Restore"));

                    // 5. Decrypt and extract
                    if (isEncrypted)
                    {
                        await DecryptFileAsync(backupFilePath, decryptedPath);
                    }
                    else
                    {
                        decryptedPath = backupFilePath;
                    }
                    Directory.CreateDirectory(extractPath);
                    ZipFile.ExtractToDirectory(decryptedPath, extractPath);
                    _logger.LogInformation("ZIP extraction completed.");

                    dbSnapshotFile = Path.Combine(extractPath, "database_snapshot.bak");
                    if (File.Exists(dbSnapshotFile))
                    {
                        _logger.LogInformation("BAK file located.");
                    }
                }

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

                        // Get logical files from the backup
                        var backupLogicalFiles = new List<(string LogicalName, string Type)>();
                        using (var cmd = new SqlCommand("RESTORE FILELISTONLY FROM DISK = @backupPath", connection))
                        {
                            cmd.Parameters.AddWithValue("@backupPath", dbSnapshotFile);
                            using (var reader = await cmd.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    var logicalName = reader.GetString(reader.GetOrdinal("LogicalName"));
                                    var type = reader.GetString(reader.GetOrdinal("Type"));
                                    backupLogicalFiles.Add((logicalName, type));
                                }
                            }
                        }

                        // Resolve default SQL Server data/log directories dynamically
                        var defaultDataPath = "";
                        var defaultLogPath = "";
                        try
                        {
                            using (var cmd = new SqlCommand("SELECT ServerProperty('InstanceDefaultDataPath'), ServerProperty('InstanceDefaultLogPath')", connection))
                            {
                                using (var reader = await cmd.ExecuteReaderAsync())
                                {
                                    if (await reader.ReadAsync())
                                    {
                                        defaultDataPath = reader.IsDBNull(0) ? "" : reader.GetString(0);
                                        defaultLogPath = reader.IsDBNull(1) ? "" : reader.GetString(1);
                                    }
                                }
                            }
                            if (string.IsNullOrEmpty(defaultDataPath))
                            {
                                using (var cmd = new SqlCommand("SELECT top 1 physical_name FROM sys.master_files WHERE database_id = 1", connection))
                                {
                                    var masterPath = (string?)await cmd.ExecuteScalarAsync();
                                    if (!string.IsNullOrEmpty(masterPath))
                                    {
                                        defaultDataPath = Path.GetDirectoryName(masterPath) ?? "";
                                        defaultLogPath = defaultDataPath;
                                    }
                                }
                            }
                        }
                        catch (Exception pathEx)
                        {
                            _logger.LogWarning(pathEx, "Failed to dynamically query default SQL Server paths.");
                        }

                        if (string.IsNullOrEmpty(defaultDataPath))
                        {
                            defaultDataPath = @"C:\Program Files\Microsoft SQL Server\MSSQL16.SYNOS\MSSQL\DATA";
                            defaultLogPath = defaultDataPath;
                        }

                        // Get target database's physical files
                        var targetPhysicalFiles = new List<(string Name, string PhysicalPath, string Type)>();
                        var getFilesSql = "SELECT name, physical_name, type_desc FROM sys.master_files WHERE database_id = DB_ID(@dbName)";
                        using (var cmd = new SqlCommand(getFilesSql, connection))
                        {
                            cmd.Parameters.AddWithValue("@dbName", databaseName);
                            using (var reader = await cmd.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    var name = reader.GetString(0);
                                    var path = reader.GetString(1);
                                    var typeDesc = reader.GetString(2);
                                    var type = typeDesc.Equals("ROWS", StringComparison.OrdinalIgnoreCase) ? "D" : "L";
                                    targetPhysicalFiles.Add((name, path, type));
                                }
                            }
                        }

                        if (targetPhysicalFiles.Count == 0)
                        {
                            targetPhysicalFiles.Add((databaseName, Path.Combine(defaultDataPath, $"{databaseName}.mdf"), "D"));
                            targetPhysicalFiles.Add(($"{databaseName}_log", Path.Combine(defaultLogPath, $"{databaseName}_log.ldf"), "L"));
                        }

                        // Build restore SQL with MOVE clauses
                        var restoreSql = $"RESTORE DATABASE [{databaseName}] FROM DISK = @backupPath WITH REPLACE";
                        
                        if (targetPhysicalFiles.Count > 0 && backupLogicalFiles.Count > 0)
                        {
                            var dataCount = 0;
                            var logCount = 0;
                            foreach (var backupFile in backupLogicalFiles)
                            {
                                var targetFile = targetPhysicalFiles
                                    .Where(tf => tf.Type == backupFile.Type)
                                    .Skip(backupFile.Type == "D" ? dataCount++ : logCount++)
                                    .FirstOrDefault();

                                var targetPath = targetFile.PhysicalPath;
                                if (string.IsNullOrEmpty(targetPath))
                                {
                                    var suffix = backupFile.Type == "D" ? ".mdf" : "_log.ldf";
                                    var dir = backupFile.Type == "D" ? defaultDataPath : defaultLogPath;
                                    targetPath = Path.Combine(dir, $"{databaseName}_{backupFile.LogicalName}{suffix}");
                                }

                                restoreSql += $", MOVE '{backupFile.LogicalName}' TO '{targetPath}'";
                            }
                        }

                        _logger.LogWarning("Restoring database {DatabaseName} from backup {Path} using SQL: {Sql}...", databaseName, dbSnapshotFile, restoreSql);
                        _logger.LogInformation("RESTORE DATABASE command started.");
                        using (var command = new SqlCommand(restoreSql, connection))
                        {
                            command.CommandTimeout = 240;
                            command.Parameters.AddWithValue("@backupPath", dbSnapshotFile);
                            await command.ExecuteNonQueryAsync();
                        }
                        _logger.LogInformation("RESTORE DATABASE command completed successfully.");

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
                        _logger.LogInformation("New DbContext created.");
                        
                        var canConnect = await newContext.Database.CanConnectAsync();
                        if (!canConnect)
                        {
                            throw new InvalidOperationException("Post-Restore Validation failed: Database is unreachable.");
                        }

                        // Apply pending database migrations to bring restored schema up to date with code model
                        _logger.LogInformation("EF Core migrations started.");
                        await newContext.Database.MigrateAsync();
                        _logger.LogInformation("EF Core migrations completed.");

                        if (restoringUser != null)
                        {
                            _logger.LogInformation("Preserving restoring user credentials into the restored database...");
                            try
                            {
                                var existingUser = await newContext.Users.FirstOrDefaultAsync(u => u.UserId == restoringUser.UserId || u.Username.ToLower() == restoringUser.Username.ToLower());
                                if (existingUser != null)
                                {
                                    // Update existing user details to preserve username, password hash, email, designation, active status
                                    existingUser.Username = restoringUser.Username;
                                    existingUser.PasswordHash = restoringUser.PasswordHash;
                                    existingUser.Email = restoringUser.Email;
                                    existingUser.Name = restoringUser.Name;
                                    existingUser.Designation = restoringUser.Designation;
                                    existingUser.IsActive = restoringUser.IsActive;
                                    existingUser.IsDefaultSignatory = restoringUser.IsDefaultSignatory;
                                    existingUser.CanUseOperationalMode = restoringUser.CanUseOperationalMode;
                                    existingUser.CanUseOversightMode = restoringUser.CanUseOversightMode;
                                    newContext.Users.Update(existingUser);
                                }
                                else
                                {
                                    // Add the restoring user
                                    newContext.Users.Add(restoringUser);
                                }

                                // Ensure correct roles/permissions for the restoring user in the restored database
                                if (restoringUserRoles != null)
                                {
                                    foreach (var role in restoringUserRoles)
                                    {
                                        var roleExists = await newContext.UserRoles.AnyAsync(ur => ur.UserId == role.UserId && ur.RoleId == role.RoleId);
                                        if (!roleExists)
                                        {
                                            newContext.UserRoles.Add(role);
                                        }
                                    }
                                }

                                if (restoringUserBranchRoles != null)
                                {
                                    foreach (var ubr in restoringUserBranchRoles)
                                    {
                                        var ubrExists = await newContext.UserBranchRoles.AnyAsync(x => x.UserId == ubr.UserId && x.BranchId == ubr.BranchId && x.RoleId == ubr.RoleId);
                                        if (!ubrExists)
                                        {
                                            // Ensure the branch exists in the restored database, otherwise fallback to the default branch
                                            var branchExists = await newContext.Branches.AnyAsync(b => b.BranchId == ubr.BranchId);
                                            if (branchExists)
                                            {
                                                newContext.UserBranchRoles.Add(ubr);
                                            }
                                            else
                                            {
                                                var defaultBranch = await newContext.Branches.FirstOrDefaultAsync();
                                                if (defaultBranch != null)
                                                {
                                                    ubr.BranchId = defaultBranch.BranchId;
                                                    newContext.UserBranchRoles.Add(ubr);
                                                }
                                            }
                                        }
                                    }
                                }

                                if (restoringUserWorkspaceAccesses != null)
                                {
                                    foreach (var uwa in restoringUserWorkspaceAccesses)
                                    {
                                        var uwaExists = await newContext.UserWorkspaceAccesses.AnyAsync(x => x.UserId == uwa.UserId && x.WorkspaceId == uwa.WorkspaceId);
                                        if (!uwaExists)
                                        {
                                            var workspaceExists = await newContext.Workspaces.AnyAsync(w => w.WorkspaceId == uwa.WorkspaceId);
                                            if (workspaceExists)
                                            {
                                                newContext.UserWorkspaceAccesses.Add(uwa);
                                            }
                                        }
                                    }
                                }

                                if (restoringEmployee != null)
                                {
                                    var employeeExists = await newContext.Employees.AnyAsync(e => e.UserId == restoringEmployee.UserId);
                                    if (!employeeExists)
                                    {
                                        newContext.Employees.Add(restoringEmployee);
                                    }
                                }

                                await newContext.SaveChangesAsync();
                                _logger.LogInformation("Restoring user credentials merged and saved successfully.");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Failed to preserve/merge restoring user credentials.");
                            }
                        }

                        // Validate core tables queryability
                        _logger.LogInformation("Post-restore validation started.");
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
                _logger.LogError(ex, "Exact exception including stack trace: {Message}\n{StackTrace}", ex.Message, ex.StackTrace);
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
                    if (isEncrypted && File.Exists(decryptedPath)) File.Delete(decryptedPath);
                    if (Directory.Exists(extractPath)) Directory.Delete(extractPath, true);
                }
                catch {}
            }
        }

        public async Task<bool> RunSandboxedTestRestoreAsync(Guid backupId, string backupFilePath)
        {
            _logger.LogInformation("Running automated sandboxed test restore drill for {BackupId}...", backupId);

            var baseDir = GetWorkingDirectory();
            var decryptedPath = Path.Combine(baseDir, "Restore", $"backup_sandbox_{backupId}.zip");
            var sandboxPath = Path.Combine(baseDir, "Restore", $"temp_sandbox_{backupId}");

            try
            {
                if (!File.Exists(backupFilePath)) return false;

                // Ensure Restore directory exists
                Directory.CreateDirectory(Path.Combine(baseDir, "Restore"));

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
                var mockBaseDir = GetWorkingDirectory();
                var mockSafetyDir = Path.Combine(mockBaseDir, "Backup", "SafetySnapshots", mockTimestamp);
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

            _logger.LogInformation("Initiating dynamic Database Safety Snapshot via SQL BACKUP...");
            var masterBuilder = new SqlConnectionStringBuilder(connStr) { InitialCatalog = "master" };
            var masterConnStr = masterBuilder.ConnectionString;

            var timestamp = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString().Substring(0, 8)}";
            var baseDir = GetWorkingDirectory();
            var safetySnapshotDir = Path.Combine(baseDir, "Backup", "SafetySnapshots", timestamp);
            Directory.CreateDirectory(safetySnapshotDir);

            var dbSnapshotFile = Path.Combine(safetySnapshotDir, "database_snapshot.bak");
            bool backupSuccess = false;

            try
            {
                _logger.LogInformation("Attempting safety snapshot backup to: {Path}", dbSnapshotFile);
                using (var connection = new SqlConnection(masterConnStr))
                {
                    await connection.OpenAsync();
                    var backupSql = $"BACKUP DATABASE [{databaseName}] TO DISK = @backupPath WITH INIT, SKIP, NOFORMAT";
                    using (var command = new SqlCommand(backupSql, connection))
                    {
                        command.CommandTimeout = 240;
                        command.Parameters.AddWithValue("@backupPath", dbSnapshotFile);
                        await command.ExecuteNonQueryAsync();
                    }
                }
                backupSuccess = true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Backup safety snapshot to {Path} failed. Attempting fallback to C:\\Windows\\Temp...", dbSnapshotFile);
                try
                {
                    var fallbackPath = Path.Combine("C:\\Windows\\Temp", $"safety_snapshot_{databaseName}_{timestamp}.bak");
                    using (var connection = new SqlConnection(masterConnStr))
                    {
                        await connection.OpenAsync();
                        var backupSql = $"BACKUP DATABASE [{databaseName}] TO DISK = @backupPath WITH INIT, SKIP, NOFORMAT";
                        using (var command = new SqlCommand(backupSql, connection))
                        {
                            command.CommandTimeout = 240;
                            command.Parameters.AddWithValue("@backupPath", fallbackPath);
                            await command.ExecuteNonQueryAsync();
                        }
                    }
                    
                    try
                    {
                        File.Copy(fallbackPath, dbSnapshotFile, overwrite: true);
                        File.Delete(fallbackPath);
                    }
                    catch (Exception copyEx)
                    {
                        _logger.LogWarning(copyEx, "Could not move fallback backup from C:\\Windows\\Temp to target safety directory, using fallback path as source.");
                        dbSnapshotFile = fallbackPath;
                    }
                    backupSuccess = true;
                }
                catch (Exception fallbackEx)
                {
                    _logger.LogError(fallbackEx, "Fallback backup to C:\\Windows\\Temp also failed.");
                    throw new InvalidOperationException("Failed to execute safety snapshot backup using all backup paths.", fallbackEx);
                }
            }

            if (backupSuccess)
            {
                var appVersion = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "1.2.0";
                var migrations = await _context.Database.GetAppliedMigrationsAsync();
                var schemaVersion = migrations.LastOrDefault() ?? "Initial";

                var manifest = new
                {
                    Timestamp = DateTime.UtcNow,
                    DatabaseName = databaseName,
                    SynOSVersion = appVersion,
                    SchemaVersion = schemaVersion,
                    Files = new[]
                    {
                        new { FileName = "database_snapshot.bak", FileSize = new FileInfo(dbSnapshotFile).Length }
                    }
                };

                await File.WriteAllTextAsync(
                    Path.Combine(safetySnapshotDir, "manifest.json"),
                    JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true })
                );

                _logger.LogInformation("Database Safety Snapshot created successfully at: {Path}", dbSnapshotFile);
            }
        }

        private async Task EncryptFileAsync(string sourcePath, string destPath)
        {
            var configKey = _backupKeyProvider.GetEncryptionKey();
            var keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(configKey));

            var plaintext = await File.ReadAllBytesAsync(sourcePath);
            var iv = new byte[12];
            RandomNumberGenerator.Fill(iv);

            var ciphertext = new byte[plaintext.Length];
            var tag = new byte[16];

            using (var aesGcm = new AesGcm(keyBytes, 16))
            {
                aesGcm.Encrypt(iv, plaintext, ciphertext, tag);
            }

            using (var destStream = new FileStream(destPath, FileMode.Create, FileAccess.Write))
            {
                await destStream.WriteAsync(iv, 0, iv.Length);
                await destStream.WriteAsync(tag, 0, tag.Length);
                await destStream.WriteAsync(ciphertext, 0, ciphertext.Length);
            }
        }

        private async Task DecryptFileAsync(string sourcePath, string destPath)
        {
            byte[] fileBytes = await File.ReadAllBytesAsync(sourcePath);
            var configKey = _backupKeyProvider.GetEncryptionKey();
            var keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(configKey));

            // Try AES-GCM first
            try
            {
                if (fileBytes.Length >= 28)
                {
                    var iv = new byte[12];
                    var tag = new byte[16];
                    var ciphertext = new byte[fileBytes.Length - 28];

                    Buffer.BlockCopy(fileBytes, 0, iv, 0, 12);
                    Buffer.BlockCopy(fileBytes, 12, tag, 0, 16);
                    Buffer.BlockCopy(fileBytes, 28, ciphertext, 0, ciphertext.Length);

                    var plaintext = new byte[ciphertext.Length];
                    using (var aesGcm = new AesGcm(keyBytes, 16))
                    {
                        aesGcm.Decrypt(iv, ciphertext, tag, plaintext);
                    }

                    await File.WriteAllBytesAsync(destPath, plaintext);
                    return;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AES-GCM decryption failed. Attempting legacy AES-CBC decryption fallback...");
            }

            // Fallback: Try Legacy AES CBC with both active key and development fallback key
            var candidateKeys = new[] { configKey, "TBZ-BACKUP-KEY-12345-67890" };
            foreach (var key in candidateKeys)
            {
                try
                {
                    var legacyKeyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(key));
                    var iv = new byte[16];
                    Array.Copy(legacyKeyBytes, iv, 16);

                    using var aes = Aes.Create();
                    aes.Key = legacyKeyBytes;
                    aes.IV = iv;

                    using var sourceStream = new FileStream(sourcePath, FileMode.Open, FileAccess.Read);
                    using var destStream = new FileStream(destPath, FileMode.Create, FileAccess.Write);
                    using var decryptor = aes.CreateDecryptor();
                    using var cryptoStream = new CryptoStream(sourceStream, decryptor, CryptoStreamMode.Read);

                    await cryptoStream.CopyToAsync(destStream);
                    _logger.LogInformation("Legacy AES-CBC decryption succeeded using key: {Key}", key == "TBZ-BACKUP-KEY-12345-67890" ? "Default Fallback" : "Config Key");
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Legacy AES-CBC decryption failed with candidate key: {Message}", ex.Message);
                }
            }

            throw new CryptographicException("Failed to decrypt the backup file. Authentication tag mismatch or corrupt archive.");
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
                var profile = await context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
                var labId = profile?.LabId ?? "LAB001";

                var outboxEvent = new OutboxEvent
                {
                    Id = Guid.NewGuid(),
                    EventVersion = 1,
                    EventType = eventType,
                    AggregateType = "BackupSystem",
                    AggregateId = backupId.ToString(),
                    LabId = labId,
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
