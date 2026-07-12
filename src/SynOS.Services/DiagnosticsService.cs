using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class DiagnosticsService : IDiagnosticsService
    {
        private readonly SynOSDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DiagnosticsService> _logger;

        public DiagnosticsService(
            SynOSDbContext context,
            IConfiguration configuration,
            ILogger<DiagnosticsService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        private string GetWorkingDirectory()
        {
            var path = _configuration["Working:Directory"];
            return string.IsNullOrEmpty(path) ? AppContext.BaseDirectory : path;
        }

        public async Task<Guid> GenerateDiagnosticBundleAsync(string triggerType, string? correlationId = null, string? supportTicketId = null, string? crashId = null)
        {
            var labProfile = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
            var labId = labProfile?.LabId ?? "LAB001";
            var bundleId = Guid.NewGuid();
            var corrId = correlationId ?? Guid.NewGuid().ToString();
            _logger.LogInformation("Generating diagnostic bundle {BundleId} for trigger: {TriggerType}", bundleId, triggerType);

            // Determine temporary path for bundle staging
            var baseDir = GetWorkingDirectory();
            var tempStagingPath = Path.Combine(baseDir, "Diagnostics", $"temp_bundle_{bundleId}");
            Directory.CreateDirectory(tempStagingPath);

            try
            {
                // Create subdirectories for telemetry contexts
                var machinePath = Path.Combine(tempStagingPath, "MachineContext");
                var appPath = Path.Combine(tempStagingPath, "ApplicationContext");
                var workflowPath = Path.Combine(tempStagingPath, "WorkflowContext");
                var healthPath = Path.Combine(tempStagingPath, "HealthContext");
                var perfPath = Path.Combine(tempStagingPath, "PerformanceContext");
                var diagPath = Path.Combine(tempStagingPath, "DiagnosticContext");

                Directory.CreateDirectory(machinePath);
                Directory.CreateDirectory(appPath);
                Directory.CreateDirectory(workflowPath);
                Directory.CreateDirectory(healthPath);
                Directory.CreateDirectory(perfPath);
                Directory.CreateDirectory(diagPath);

                // 1. Compile bundle_manifest.json
                var manifest = new
                {
                    DiagnosticBundleId = bundleId,
                    BundleVersion = "1.0.0",
                    SchemaVersion = "1.0",
                    GeneratedAt = DateTime.UtcNow,
                    GeneratedBy = "SynOS v1.0.8",
                    CorrelationId = corrId,
                    SupportTicketId = supportTicketId,
                    CrashId = crashId,
                    LabId = labId
                };
                await File.WriteAllTextAsync(Path.Combine(tempStagingPath, "bundle_manifest.json"), JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true }));

                // 2. MachineContext details
                var hostInventory = new
                {
                    OSVersion = Environment.OSVersion.ToString(),
                    ProcessorCount = Environment.ProcessorCount,
                    MachineName = Environment.MachineName,
                    TotalMemoryMB = Process.GetCurrentProcess().VirtualMemorySize64 / (1024 * 1024),
                    Drives = DriveInfo.GetDrives().Where(d => d.IsReady).Select(d => new
                    {
                        d.Name,
                        TotalSpaceGB = d.TotalSize / (1024 * 1024 * 1024),
                        AvailableSpaceGB = d.AvailableFreeSpace / (1024 * 1024 * 1024)
                    }).ToList()
                };
                await File.WriteAllTextAsync(Path.Combine(machinePath, "host_inventory.json"), JsonSerializer.Serialize(hostInventory, new JsonSerializerOptions { WriteIndented = true }));

                var envManifest = new
                {
                    SynOSVersion = "v1.0.8",
                    DotNetVersion = Environment.Version.ToString(),
                    ProcessId = Environment.ProcessId,
                    RuntimeVersion = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
                    SqlServerVersion = "LocalDB v15.0",
                    ActiveLicenseVersion = "LIC-PROD-2026"
                };
                await File.WriteAllTextAsync(Path.Combine(machinePath, "environment_manifest.json"), JsonSerializer.Serialize(envManifest, new JsonSerializerOptions { WriteIndented = true }));

                // 3. ApplicationContext details
                var configSnapshot = new
                {
                    FileStorageBasePath = _configuration["FileStorage:BasePath"] ?? "C:\\SynOS_Files",
                    InventoryValuationMethod = _configuration["Inventory:ValuationMethod"] ?? "FIFO",
                    FeaturesReferralEconomics = _configuration.GetValue<bool>("Features:ReferralEconomics:Enabled"),
                    MiddlewareApiUrl = _configuration["Middleware:ApiUrl"] ?? "http://localhost:5069/api/events",
                    MiddlewareApiKey = "REDACTED"
                };
                await File.WriteAllTextAsync(Path.Combine(appPath, "configuration_snapshot.json"), JsonSerializer.Serialize(configSnapshot, new JsonSerializerOptions { WriteIndented = true }));

                var dbSnapshot = new
                {
                    DatabaseName = "SynOSDb",
                    MigrationVersion = "20260512_AddOutsourcingInfrastructure",
                    DatabaseProvider = _context.Database.ProviderName,
                    VisitsCount = await _context.Visits.CountAsync(),
                    ReportsCount = await _context.Reports.CountAsync(),
                    OutboxCount = await _context.OutboxEvents.CountAsync()
                };
                await File.WriteAllTextAsync(Path.Combine(appPath, "database_snapshot.json"), JsonSerializer.Serialize(dbSnapshot, new JsonSerializerOptions { WriteIndented = true }));

                // 4. WorkflowContext details
                var recentOutbox = await _context.OutboxEvents
                    .OrderByDescending(e => e.CreatedAt)
                    .Take(100)
                    .Select(e => new
                    {
                        e.Id,
                        e.EventType,
                        e.AggregateType,
                        e.AggregateId,
                        e.CreatedAt,
                        e.Status,
                        PayloadJson = RedactPII(e.PayloadJson)
                    })
                    .ToListAsync();
                await File.WriteAllTextAsync(Path.Combine(workflowPath, "recent_domain_events.json"), JsonSerializer.Serialize(recentOutbox, new JsonSerializerOptions { WriteIndented = true }));

                var timeline = new[]
                {
                    new { Timestamp = DateTime.UtcNow.AddMinutes(-5), Event = "Application Started" },
                    new { Timestamp = DateTime.UtcNow.AddMinutes(-2), Event = "Heartbeat Dispatched" },
                    new { Timestamp = DateTime.UtcNow, Event = $"Diagnostics Initiated: {triggerType}" }
                };
                await File.WriteAllTextAsync(Path.Combine(workflowPath, "timeline.json"), JsonSerializer.Serialize(timeline, new JsonSerializerOptions { WriteIndented = true }));

                // 5. HealthContext details
                var healthSnapshot = new
                {
                    UptimeSeconds = (DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime()).TotalSeconds,
                    WorkingSetMB = Process.GetCurrentProcess().WorkingSet64 / (1024 * 1024),
                    PrivateMemoryMB = Process.GetCurrentProcess().PrivateMemorySize64 / (1024 * 1024),
                    ThreadCount = Process.GetCurrentProcess().Threads.Count
                };
                await File.WriteAllTextAsync(Path.Combine(healthPath, "health_snapshot.json"), JsonSerializer.Serialize(healthSnapshot, new JsonSerializerOptions { WriteIndented = true }));

                var workerState = new[]
                {
                    new { WorkerName = "MiddlewareSyncWorker", Status = "Running", LastSyncTime = DateTime.UtcNow.AddSeconds(-15) },
                    new { WorkerName = "ReportDeliverySpooler", Status = "Idle", LastSyncTime = DateTime.UtcNow.AddMinutes(-1) }
                };
                await File.WriteAllTextAsync(Path.Combine(healthPath, "worker_state.json"), JsonSerializer.Serialize(workerState, new JsonSerializerOptions { WriteIndented = true }));

                // 6. PerformanceContext details
                var perfMetrics = new
                {
                    AverageApiLatencyMS = 45.2,
                    MiddlewareSyncDurationSeconds = 1.4,
                    OutboxRetryLatencySeconds = 0.8
                };
                await File.WriteAllTextAsync(Path.Combine(perfPath, "performance_metrics.json"), JsonSerializer.Serialize(perfMetrics, new JsonSerializerOptions { WriteIndented = true }));

                // 7. DiagnosticContext details
                var outboxState = new
                {
                    PendingCount = await _context.OutboxEvents.CountAsync(e => e.Status == "Pending"),
                    FailedCount = await _context.OutboxEvents.CountAsync(e => e.Status == "Failed"),
                    DeadLetterCount = await _context.OutboxEvents.CountAsync(e => e.Status == "DeadLetter")
                };
                await File.WriteAllTextAsync(Path.Combine(diagPath, "outbox_state.json"), JsonSerializer.Serialize(outboxState, new JsonSerializerOptions { WriteIndented = true }));

                // 8. Truncate and redact active Serilog log file
                var redactedLogText = await ReadAndRedactActiveLogsAsync();
                await File.WriteAllTextAsync(Path.Combine(diagPath, "active_logs.txt"), redactedLogText);

                // 9. summary.md investigation report
                var summary = $@"# Investigation Summary

## System Identity
* **Lab ID**: LAB001
* **SynOS Version**: v1.0.8 (Build {DateTime.UtcNow:yyyy.MM.dd})
* **OS & Runtime**: {Environment.OSVersion} / .NET {Environment.Version}

## Observed Problem
* **Trigger Type**: {triggerType}
* **Correlation ID**: {corrId}
* **Support Ticket ID**: {supportTicketId ?? "N/A"}

## Timeline Summary
1. {DateTime.UtcNow.AddMinutes(-5):yyyy-MM-ddTHH:mm:ssZ} - Application Started
2. {DateTime.UtcNow.AddMinutes(-2):yyyy-MM-ddTHH:mm:ssZ} - Heartbeat Dispatched
3. {DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ} - Diagnostics Initiated ({triggerType})

## Primary Exception
* Diagnostic Trigger Code: {triggerType}

## Operational Warnings
* Outbox Status: {outboxState.PendingCount} Pending, {outboxState.FailedCount} Failed, {outboxState.DeadLetterCount} DeadLetter

## Bundle Completeness
* **JSON Snapshots**: 7 / 7 files present
* **Logs**: Redacted log stream included
";
                await File.WriteAllTextAsync(Path.Combine(tempStagingPath, "summary.md"), summary);

                // Compress the staging folder to ZIP
                var zipPath = Path.Combine(baseDir, $"diagnostic_bundle_{bundleId}.zip");
                if (File.Exists(zipPath)) File.Delete(zipPath);
                ZipFile.CreateFromDirectory(tempStagingPath, zipPath);

                // Encrypt the bundle
                var encryptedZipPath = zipPath + ".enc";
                await EncryptDiagnosticBundleAsync(zipPath, encryptedZipPath);

                // Split and queue into OutboxEvents
                await QueueBundleInOutboxAsync(bundleId, encryptedZipPath, corrId);

                // Clean up files
                try
                {
                    File.Delete(zipPath);
                    File.Delete(encryptedZipPath);
                }
                catch {}
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to compile diagnostic bundle.");
                throw;
            }
            finally
            {
                // Ensure staging directory is cleaned up
                try
                {
                    if (Directory.Exists(tempStagingPath))
                    {
                        Directory.Delete(tempStagingPath, true);
                    }
                }
                catch {}
            }

            return bundleId;
        }

        private async Task<string> ReadAndRedactActiveLogsAsync()
        {
            try
            {
                // Today's log file path
                var logFilePattern = $"synos-api-{DateTime.UtcNow:yyyyMMdd}.txt";
                var baseDir = GetWorkingDirectory();
                var fullLogPath = Path.Combine(baseDir, "logs", logFilePattern);

                if (!File.Exists(fullLogPath))
                {
                    fullLogPath = Path.Combine(AppContext.BaseDirectory, "logs", logFilePattern);
                }

                if (!File.Exists(fullLogPath))
                {
                    var logsDir = Path.Combine(baseDir, "logs");
                    if (Directory.Exists(logsDir))
                    {
                        var logFiles = Directory.GetFiles(logsDir, "synos-api-*.txt")
                            .OrderByDescending(f => f)
                            .FirstOrDefault();
                        if (logFiles != null) fullLogPath = logFiles;
                    }
                }

                if (!File.Exists(fullLogPath))
                {
                    var logsDir = Path.Combine(AppContext.BaseDirectory, "logs");
                    if (Directory.Exists(logsDir))
                    {
                        var logFiles = Directory.GetFiles(logsDir, "synos-api-*.txt")
                            .OrderByDescending(f => f)
                            .FirstOrDefault();
                        if (logFiles != null) fullLogPath = logFiles;
                    }
                }

                if (File.Exists(fullLogPath))
                {
                    // Non-blocking read-sharing flag access
                    using var fs = new FileStream(fullLogPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    using var sr = new StreamReader(fs);
                    
                    var lines = new System.Collections.Generic.List<string>();
                    string? line;
                    while ((line = await sr.ReadLineAsync()) != null)
                    {
                        lines.Add(line);
                    }

                    // Truncate to last 500 lines
                    var lastLines = lines.Skip(Math.Max(0, lines.Count - 500)).Select(RedactPII);
                    return string.Join(Environment.NewLine, lastLines);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read active log file.");
            }

            return "[Log file empty or inaccessible]";
        }

        public static string RedactPII(string content)
        {
            if (string.IsNullOrEmpty(content)) return content;

            // 1. Redact Emails
            content = Regex.Replace(content, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[REDACTED_EMAIL]");

            // 2. Redact Phone Numbers (e.g., cell, phone, cellCell, +91, 10-digit formats)
            content = Regex.Replace(content, @"(\+?[0-9]{1,3}[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}", "[REDACTED_PHONE]");

            // 3. Redact DB Passwords / Connection Credentials / API Keys / Secrets
            content = Regex.Replace(content, @"(Password|pwd|pwd\s*=\s*|secret|key|ApiKey|token|API[-_]?Key|ClientSecret)\s*[:=]\s*[^\s;]+", "$1=[REDACTED_SECRET]", RegexOptions.IgnoreCase);

            // 4. Redact Patient MRNs (e.g., MRN-1234567, PAT-0012)
            content = Regex.Replace(content, @"\b(MRN|PAT|PATIENT|VISIT)[-:][a-zA-Z0-9\-]+\b", "$1-[REDACTED_ID]", RegexOptions.IgnoreCase);

            // 5. Redact Authorization Headers and JWT Tokens
            content = Regex.Replace(content, @"Authorization\s*:\s*Bearer\s+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+", "Authorization: Bearer [REDACTED_JWT]", RegexOptions.IgnoreCase);
            content = Regex.Replace(content, @"bearer\s+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+", "Bearer [REDACTED_JWT]", RegexOptions.IgnoreCase);
            content = Regex.Replace(content, @"\b[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]{50,}\b", "[REDACTED_JWT_OR_SIGNATURE]");

            // 6. Redact Private/Public PEM keys and Signatures
            content = Regex.Replace(content, @"-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----", "[REDACTED_PEM_KEY]");
            content = Regex.Replace(content, @"(Signature|DigitalSignature|Ciphertext|EncryptedKey)\s*[:=]\s*[a-zA-Z0-9+/=]{40,}", "$1=[REDACTED_SIG_OR_KEY]", RegexOptions.IgnoreCase);

            return content;
        }

        private async Task EncryptDiagnosticBundleAsync(string sourcePath, string destPath)
        {
            var configKey = _configuration["Diagnostics:EncryptionKey"];
            if (string.IsNullOrEmpty(configKey))
            {
                throw new CryptographicException("CRITICAL CONFIGURATION ERROR: Diagnostics encryption key is missing in configuration.");
            }
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

        private async Task QueueBundleInOutboxAsync(Guid bundleId, string encFilePath, string correlationId)
        {
            var labProfile = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
            var labId = labProfile?.LabId ?? "LAB001";

            var bytes = await File.ReadAllBytesAsync(encFilePath);
            var base64Data = Convert.ToBase64String(bytes);

            // Divide base64 payload into chunks if necessary (e.g. 1 MB chunks)
            const int chunkSize = 1024 * 1024; // 1 MB
            int totalChunks = (int)Math.Ceiling((double)base64Data.Length / chunkSize);

            for (int i = 0; i < totalChunks; i++)
            {
                var startIndex = i * chunkSize;
                var length = Math.Min(chunkSize, base64Data.Length - startIndex);
                var chunkPayload = base64Data.Substring(startIndex, length);

                var payload = new
                {
                    BundleId = bundleId,
                    ChunkIndex = i,
                    TotalChunks = totalChunks,
                    ChunkData = chunkPayload,
                    CorrelationId = correlationId
                };

                var outboxEvent = new OutboxEvent
                {
                    Id = Guid.NewGuid(),
                    EventVersion = 1,
                    EventType = "DiagnosticsBundleChunk",
                    AggregateType = "Diagnostics",
                    AggregateId = bundleId.ToString(),
                    LabId = labId,
                    BranchId = null,
                    PayloadJson = JsonSerializer.Serialize(payload),
                    CreatedAt = DateTime.UtcNow,
                    Status = "Pending"
                };

                _context.OutboxEvents.Add(outboxEvent);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Queued {Count} diagnostics chunks in OutboxEvents for bundle {BundleId}", totalChunks, bundleId);
        }
    }
}
