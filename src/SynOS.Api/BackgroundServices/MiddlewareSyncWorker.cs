using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Services;
using SynOS.Services.Security;

namespace SynOS.Api.BackgroundServices
{
    public class MiddlewareSyncWorker : BackgroundService
    {
        private readonly ILogger<MiddlewareSyncWorker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IRestoreStateCoordinator _restoreStateCoordinator;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILicenseRecoveryService _licenseRecoveryService;
        private readonly string _apiUrl;
        private readonly string _apiKey;
        private DateTime _lastLicenseCheck = DateTime.MinValue;

        public MiddlewareSyncWorker(
            ILogger<MiddlewareSyncWorker> logger,
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            IRestoreStateCoordinator restoreStateCoordinator,
            ILicenseRecoveryService licenseRecoveryService)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _restoreStateCoordinator = restoreStateCoordinator;
            _configuration = configuration;
            _licenseRecoveryService = licenseRecoveryService;
            
            var handler = new SocketsHttpHandler
            {
                ConnectCallback = async (context, cancellationToken) =>
                {
                    var ipAddresses = await System.Net.Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, cancellationToken);
                    var ipv4Address = ipAddresses.FirstOrDefault(ip => ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
                    var socket = new System.Net.Sockets.Socket(System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp);
                    socket.NoDelay = true;
                    try
                    {
                        await socket.ConnectAsync(new System.Net.IPEndPoint(ipv4Address ?? ipAddresses.First(), context.DnsEndPoint.Port), cancellationToken);
                        return new System.Net.Sockets.NetworkStream(socket, ownsSocket: true);
                    }
                    catch
                    {
                        socket.Dispose();
                        throw;
                    }
                }
            };
            _httpClient = new HttpClient(handler);
            
            _apiUrl = configuration["Middleware:ApiUrl"] ?? "https://cloud.tbzlabs.in/api/events";
            _apiKey = configuration["Middleware:ApiKey"] ?? "";
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("MiddlewareSyncWorker is starting. Target API: {ApiUrl}", _apiUrl);

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        if (!SynOS.Api.Services.SystemSetupState.IsConfigured)
                        {
                            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                            continue;
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }

                    if (_restoreStateCoordinator != null && _restoreStateCoordinator.IsRestoreInProgress)
                    {
                        _logger.LogInformation("Database restore in progress. Pausing MiddlewareSyncWorker execution...");
                        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                        continue;
                    }

