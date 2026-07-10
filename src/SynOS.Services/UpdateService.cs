using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SynOS.Data;

namespace SynOS.Services
{
    public class UpdateService : IUpdateService
    {
        private readonly SynOSDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UpdateService> _logger;
        private readonly IDiagnosticsService _diagnosticsService;
        private readonly IBackupService _backupService;

        public UpdateService(
            SynOSDbContext context,
            IConfiguration configuration,
            ILogger<UpdateService> logger,
            IDiagnosticsService diagnosticsService,
            IBackupService backupService)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _diagnosticsService = diagnosticsService;
            _backupService = backupService;
        }

        public async Task<bool> RunPreflightChecksAsync(string manifestJson)
        {
            _logger.LogInformation("Running preflight validation checks...");

            try
            {
                using var doc = JsonDocument.Parse(manifestJson);
                var root = doc.RootElement;

                // 1. Validate Target Architecture
                var targetArch = root.TryGetProperty("targetArchitecture", out var archProp) ? archProp.GetString() : "x64";
                var currentArch = System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture.ToString();
                if (!string.Equals(targetArch, currentArch, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Architecture mismatch: Manifest target is {TargetArch}, current process is {CurrentArch}", targetArch, currentArch);
                }

                // 2. Validate Prerequisites: Disk Space
                if (root.TryGetProperty("requiredFreeSpaceBytes", out var spaceProp) && spaceProp.TryGetInt64(out var requiredSpace))
                {
                    var baseDir = AppContext.BaseDirectory;
                    var drive = new DriveInfo(Path.GetPathRoot(baseDir) ?? "C:\\");
                    if (drive.IsReady && drive.AvailableFreeSpace < requiredSpace)
                    {
                        _logger.LogError("Preflight Fail: Insufficient disk space. Required: {Required} bytes, Available: {Available} bytes", requiredSpace, drive.AvailableFreeSpace);
                        return false;
                    }
                }

                // 3. Verify Database Connectivity
                var canConnect = await _context.Database.CanConnectAsync();
                if (!canConnect)
                {
                    _logger.LogError("Preflight Fail: Unable to connect to the database.");
                    return false;
                }

                _logger.LogInformation("Preflight validation checks PASSED successfully.");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception during preflight checks.");
                return false;
            }
        }

        public async Task<UpdateReadinessReport> AssessUpdateReadinessAsync(string manifestJson)
        {
            _logger.LogInformation("Assessing update readiness...");
            var report = new UpdateReadinessReport();

            // 1. Manifest Validity Check
            var manifestCheck = new ReadinessCheck
            {
                Code = "MANIFEST_VALIDITY",
                Title = "Manifest Validity Check",
                Severity = ReadinessSeverity.Success,
                Message = "Update manifest is valid."
            };
            report.Checks.Add(manifestCheck);

            JsonElement root = default;
            try
            {
                using var doc = JsonDocument.Parse(manifestJson);
                root = doc.RootElement.Clone();
            }
            catch (Exception ex)
            {
                manifestCheck.Severity = ReadinessSeverity.Error;
                manifestCheck.Message = $"Invalid manifest JSON: {ex.Message}";
                report.CanInstall = false;
                return report;
            }

            // 2. Database Connectivity Check
            var dbCheck = new ReadinessCheck
            {
                Code = "DATABASE_CONNECTIVITY",
                Title = "Database Connectivity Check",
                Severity = ReadinessSeverity.Success,
                Message = "Database connection successful."
            };
            report.Checks.Add(dbCheck);
            try
            {
                var canConnect = await _context.Database.CanConnectAsync();
                if (!canConnect)
                {
                    dbCheck.Severity = ReadinessSeverity.Error;
                    dbCheck.Message = "Database connection failed.";
                    report.CanInstall = false;
                }
            }
            catch (Exception ex)
            {
                dbCheck.Severity = ReadinessSeverity.Error;
                dbCheck.Message = $"Database connection error: {ex.Message}";
                report.CanInstall = false;
            }

            // 3. Platform Compatibility (Architecture)
            var archCheck = new ReadinessCheck
            {
                Code = "ARCHITECTURE",
                Title = "Platform Compatibility Check",
                Severity = ReadinessSeverity.Success,
                Message = "Target platform architecture is compatible."
            };
            report.Checks.Add(archCheck);
            var targetArch = root.TryGetProperty("targetArchitecture", out var archProp) ? archProp.GetString() : "x64";
            var currentArch = System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture.ToString();
            if (!string.Equals(targetArch, currentArch, StringComparison.OrdinalIgnoreCase))
            {
                archCheck.Severity = ReadinessSeverity.Error;
                archCheck.Message = $"Architecture mismatch: Manifest targets {targetArch}, but host is {currentArch}.";
                report.CanInstall = false;
            }

            // 4. Disk Space Prerequisites Check
            var diskCheck = new ReadinessCheck
            {
                Code = "DISK_SPACE",
                Title = "Disk Space Availability Check",
                Severity = ReadinessSeverity.Success,
                Message = "Adequate disk space is available."
            };
            report.Checks.Add(diskCheck);
            if (root.TryGetProperty("requiredFreeSpaceBytes", out var spaceProp) && spaceProp.TryGetInt64(out var requiredSpace))
            {
                var baseDir = AppContext.BaseDirectory;
                var drive = new DriveInfo(Path.GetPathRoot(baseDir) ?? "C:\\");
                if (drive.IsReady)
                {
                    var available = drive.AvailableFreeSpace;
                    if (available < requiredSpace)
                    {
                        diskCheck.Severity = ReadinessSeverity.Error;
                        diskCheck.Message = $"Insufficient disk space. Required: {requiredSpace / (1024 * 1024.0):F1} MB, Available: {available / (1024 * 1024.0):F1} MB.";
                        report.CanInstall = false;
                    }
                    else
                    {
                        diskCheck.Message = $"Disk space available: {available / (1024 * 1024.0):F1} MB (Required: {requiredSpace / (1024 * 1024.0):F1} MB).";
                    }
                }
            }

            // 5. Pre-Update Backup Snapshot Check
            Guid? existingBackupId = null;
            if (root.TryGetProperty("backupId", out var backupProp) && backupProp.ValueKind == JsonValueKind.String)
            {
                if (Guid.TryParse(backupProp.GetString(), out var tempGuid))
                {
                    existingBackupId = tempGuid;
                }
            }

            var backupCheck = new ReadinessCheck
            {
                Code = "PRE_UPDATE_BACKUP",
                Title = "Pre-Update Backup Snapshot Check",
                Severity = ReadinessSeverity.Success,
                Message = "Pre-update backup snapshot completed successfully."
            };
            report.Checks.Add(backupCheck);

            if (existingBackupId.HasValue && existingBackupId.Value != Guid.Empty)
            {
                report.BackupId = existingBackupId.Value;
                backupCheck.Message = $"Reusing existing pre-update backup snapshot (ID: {existingBackupId.Value}).";
            }
            else
            {
                try
                {
                    var backupId = await _backupService.ExecuteBackupAsync("Full");
                    report.BackupId = backupId;
                    backupCheck.Message = $"Pre-update backup snapshot completed successfully (ID: {backupId}).";
                }
                catch (Exception ex)
                {
                    backupCheck.Severity = ReadinessSeverity.Error;
                    backupCheck.Message = $"Pre-update backup creation failed: {ex.Message}";
                    report.CanInstall = false;
                }
            }

            // 6. Active Patient Visits Check
            var activeVisitsCheck = new ReadinessCheck
            {
                Code = "ACTIVE_VISITS",
                Title = "Active Patient Visits Check",
                Severity = ReadinessSeverity.Success,
                Message = "No active patient visits."
            };
            report.Checks.Add(activeVisitsCheck);
            try
            {
                var activeVisitsCount = await _context.Visits
                    .Where(v => v.Status != SynOS.Models.Enums.VisitStatus.Completed && v.Status != SynOS.Models.Enums.VisitStatus.Cancelled)
                    .CountAsync();
                if (activeVisitsCount > 0)
                {
                    activeVisitsCheck.Severity = ReadinessSeverity.Warning;
                    activeVisitsCheck.Message = $"{activeVisitsCount} active or incomplete patient visits in the system.";
                }
            }
            catch (Exception ex)
            {
                activeVisitsCheck.Severity = ReadinessSeverity.Warning;
                activeVisitsCheck.Message = $"Failed to check active visits: {ex.Message}";
            }

            // 7. Active Reports Check
            var draftReportsCheck = new ReadinessCheck
            {
                Code = "DRAFT_REPORTS",
                Title = "Active Diagnostic Reports Check",
                Severity = ReadinessSeverity.Success,
                Message = "No active draft or pending verification reports."
            };
            report.Checks.Add(draftReportsCheck);
            try
            {
                var activeReportsCount = await _context.Reports
                    .Where(r => r.Status == "Draft" || r.Status == "PendingVerification")
                    .CountAsync();
                if (activeReportsCount > 0)
                {
                    draftReportsCheck.Severity = ReadinessSeverity.Warning;
                    draftReportsCheck.Message = $"{activeReportsCount} draft or pending verification reports in the system.";
                }
            }
            catch (Exception ex)
            {
                draftReportsCheck.Severity = ReadinessSeverity.Warning;
                draftReportsCheck.Message = $"Failed to check active reports: {ex.Message}";
            }

            // 8. Pending Notification Queue Check
            var pendingNotificationsCheck = new ReadinessCheck
            {
                Code = "PENDING_NOTIFICATIONS",
                Title = "Pending Notification Queue Check",
                Severity = ReadinessSeverity.Success,
                Message = "No pending notifications in the queue."
            };
            report.Checks.Add(pendingNotificationsCheck);
            try
            {
                var pendingNotificationsCount = await _context.NotificationQueues
                    .Where(n => n.Status == SynOS.Models.Enums.NotificationStatus.Pending)
                    .CountAsync();
                if (pendingNotificationsCount > 0)
                {
                    pendingNotificationsCheck.Severity = ReadinessSeverity.Warning;
                    pendingNotificationsCheck.Message = $"{pendingNotificationsCount} pending notifications in the queue.";
                }
            }
            catch (Exception ex)
            {
                pendingNotificationsCheck.Severity = ReadinessSeverity.Warning;
                pendingNotificationsCheck.Message = $"Failed to check pending notifications: {ex.Message}";
            }

            // 9. Pending Outbox Events Check
            var pendingOutboxCheck = new ReadinessCheck
            {
                Code = "PENDING_OUTBOX",
                Title = "Pending Outbox Events Check",
                Severity = ReadinessSeverity.Success,
                Message = "No pending outbox events."
            };
            report.Checks.Add(pendingOutboxCheck);
            try
            {
                var pendingOutboxCount = await _context.OutboxEvents
                    .Where(o => o.Status == "Pending")
                    .CountAsync();
                if (pendingOutboxCount > 0)
                {
                    pendingOutboxCheck.Severity = ReadinessSeverity.Warning;
                    pendingOutboxCheck.Message = $"{pendingOutboxCount} pending outbox sync events.";
                }
            }
            catch (Exception ex)
            {
                pendingOutboxCheck.Severity = ReadinessSeverity.Warning;
                pendingOutboxCheck.Message = $"Failed to check pending outbox events: {ex.Message}";
            }

            return report;
        }

        public async Task<bool> ExecuteUpdateAsync(string manifestJson)
        {
            _logger.LogInformation("Executing OTA update sequence...");

            Guid deploymentId = Guid.Empty;
            string version = "";
            try
            {
                using var doc = JsonDocument.Parse(manifestJson);
                var root = doc.RootElement;

                if (root.TryGetProperty("deploymentId", out var depProp)) Guid.TryParse(depProp.GetString(), out deploymentId);
                version = root.TryGetProperty("version", out var verProp) ? verProp.GetString() ?? "" : "";
                var checksumSha256 = root.TryGetProperty("checksumSha256", out var checkProp) ? checkProp.GetString() ?? "" : "";
                var downloadUrl = root.TryGetProperty("downloadUrl", out var urlProp) ? urlProp.GetString() ?? "" : "";

                // 1 & 2. Run Readiness Assessment Safety Gate
                var readinessReport = await AssessUpdateReadinessAsync(manifestJson);
                if (!readinessReport.CanInstall)
                {
                    var errors = string.Join("; ", readinessReport.Checks.Where(c => c.Severity == ReadinessSeverity.Error).Select(c => c.Message));
                    _logger.LogError("Update execution blocked by hard blockers: {Errors}", errors);
                    if (deploymentId != Guid.Empty) await ReportProgressAsync(deploymentId, "Failed", $"{{\"error\":\"Readiness checks failed: {errors}\"}}");
                    return false;
                }

                Guid backupId = Guid.Empty;
                if (root.TryGetProperty("backupId", out var backupProp) && backupProp.ValueKind == JsonValueKind.String)
                {
                    Guid.TryParse(backupProp.GetString(), out backupId);
                }

                if (backupId == Guid.Empty && readinessReport.BackupId.HasValue)
                {
                    backupId = readinessReport.BackupId.Value;
                    _logger.LogInformation("Reusing backup created during readiness check: {BackupId}", backupId);
                }

                if (backupId == Guid.Empty)
                {
                    _logger.LogInformation("Creating pre-update database backup snapshot...");
                    try
                    {
                        backupId = await _backupService.ExecuteBackupAsync("Full");
                        _logger.LogInformation("Pre-update backup generated successfully: {BackupId}", backupId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Backup failed. Aborting update for safety.");
                        if (deploymentId != Guid.Empty) await ReportProgressAsync(deploymentId, "Failed", $"{{\"error\":\"Pre-update backup failed: {ex.Message}\"}}");
                        return false;
                    }
                }

                // 3. Download package
                var tempDir = Path.Combine(AppContext.BaseDirectory, "temp_downloads");
                Directory.CreateDirectory(tempDir);
                var targetZipPath = Path.Combine(tempDir, $"v{version}.zip");
                var stateFilePath = Path.Combine(tempDir, "download_state.json");

                // Get base URL of Middleware
                var apiUrl = _configuration["Middleware:ApiUrl"] ?? "http://localhost:5069/api/events";
                var baseUrl = apiUrl.Replace("/api/events", "");
                var fullDownloadUrl = $"{baseUrl}{downloadUrl}";

                var downloadSuccess = await DownloadPackageWithResumeAsync(fullDownloadUrl, checksumSha256, targetZipPath, stateFilePath, deploymentId);
                if (!downloadSuccess)
                {
                    if (deploymentId != Guid.Empty) await ReportProgressAsync(deploymentId, "Failed", "{\"error\":\"Resumable download failed or checksum mismatch.\"}");
                    return false;
                }

                // 4. Staging Validation
                var stageDir = Path.Combine(AppContext.BaseDirectory, "updates", $"v{version}");
                var stageSuccess = await StageAndValidatePackageAsync(targetZipPath, stageDir, version, deploymentId);
                if (!stageSuccess)
                {
                    if (deploymentId != Guid.Empty) await ReportProgressAsync(deploymentId, "Failed", "{\"error\":\"Package extraction or validation failed.\"}");
                    return false;
                }

                // Write update_state.json transaction file
                var transactionStatePath = Path.Combine(stageDir, "update_state.json");
                var transactionState = new
                {
                    DeploymentId = deploymentId,
                    Version = version,
                    BackupId = backupId,
                    BackupFilePath = Path.Combine(AppContext.BaseDirectory, "Backups", $"backup_{backupId}.zip.enc"),
                    Status = "Installing"
                };
                await File.WriteAllTextAsync(transactionStatePath, JsonSerializer.Serialize(transactionState));

                // 6. Launch Updater and Exit
                var targetDir = AppContext.BaseDirectory;
                var backupDir = Path.Combine(targetDir, "backup");
                var currentProcess = Process.GetCurrentProcess();
                var updaterExePath = Path.Combine(targetDir, "SynOS.Updater.exe");
                
                if (!File.Exists(updaterExePath))
                {
                    // Check project bin directory during developer debug runs
                    updaterExePath = Path.Combine(targetDir, "..", "SynOS.Updater", "bin", "Debug", "net8.0", "SynOS.Updater.exe");
                }

                if (!File.Exists(updaterExePath))
                {
                    _logger.LogError("SynOS.Updater.exe not found at: {Path}", updaterExePath);
                    if (deploymentId != Guid.Empty) await ReportProgressAsync(deploymentId, "Failed", "{\"error\":\"Updater executable not found.\"}");
                    return false;
                }

                var launchPath = Path.Combine(targetDir, "SynOS.Api.exe");
                if (!File.Exists(launchPath))
                {
                    launchPath = Path.Combine(targetDir, "SynOS.Api.dll");
                }

                var args = $"--action install --target-dir \"{targetDir}\" --stage-dir \"{stageDir}\" --backup-dir \"{backupDir}\" --process-id {currentProcess.Id} --launch-path \"{launchPath}\"";
                
                _logger.LogWarning("Launching SynOS.Updater.exe detached...");
                await ReportProgressAsync(deploymentId, "Installing");

                var startInfo = new ProcessStartInfo
                {
                    FileName = updaterExePath,
                    Arguments = args,
                    UseShellExecute = true,
                    CreateNoWindow = false
                };

                Process.Start(startInfo);

                _ = Task.Run(async () =>
                {
                    await Task.Delay(1000);
                    Environment.Exit(0);
                });

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OTA Update failed.");
                if (deploymentId != Guid.Empty) await ReportProgressAsync(deploymentId, "Failed", $"{{\"error\":\"{ex.Message}\"}}");
                return false;
            }
        }

        public Task<bool> RollbackUpdateAsync(string manifestJson)
        {
            // Handled directly via SynOS.Updater rollback executable logic and Program.cs database rollback
            return Task.FromResult(true);
        }

        private async Task<bool> DownloadPackageWithResumeAsync(string downloadUrl, string checksumSha256, string zipPath, string statePath, Guid deploymentId)
        {
            _logger.LogInformation("Starting download from {Url}...", downloadUrl);
            await ReportProgressAsync(deploymentId, "Downloading");

            long existingLength = 0;
            if (File.Exists(zipPath))
            {
                existingLength = new FileInfo(zipPath).Length;
                _logger.LogInformation("Found existing partial download file of size {Size} bytes.", existingLength);
            }

            try
            {
                using var client = new HttpClient();
                var request = new HttpRequestMessage(HttpMethod.Get, downloadUrl);
                
                if (existingLength > 0)
                {
                    request.Headers.Range = new System.Net.Http.Headers.RangeHeaderValue(existingLength, null);
                }

                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
                
                if (response.StatusCode == System.Net.HttpStatusCode.RequestedRangeNotSatisfiable)
                {
                    _logger.LogWarning("Requested range was not satisfiable. Resetting file download.");
                    File.Delete(zipPath);
                    existingLength = 0;
                    return await DownloadPackageWithResumeAsync(downloadUrl, checksumSha256, zipPath, statePath, deploymentId);
                }

                response.EnsureSuccessStatusCode();

                using var responseStream = await response.Content.ReadAsStreamAsync();
                using var fileStream = new FileStream(zipPath, existingLength > 0 ? FileMode.Append : FileMode.Create, FileAccess.Write, FileShare.None);
                
                var buffer = new byte[81920];
                int bytesRead;
                while ((bytesRead = await responseStream.ReadAsync(buffer, 0, buffer.Length)) > 0)
                {
                    await fileStream.WriteAsync(buffer, 0, bytesRead);
                }

                fileStream.Close();

                // Compute hash check
                string actualChecksum;
                using (var sha256 = SHA256.Create())
                using (var readStream = new FileStream(zipPath, FileMode.Open, FileAccess.Read))
                {
                    var hashBytes = await sha256.ComputeHashAsync(readStream);
                    actualChecksum = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                }

                if (!string.Equals(actualChecksum, checksumSha256, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogError("Checksum mismatch! Expected: {Expected}, Actual: {Actual}.", checksumSha256, actualChecksum);
                    File.Delete(zipPath);
                    return false;
                }

                _logger.LogInformation("Download completed and checksum verified successfully.");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to download release package.");
                return false;
            }
        }

        private async Task<bool> StageAndValidatePackageAsync(string zipPath, string stageDir, string version, Guid deploymentId)
        {
            try
            {
                _logger.LogInformation("Extracting package to staging folder {StageDir}...", stageDir);
                if (Directory.Exists(stageDir)) Directory.Delete(stageDir, true);
                Directory.CreateDirectory(stageDir);

                System.IO.Compression.ZipFile.ExtractToDirectory(zipPath, stageDir);

                // Package Validation Stage: verify release.json and all required application files are present
                var manifestPath = Path.Combine(stageDir, "release.json");
                if (!File.Exists(manifestPath))
                {
                    _logger.LogError("Validation Fail: release.json is missing in package.");
                    return false;
                }

                var exePath = Path.Combine(stageDir, "SynOS.Api.exe");
                if (!File.Exists(exePath))
                {
                    // Fallback to checking SynOS.Api.dll for compilation compatibility
                    var dllPath = Path.Combine(stageDir, "SynOS.Api.dll");
                    if (!File.Exists(dllPath))
                    {
                        _logger.LogError("Validation Fail: Target assembly SynOS.Api.dll is missing in package.");
                        return false;
                    }
                }

                _logger.LogInformation("Staging verification checks passed.");
                await ReportProgressAsync(deploymentId, "Staged");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Package validation stage failed.");
                return false;
            }
        }

        private async Task ReportProgressAsync(Guid deploymentId, string eventType, string? payloadJson = null)
        {
            try
            {
                using var client = new HttpClient();
                var apiUrl = _configuration["Middleware:ApiUrl"] ?? "http://localhost:5069/api/events";
                var baseUrl = apiUrl.Replace("/api/events", "");
                var requestUrl = $"{baseUrl}/api/controltower/deployments/events";
                var payload = new { DeploymentId = deploymentId, EventType = eventType, PayloadJson = payloadJson };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await client.PostAsync(requestUrl, content);
                _logger.LogInformation("Reported lifecycle event {EventType} to Middleware: {StatusCode}", eventType, response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to report lifecycle event {EventType}", eventType);
            }
        }
    }
}
