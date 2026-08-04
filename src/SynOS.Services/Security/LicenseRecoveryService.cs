using System;
using System.Linq;
using System.Net.Http;
using System.Net.Sockets;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services.Security
{
    /// <summary>
    /// Static holder for in-memory gateway health telemetry.
    /// </summary>
    public static class MiddlewareSyncHealth
    {
        public static bool IsHealthy { get; set; } = true;
        public static string StatusMessage { get; set; } = "Cloud WhatsApp Gateway Connected & Authorized";
        public static DateTime? LastSyncTime { get; set; }
        public static string? LastError { get; set; }
        public static int PendingOutboxCount { get; set; }
        public static int DeadLetterCount { get; set; }
    }

    public class LicenseRecoveryService : ILicenseRecoveryService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<LicenseRecoveryService> _logger;
        private readonly HttpClient _httpClient;
        private readonly SemaphoreSlim _recoveryLock = new(1, 1);
        private DateTime _lastRecoveryAttemptUtc = DateTime.MinValue;
        private bool _lastRecoveryResult = false;

        public LicenseRecoveryService(IConfiguration configuration, ILogger<LicenseRecoveryService> logger)
        {
            _configuration = configuration;
            _logger = logger;

            var handler = new SocketsHttpHandler
            {
                ConnectCallback = async (context, cancellationToken) =>
                {
                    var ipAddresses = await System.Net.Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, cancellationToken);
                    var ipv4Address = ipAddresses.FirstOrDefault(ip => ip.AddressFamily == AddressFamily.InterNetwork);
                    var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
                    try
                    {
                        await socket.ConnectAsync(new System.Net.IPEndPoint(ipv4Address ?? ipAddresses.First(), context.DnsEndPoint.Port), cancellationToken);
                        return new NetworkStream(socket, ownsSocket: true);
                    }
                    catch
                    {
                        socket.Dispose();
                        throw;
                    }
                }
            };
            _httpClient = new HttpClient(handler)
            {
                Timeout = TimeSpan.FromSeconds(15)
            };
        }

        public string GetEffectiveLicenseKey(LabProfile? profile)
        {
            if (profile != null && !string.IsNullOrWhiteSpace(profile.LicenseKey))
            {
                var decrypted = LicenseKeyProtector.Unprotect(profile.LicenseKey);
                if (!string.IsNullOrWhiteSpace(decrypted))
                {
                    return decrypted;
                }
            }

            var configKey = _configuration["Middleware:ApiKey"];
            if (!string.IsNullOrWhiteSpace(configKey) && configKey != "REPLACE_WITH_MIDDLEWARE_API_KEY")
            {
                return configKey;
            }

            return "TBZ-LAB-KEY-12345";
        }

        public async Task<bool> TriggerSelfHealingRecoveryAsync(SynOSDbContext dbContext, LabProfile? profile, CancellationToken stoppingToken = default, bool force = false)
        {
            await _recoveryLock.WaitAsync(stoppingToken);
            try
            {
                // Throttling: If recovery was attempted within the last 60 seconds, reuse cached result unless force is requested
                if (!force && DateTime.UtcNow - _lastRecoveryAttemptUtc < TimeSpan.FromSeconds(60))
                {
                    _logger.LogInformation("Self-healing recovery requested within 60s threshold. Reusing cached recovery result ({Result}).", _lastRecoveryResult);
                    return _lastRecoveryResult;
                }

                _lastRecoveryAttemptUtc = DateTime.UtcNow;

                if (profile == null)
                {
                    profile = await dbContext.LabProfiles.FirstOrDefaultAsync(stoppingToken);
                }

                var licenseKey = GetEffectiveLicenseKey(profile);
                if (string.IsNullOrWhiteSpace(licenseKey))
                {
                    _logger.LogWarning("Self-healing recovery aborted: No valid License Key stored or configured.");
                    MiddlewareSyncHealth.IsHealthy = false;
                    MiddlewareSyncHealth.StatusMessage = "Unauthorized";
                    MiddlewareSyncHealth.LastError = "No active License Key found. Please activate your installation in System Settings.";
                    _lastRecoveryResult = false;
                    return false;
                }

                var success = await ValidateKeyAndSyncProfileInternalAsync(licenseKey, dbContext, profile, stoppingToken);
                _lastRecoveryResult = success;
                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception during licensing self-healing recovery.");
                MiddlewareSyncHealth.IsHealthy = false;
                MiddlewareSyncHealth.StatusMessage = "Control Tower Unreachable";
                MiddlewareSyncHealth.LastError = $"Recovery connection failure: {ex.Message}";
                _lastRecoveryResult = false;
                return false;
            }
            finally
            {
                _recoveryLock.Release();
            }
        }

        public async Task<bool> ValidateKeyAndSyncProfileAsync(string rawLicenseKey, SynOSDbContext dbContext, LabProfile profile, CancellationToken stoppingToken = default)
        {
            await _recoveryLock.WaitAsync(stoppingToken);
            try
            {
                _lastRecoveryAttemptUtc = DateTime.UtcNow;
                var success = await ValidateKeyAndSyncProfileInternalAsync(rawLicenseKey, dbContext, profile, stoppingToken);
                _lastRecoveryResult = success;
                return success;
            }
            finally
            {
                _recoveryLock.Release();
            }
        }

        private async Task<bool> ValidateKeyAndSyncProfileInternalAsync(string rawLicenseKey, SynOSDbContext dbContext, LabProfile? profile, CancellationToken stoppingToken)
        {
            if (string.IsNullOrWhiteSpace(rawLicenseKey))
            {
                MiddlewareSyncHealth.IsHealthy = false;
                MiddlewareSyncHealth.StatusMessage = "Unauthorized";
                MiddlewareSyncHealth.LastError = "License Key is required.";
                return false;
            }

            var apiUrl = profile != null && !string.IsNullOrWhiteSpace(profile.MiddlewareApiUrl)
                ? profile.MiddlewareApiUrl
                : (_configuration["Middleware:ApiUrl"] ?? "https://cloud.tbzlabs.in/api/events");

            var urlsToTry = new System.Collections.Generic.List<string>
            {
                apiUrl.Replace("/api/events", "/api/labs/validate")
            };
            if (!urlsToTry.Contains("http://localhost:5069/api/labs/validate"))
            {
                urlsToTry.Add("http://localhost:5069/api/labs/validate");
            }
            if (!urlsToTry.Contains("http://127.0.0.1:5069/api/labs/validate"))
            {
                urlsToTry.Add("http://127.0.0.1:5069/api/labs/validate");
            }
            if (!urlsToTry.Contains("http://localhost:5173/api/labs/validate"))
            {
                urlsToTry.Add("http://localhost:5173/api/labs/validate");
            }

            HttpResponseMessage? response = null;
            string? successfulUrl = null;

            foreach (var validateUrl in urlsToTry)
            {
                try
                {
                    _logger.LogInformation("Validating license key against Control Tower ({ValidateUrl})...", validateUrl);
                    using var request = new HttpRequestMessage(HttpMethod.Post, validateUrl);
                    request.Headers.Add("X-Api-Key", rawLicenseKey);

                    var res = await _httpClient.SendAsync(request, stoppingToken);
                    if (res.IsSuccessStatusCode)
                    {
                        response = res;
                        successfulUrl = validateUrl;
                        break;
                    }
                    else if (response == null)
                    {
                        response = res;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed license validation connection to {ValidateUrl}", validateUrl);
                }
            }

            if (response != null && response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync(stoppingToken);
                using var doc = JsonDocument.Parse(responseBody);
                var root = doc.RootElement;

                var labId = root.TryGetProperty("labId", out var idProp) ? idProp.GetString() : null;
                var licenseStatus = root.TryGetProperty("licenseStatus", out var licProp) ? licProp.GetString() : null;
                var licenseType = root.TryGetProperty("licenseType", out var typeProp) ? typeProp.GetString() : null;
                int maximumBranches = 1;
                if (root.TryGetProperty("maximumBranches", out var maxProp) && maxProp.TryGetInt32(out var mv))
                    maximumBranches = mv;
                else if (root.TryGetProperty("MaximumBranches", out var maxProp2) && maxProp2.TryGetInt32(out var mv2))
                    maximumBranches = mv2;
                var expiryDate = root.TryGetProperty("expiryDate", out var expProp) && expProp.ValueKind != JsonValueKind.Null ? expProp.GetString() : null;

                var enabledFeatures = new System.Collections.Generic.List<string>();
                if (root.TryGetProperty("enabledFeatures", out var featProp) && featProp.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in featProp.EnumerateArray())
                    {
                        var str = item.GetString();
                        if (str != null) enabledFeatures.Add(str);
                    }
                }

                if (profile == null)
                {
                    profile = await dbContext.LabProfiles.FirstOrDefaultAsync(stoppingToken);
                }

                if (profile == null)
                {
                    profile = new LabProfile
                    {
                        LabProfileId = Guid.NewGuid(),
                        Name = "SynOS Diagnostic Centre"
                    };
                    dbContext.LabProfiles.Add(profile);
                }

                // Encrypt and persist license key securely using DPAPI
                profile.LicenseKey = LicenseKeyProtector.Protect(rawLicenseKey);
                profile.MiddlewareApiKey = null; // Clear obsolete plaintext field
                if (!string.IsNullOrEmpty(labId)) profile.LabId = labId;
                if (string.IsNullOrWhiteSpace(profile.MiddlewareApiUrl))
                {
                    profile.MiddlewareApiUrl = "https://cloud.tbzlabs.in/api/events";
                }
                if (!string.IsNullOrEmpty(licenseType)) profile.LicenseType = licenseType;
                profile.MaximumBranches = maximumBranches;
                if (!string.IsNullOrEmpty(licenseStatus)) profile.LicenseStatus = licenseStatus;
                profile.EnabledFeatures = enabledFeatures;
                profile.LastLicenseValidationUtc = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(expiryDate) && DateTime.TryParse(expiryDate, out var parsedExp))
                {
                    profile.LicenseExpiryDate = parsedExp;
                }
                else
                {
                    profile.LicenseExpiryDate = null;
                }
                profile.UpdatedAt = DateTimeOffset.UtcNow;

                await dbContext.SaveChangesAsync(stoppingToken);

                // Reload configuration roots if available
                if (_configuration is IConfigurationRoot configRoot)
                {
                    configRoot.Reload();
                }

                _logger.LogInformation("License successfully validated and saved. LabId: {LabId}, Status: {Status}", profile.LabId, profile.LicenseStatus);
                
                MiddlewareSyncHealth.IsHealthy = true;
                MiddlewareSyncHealth.StatusMessage = "Cloud WhatsApp Gateway Connected & Authorized";
                MiddlewareSyncHealth.LastSyncTime = DateTime.UtcNow;
                MiddlewareSyncHealth.LastError = null;
                return true;
            }
            else
            {
                var errorMsg = $"Control Tower validation returned status code: {response.StatusCode}";
                try
                {
                    var responseBody = await response.Content.ReadAsStringAsync(stoppingToken);
                    using var doc = JsonDocument.Parse(responseBody);
                    if (doc.RootElement.TryGetProperty("error", out var errProp))
                    {
                        errorMsg = errProp.GetString() ?? errorMsg;
                    }
                    else if (doc.RootElement.TryGetProperty("message", out var msgProp))
                    {
                        errorMsg = msgProp.GetString() ?? errorMsg;
                    }
                }
                catch { }

                _logger.LogWarning("Licensing validation failed: {ErrorMsg}", errorMsg);
                MiddlewareSyncHealth.IsHealthy = false;

                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized || response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                {
                    MiddlewareSyncHealth.StatusMessage = "Unauthorized (Invalid Cloud Key)";
                }
                else
                {
                    MiddlewareSyncHealth.StatusMessage = "Control Tower Unreachable";
                }

                MiddlewareSyncHealth.LastError = errorMsg;
                return false;
            }
        }
    }
}