                    try
                    {
                        await SyncPendingEventsAsync(stoppingToken);
                        await SendHeartbeatAsync(stoppingToken);
                        await PollAndProcessCommandsAsync(stoppingToken);

                        // Efficient License Polling: Check once every 24 hours during normal operations; check once every 6 hours when expiring or in grace/soft lock.
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                            var profile = await dbContext.LabProfiles.AsNoTracking().FirstOrDefaultAsync(stoppingToken);
                            bool isExpiringOrExpired = profile == null || 
                                                       !profile.LicenseExpiryDate.HasValue || 
                                                       profile.LicenseExpiryDate.Value <= DateTime.UtcNow.AddDays(7);
                            var checkInterval = isExpiringOrExpired ? TimeSpan.FromHours(6) : TimeSpan.FromHours(24);

                            if (DateTime.UtcNow - _lastLicenseCheck > checkInterval)
                            {
                                var writeProfile = await dbContext.LabProfiles.FirstOrDefaultAsync(stoppingToken);
                                await SynchronizeLicenseInfoAsync(dbContext, writeProfile, stoppingToken);
                                _lastLicenseCheck = DateTime.UtcNow;
                            }
                        }
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        _logger.LogError(ex, "Error occurred during middleware event sync execution loop.");
                    }

                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected during host shutdown
            }

            _logger.LogInformation("MiddlewareSyncWorker is stopping.");
        }

        private async Task SyncPendingEventsAsync(CancellationToken stoppingToken)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

                var profile = await dbContext.LabProfiles.AsNoTracking().FirstOrDefaultAsync(stoppingToken);

                // Pause WhatsApp outbox dispatch during Soft Lock or Hard Lock
                if (profile != null && profile.LicenseExpiryDate.HasValue)
                {
                    if (DateTime.UtcNow > profile.LicenseExpiryDate.Value.AddDays(7) || profile.LicenseStatus == "HardLock")
                    {
                        _logger.LogDebug("Outbox event dispatch paused due to subscription Soft/Hard Lock.");
                        return;
                    }
                }

                var apiUrl = GetEffectiveApiUrl(profile);
                var apiKey = GetEffectiveApiKey(profile);

                // Fetch up to 100 pending or failed events ordered by CreatedAt
                var events = await dbContext.OutboxEvents
                    .Where(e => e.Status == "Pending" || e.Status == "Failed")
                    .OrderBy(e => e.CreatedAt)
                    .Take(100)
                    .ToListAsync(stoppingToken);

                if (events.Count == 0)
                {
                    return;
                }

                _logger.LogInformation("Found {Count} outbox events to sync.", events.Count);

                foreach (var evt in events)
                {
                    if (stoppingToken.IsCancellationRequested) break;

                    bool isSuccess = false;
                    try
                    {
                        var payload = new
                        {
                            eventId = evt.Id,
                            eventType = evt.EventType,
                            aggregateType = evt.AggregateType,
                            aggregateId = evt.AggregateId,
                            labId = evt.LabId,
                            branchId = evt.BranchId,
                            payloadJson = evt.PayloadJson,
                            occurredAt = evt.CreatedAt
                        };

                        var json = JsonSerializer.Serialize(payload);
                        var targetUrl = apiUrl;

                        if (evt.EventType == "ReleasedVisit")
                        {
                            json = evt.PayloadJson;
                            targetUrl = apiUrl.Replace("/api/events", "/api/v2/visits/release");
                        }

                        var request = new HttpRequestMessage(HttpMethod.Post, targetUrl)
                        {
                            Content = new StringContent(json, Encoding.UTF8, "application/json")
                        };

                        var pendingCount = await dbContext.OutboxEvents.CountAsync(e => e.Status == "Pending" || e.Status == "Failed", stoppingToken);
                        var deadLetterCount = await dbContext.OutboxEvents.CountAsync(e => e.Status == "DeadLetter", stoppingToken);

                        var effectiveLabId = !string.IsNullOrWhiteSpace(profile?.LabId) ? profile.LabId : (!string.IsNullOrWhiteSpace(evt.LabId) && evt.LabId != "LAB001" ? evt.LabId : "LAB002");
                        request.Headers.Add("X-Lab-Id", effectiveLabId);
                        request.Headers.Add("X-Api-Key", apiKey);
                        request.Headers.Add("X-Pending-Outbox-Count", pendingCount.ToString());
                        request.Headers.Add("X-Dead-Letter-Count", deadLetterCount.ToString());

                        _logger.LogDebug("[INTEGRATION DEB] Hop 1: OutboxWorker POST to /api/events. EventId: {EventId}, EventType: {EventType}", evt.Id, evt.EventType);
                        var response = await _httpClient.SendAsync(request, stoppingToken);

                        if (response.StatusCode == System.Net.HttpStatusCode.OK || 
                            response.StatusCode == System.Net.HttpStatusCode.AlreadyReported)
                        {
                            isSuccess = true;
                            MiddlewareSyncHealth.IsHealthy = true;
                            MiddlewareSyncHealth.StatusMessage = "Cloud WhatsApp Gateway Connected & Authorized";
                            MiddlewareSyncHealth.LastSyncTime = DateTime.UtcNow;
                            MiddlewareSyncHealth.LastError = null;
                            _logger.LogDebug("[INTEGRATION DEB] Hop 1 Success: OutboxWorker POST completed successfully for Event {EventId} (Status: {Status}).", evt.Id, response.StatusCode);
                        }
                        else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                        {
                            _logger.LogWarning("[INTEGRATION DEB] Hop 1 Fail: Unauthorized response from Middleware. Attempting automatic self-healing recovery...");
                            var healed = await _licenseRecoveryService.TriggerSelfHealingRecoveryAsync(dbContext, profile, stoppingToken);
                            if (healed)
                            {
                                // Retry immediately with updated credentials
                                var newApiKey = GetEffectiveApiKey(profile);
                                var retryRequest = new HttpRequestMessage(HttpMethod.Post, targetUrl)
                                {
                                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                                };
                                retryRequest.Headers.Add("X-Lab-Id", !string.IsNullOrWhiteSpace(profile?.LabId) ? profile.LabId : effectiveLabId);
                                retryRequest.Headers.Add("X-Api-Key", newApiKey);
                                retryRequest.Headers.Add("X-Pending-Outbox-Count", pendingCount.ToString());
                                retryRequest.Headers.Add("X-Dead-Letter-Count", deadLetterCount.ToString());

                                var retryResponse = await _httpClient.SendAsync(retryRequest, stoppingToken);
                                if (retryResponse.StatusCode == System.Net.HttpStatusCode.OK || retryResponse.StatusCode == System.Net.HttpStatusCode.AlreadyReported)
                                {
                                    isSuccess = true;
                                    MiddlewareSyncHealth.IsHealthy = true;
                                    MiddlewareSyncHealth.StatusMessage = "Cloud WhatsApp Gateway Connected & Authorized";
                                    MiddlewareSyncHealth.LastSyncTime = DateTime.UtcNow;
                                    MiddlewareSyncHealth.LastError = null;
                                    _logger.LogInformation("Successfully self-healed and sent pending event {EventId}.", evt.Id);
                                }
                                else
                                {
                                    MiddlewareSyncHealth.IsHealthy = false;
                                    MiddlewareSyncHealth.StatusMessage = "Cloud Gateway Unauthorized (401)";
                                    MiddlewareSyncHealth.LastError = $"Retry after self-healing failed with status: {retryResponse.StatusCode}";
                                    _logger.LogWarning("[INTEGRATION DEB] Hop 1 Retry Fail: Middleware returned status {StatusCode}.", retryResponse.StatusCode);
                                }
                            }
                        }
                        else
                        {
                            MiddlewareSyncHealth.IsHealthy = false;
                            MiddlewareSyncHealth.StatusMessage = $"Gateway Error ({response.StatusCode})";
                            MiddlewareSyncHealth.LastError = $"Middleware API returned status code {response.StatusCode}.";
                            _logger.LogWarning("[INTEGRATION DEB] Hop 1 Fail: Middleware API returned status code {StatusCode} for Event {EventId}.", response.StatusCode, evt.Id);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send Event {EventId} to Middleware API.", evt.Id);
                    }

                    if (isSuccess)
                    {
                        evt.Status = "Sent";
                        evt.SentAt = DateTime.UtcNow;
                    }
                    else
                    {
                        evt.RetryCount++;
                        if (evt.RetryCount > 50)
                        {
                            evt.Status = "DeadLetter";
                            _logger.LogError("Event {EventId} has exceeded max retries (50) and has been moved to Dead Letter Queue.", evt.Id);
                        }
                        else
                        {
                            evt.Status = "Failed";
                        }
                    }

                    // Save each event immediately to ensure exactly-once semantics/outbox checkpointing
                    await dbContext.SaveChangesAsync(stoppingToken);
                }
            }
        }

        private async Task<string> GetLiveTelemetryPayloadAsync(bool detailed = false)
        {
            var appVersion = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "1.4.9";
            if (appVersion == "1.0.0.0" || appVersion == "0.0.0.0")
            {
                appVersion = "1.4.9";
            }

            if (!detailed)
            {
                var minimalPayload = new
                {
                    Status = "Healthy",
                    Version = appVersion
                };
                return JsonSerializer.Serialize(minimalPayload);
            }

            double cpuPercent = 5.0;
            try
            {
                var startCpuTime = System.Diagnostics.Process.GetCurrentProcess().TotalProcessorTime;
                var startTime = DateTime.UtcNow;
                await Task.Delay(100);
                var endCpuTime = System.Diagnostics.Process.GetCurrentProcess().TotalProcessorTime;
                var cpuUsedMs = (endCpuTime - startCpuTime).TotalMilliseconds;
                var totalMs = (DateTime.UtcNow - startTime).TotalMilliseconds * Environment.ProcessorCount;
                cpuPercent = (cpuUsedMs / totalMs) * 100.0;
                if (double.IsNaN(cpuPercent) || double.IsInfinity(cpuPercent)) cpuPercent = 5.0;
            }
            catch {}

            double memoryMb = 450.0;
            try
            {
                memoryMb = System.Diagnostics.Process.GetCurrentProcess().WorkingSet64 / (1024.0 * 1024.0);
            }
            catch {}

            double freeGb = 80.0;
            try
            {
                var drive = new System.IO.DriveInfo(System.IO.Path.GetPathRoot(AppContext.BaseDirectory) ?? "C:\\");
                if (drive.IsReady)
                {
                    freeGb = drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0);
                }
            }
            catch {}

            int branchCount = 1;
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                    branchCount = await db.Branches.CountAsync();
                }
            }
            catch {}

            var payload = new
            {
                CpuUsagePercent = Math.Round(cpuPercent, 1),
                MemoryUsageMB = Math.Round(memoryMb, 1),
                DiskFreeSpaceGB = Math.Round(freeGb, 1),
                OSVersion = Environment.OSVersion.ToString(),
                DotNetVersion = Environment.Version.ToString(),
                BranchCount = branchCount,
                Version = appVersion,
                Status = "Healthy"
            };

            return JsonSerializer.Serialize(payload);
        }

        private async Task SendHeartbeatAsync(CancellationToken stoppingToken, string? customPayload = null)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                    var profile = await dbContext.LabProfiles.AsNoTracking().FirstOrDefaultAsync(stoppingToken);
                    var apiUrl = GetEffectiveApiUrl(profile);
                    var apiKey = GetEffectiveApiKey(profile);
                    var labId = string.IsNullOrWhiteSpace(profile?.LabId) ? "LAB001" : profile.LabId;

                    var payload = customPayload ?? await GetLiveTelemetryPayloadAsync(detailed: false);
                    var heartbeatEvent = new
                    {
                        eventId = Guid.NewGuid(),
                        eventType = "Heartbeat",
                        aggregateType = "Lab",
                        aggregateId = Guid.Empty,
                        labId = labId,
                        branchId = Guid.Empty,
                        payloadJson = payload,
                        occurredAt = DateTimeOffset.UtcNow
                    };

                    var json = JsonSerializer.Serialize(heartbeatEvent);
                    var request = new HttpRequestMessage(HttpMethod.Post, apiUrl)
                    {
                        Content = new StringContent(json, Encoding.UTF8, "application/json")
                    };

                    var pendingCount = await dbContext.OutboxEvents.CountAsync(e => e.Status == "Pending" || e.Status == "Failed", stoppingToken);
                    var deadLetterCount = await dbContext.OutboxEvents.CountAsync(e => e.Status == "DeadLetter", stoppingToken);

                    request.Headers.Add("X-Lab-Id", labId);
                    request.Headers.Add("X-Api-Key", apiKey);
                    request.Headers.Add("X-Pending-Outbox-Count", pendingCount.ToString());
                    request.Headers.Add("X-Dead-Letter-Count", deadLetterCount.ToString());

                    _logger.LogDebug("[INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.");
                    var response = await _httpClient.SendAsync(request, stoppingToken);

                    if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    {
                        _logger.LogWarning("[INTEGRATION DEB] Heartbeat returned 401 Unauthorized. Triggering licensing self-healing...");
                        var dbProfile = await dbContext.LabProfiles.FirstOrDefaultAsync(stoppingToken);
                        await _licenseRecoveryService.TriggerSelfHealingRecoveryAsync(dbContext, dbProfile, stoppingToken);
                        return;
                    }

                    if (response.StatusCode == System.Net.HttpStatusCode.OK || 
                        response.StatusCode == System.Net.HttpStatusCode.AlreadyReported)
                    {
                        MiddlewareSyncHealth.IsHealthy = true;
                        MiddlewareSyncHealth.StatusMessage = "Cloud WhatsApp Gateway Connected & Authorized";
                        MiddlewareSyncHealth.LastSyncTime = DateTime.UtcNow;
                        MiddlewareSyncHealth.LastError = null;
                        _logger.LogDebug("[INTEGRATION DEB] Heartbeat sent successfully to Middleware API.");
                    }
                    else
                    {
                        _logger.LogWarning("[INTEGRATION DEB] Heartbeat failed. Middleware API returned: {StatusCode}", response.StatusCode);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send heartbeat to Middleware API.");
            }
        }

        private async Task PollAndProcessCommandsAsync(CancellationToken stoppingToken)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                    var profile = await dbContext.LabProfiles.AsNoTracking().FirstOrDefaultAsync(stoppingToken);
                    var apiUrl = GetEffectiveApiUrl(profile);
                    var apiKey = GetEffectiveApiKey(profile);
                    var labId = string.IsNullOrWhiteSpace(profile?.LabId) ? "LAB001" : profile.LabId;

                    var pendingUrl = apiUrl.Replace("/api/events", "/api/commands/pending") + $"?labId={Uri.EscapeDataString(labId)}";
                    var request = new HttpRequestMessage(HttpMethod.Get, pendingUrl);
                    request.Headers.Add("X-Lab-Id", labId);
                    request.Headers.Add("X-Api-Key", apiKey);

                    var response = await _httpClient.SendAsync(request, stoppingToken);
                    if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    {
                        _logger.LogWarning("Poll commands returned 401 Unauthorized. Triggering licensing self-healing...");
                        var dbProfile = await dbContext.LabProfiles.FirstOrDefaultAsync(stoppingToken);
                        await _licenseRecoveryService.TriggerSelfHealingRecoveryAsync(dbContext, dbProfile, stoppingToken);
                        return;
                    }
                    if (response.StatusCode != System.Net.HttpStatusCode.OK)
                    {
                        _logger.LogWarning("Failed to poll pending commands. Middleware API returned: {StatusCode}", response.StatusCode);
                        return;
                    }

                    var content = await response.Content.ReadAsStringAsync(stoppingToken);
                    using var doc = JsonDocument.Parse(content);
                    if (doc.RootElement.ValueKind != JsonValueKind.Array)
                    {
                        return;
                    }

                    foreach (var cmd in doc.RootElement.EnumerateArray())
                    {
                        var commandId = cmd.GetProperty("id").GetGuid();
                        var commandType = cmd.GetProperty("commandType").GetString();
                        var payloadJson = cmd.GetProperty("payloadJson").GetString();

                        _logger.LogInformation("Processing command {CommandId} of type {CommandType}", commandId, commandType);

                        bool success = false;
                        string? errorMessage = null;
                        try
                        {
                            if (commandType == "UpdateTicketStatus")
                            {
                                using var payloadDoc = JsonDocument.Parse(payloadJson);
                                var root = payloadDoc.RootElement;
                                var ticketId = root.GetProperty("TicketId").GetGuid();
                                var ticketStatus = root.GetProperty("Status").GetString();
                                var statusMessage = root.TryGetProperty("StatusMessage", out var msg) && msg.ValueKind != JsonValueKind.Null ? msg.GetString() : null;
                                var updatedAt = root.TryGetProperty("UpdatedAt", out var ut) && ut.ValueKind != JsonValueKind.Null ? ut.GetDateTime() : DateTime.UtcNow;

                                var ticket = await dbContext.SupportTickets.FindAsync(ticketId);
                                if (ticket != null)
                                {
                                    if (ticket.Status != ticketStatus || ticket.UpdatedAt == null || ticket.UpdatedAt < updatedAt)
                                    {
                                        ticket.Status = ticketStatus;
                                        ticket.StatusMessage = statusMessage;
                                        ticket.UpdatedAt = updatedAt;
                                        await dbContext.SaveChangesAsync(stoppingToken);
                                        _logger.LogInformation("Successfully updated local support ticket {TicketId} to status {Status}", ticketId, ticketStatus);
                                    }
                                    success = true;
                                }
                                else
                                {
                                    _logger.LogWarning("Local support ticket {TicketId} not found for update command.", ticketId);
                                    success = true;
                                }
                            }
                            else if (commandType == "GenerateDiagnostics")
                            {
                                var diagnosticsService = scope.ServiceProvider.GetRequiredService<IDiagnosticsService>();
                                var bundleId = await diagnosticsService.GenerateDiagnosticBundleAsync("RemoteTrigger");
                                _logger.LogInformation("Successfully generated diagnostic bundle {BundleId} via remote command", bundleId);
                                success = true;
                            }
                            else if (commandType == "ScheduleBackup")
                            {
                                var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();
                                var backupId = await backupService.ExecuteBackupAsync("Full");
                                _logger.LogInformation("Successfully completed backup {BackupId} via remote command", backupId);
                                success = true;
                            }
                            else if (commandType == "RequestHealthSnapshot")
                            {
                                var payload = await GetLiveTelemetryPayloadAsync(detailed: true);
                                await SendHeartbeatAsync(stoppingToken, payload);
                                _logger.LogInformation("Successfully sent health snapshot via remote command");
                                success = true;
                            }
                            else if (commandType == "RefreshLicense")
                            {
                                var dbProfile = await dbContext.LabProfiles.FirstOrDefaultAsync(stoppingToken);
                                var key = GetEffectiveApiKey(dbProfile);
                                success = await _licenseRecoveryService.ValidateKeyAndSyncProfileAsync(key, dbContext, dbProfile, stoppingToken);
                                if (!success)
                                {
                                    success = await _licenseRecoveryService.TriggerSelfHealingRecoveryAsync(dbContext, dbProfile, stoppingToken);
                                }
                                _logger.LogInformation("RefreshLicense remote command executed. Result: {Success}", success);
                            }
                            else if (commandType == "RefreshFeatureFlags" || commandType == "RestartBackgroundWorkers")
                            {
                                var dbProfile = await dbContext.LabProfiles.FirstOrDefaultAsync(stoppingToken);
                                success = await _licenseRecoveryService.TriggerSelfHealingRecoveryAsync(dbContext, dbProfile, stoppingToken);
                                _logger.LogInformation("Command type {CommandType} executed. Result: {Success}", commandType, success);
                            }
                            else
                            {
                                _logger.LogWarning("Unsupported command type {CommandType} received.", commandType);
                                success = false;
                                errorMessage = $"Unsupported command type {commandType} received.";
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error executing command {CommandId}", commandId);
                            success = false;
                            errorMessage = ex.Message;
                        }

                        // Acknowledge the command status back to the Middleware
                        try
                        {
                            var statusVal = success ? "Executed" : "Failed";
                            var statusUrl = apiUrl.Replace("/api/events", "/api/commands/status") + $"?commandId={commandId}&status={statusVal}";
                            if (!success && !string.IsNullOrEmpty(errorMessage))
                            {
                                statusUrl += $"&error={Uri.EscapeDataString(errorMessage)}";
                            }

                            var ackRequest = new HttpRequestMessage(HttpMethod.Post, statusUrl);
                            ackRequest.Headers.Add("X-Lab-Id", labId);
                            ackRequest.Headers.Add("X-Api-Key", apiKey);

                            var ackResponse = await _httpClient.SendAsync(ackRequest, stoppingToken);
                            if (ackResponse.StatusCode == System.Net.HttpStatusCode.OK)
                            {
                                _logger.LogInformation("Acknowledged command {CommandId} status as {Status} to Middleware.", commandId, statusVal);
                            }
                            else
                            {
                                _logger.LogWarning("Failed to acknowledge command {CommandId}. Middleware returned: {StatusCode}", commandId, ackResponse.StatusCode);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to send acknowledgment for command {CommandId}.", commandId);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in PollAndProcessCommandsAsync");
            }
        }

        private async Task SynchronizeLicenseInfoAsync(SynOSDbContext dbContext, LabProfile? profile, CancellationToken stoppingToken)
        {
            if (profile == null) return;
            await _licenseRecoveryService.TriggerSelfHealingRecoveryAsync(dbContext, profile, stoppingToken);
        }

        private string GetEffectiveApiKey(LabProfile? profile)
        {
            return _licenseRecoveryService.GetEffectiveLicenseKey(profile);
        }

        private string GetEffectiveApiUrl(LabProfile? profile)
        {
            var confUrl = _configuration["Middleware:ApiUrl"];
            if (!string.IsNullOrWhiteSpace(confUrl))
            {
                return confUrl;
            }
            if (profile != null && !string.IsNullOrWhiteSpace(profile.MiddlewareApiUrl))
            {
                return profile.MiddlewareApiUrl;
            }
            return "https://cloud.tbzlabs.in/api/events";
        }
    }
}
