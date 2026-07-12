using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Services;
using SynOS.Services.Security;
using Microsoft.Data.SqlClient;
using System;
using System.Threading.Tasks;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Linq;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/settings")]
    [Authorize(Roles = "Admin")]
    public class SettingsController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IUserContext _userContext;
        private readonly IBackupService _backupService;
        private readonly IDiagnosticsService _diagnosticsService;
        private readonly IConfiguration _configuration;

        public SettingsController(
            SynOSDbContext context,
            IAuditService auditService,
            IUserContext userContext,
            IBackupService backupService,
            IDiagnosticsService diagnosticsService,
            IConfiguration configuration)
        {
            _context = context;
            _auditService = auditService;
            _userContext = userContext;
            _backupService = backupService;
            _diagnosticsService = diagnosticsService;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var profile = await _context.LabProfiles.FirstOrDefaultAsync();
            if (profile == null)
            {
                return NotFound(new { message = "Global Lab Profile settings not found." });
            }
            return Ok(profile);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromBody] LabProfile update)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var profile = await _context.LabProfiles.FirstOrDefaultAsync();
            if (profile == null)
            {
                return NotFound(new { message = "Global Lab Profile settings not found." });
            }

            // Capture old settings for audit log
            var oldSettings = new
            {
                profile.Name,
                profile.Tagline,
                profile.Address,
                profile.Email,
                profile.Website,
                profile.Phone,
                profile.Accreditation,
                profile.FooterDisclaimer,
                profile.HeaderHeightMm,
                profile.FooterMarginMm,
                profile.ShowWatermark,
                profile.ShowHeaderOnReports,
                profile.ShowDigitalSignatures,
                profile.InvoicePrefix,
                profile.NextInvoiceNumber,
                profile.DefaultTaxPercent,
                profile.EnableQrPayment,
                profile.UpiId,
                profile.SmsGatewayProvider,
                profile.WhatsAppGatewayUrl,
                profile.SmtpHost,
                profile.SmtpPort,
                profile.BackupEnabled,
                profile.BackupFrequency
            };

            // Update basic info
            profile.Name = update.Name;
            profile.Tagline = update.Tagline;
            profile.Address = update.Address;
            profile.Email = update.Email;
            profile.Website = update.Website;
            profile.Phone = update.Phone;
            profile.Accreditation = update.Accreditation;
            profile.HeaderLogoUrl = update.HeaderLogoUrl;
            profile.WatermarkUrl = update.WatermarkUrl;
            profile.FooterDisclaimer = update.FooterDisclaimer;

            // Update branding
            profile.HeaderHeightMm = update.HeaderHeightMm;
            profile.FooterMarginMm = update.FooterMarginMm;
            profile.ShowWatermark = update.ShowWatermark;
            profile.ShowHeaderOnReports = update.ShowHeaderOnReports;
            profile.ShowDigitalSignatures = update.ShowDigitalSignatures;

            // Update Invoice config
            profile.InvoicePrefix = update.InvoicePrefix;
            profile.NextInvoiceNumber = update.NextInvoiceNumber;
            profile.DefaultTaxPercent = update.DefaultTaxPercent;
            profile.EnableQrPayment = update.EnableQrPayment;
            profile.UpiId = update.UpiId;

            // Update SMS gateway config
            var smsApiKeyRotated = profile.SmsApiKey != update.SmsApiKey;
            profile.SmsGatewayProvider = update.SmsGatewayProvider;
            profile.SmsApiKey = update.SmsApiKey;

            var whatsAppApiKeyRotated = profile.WhatsAppApiKey != update.WhatsAppApiKey;
            profile.WhatsAppGatewayUrl = update.WhatsAppGatewayUrl;
            profile.WhatsAppApiKey = update.WhatsAppApiKey;

            // Update SMTP credentials
            var smtpPasswordRotated = profile.SmtpPassword != update.SmtpPassword;
            profile.SmtpHost = update.SmtpHost;
            profile.SmtpPort = update.SmtpPort;
            profile.SmtpUsername = update.SmtpUsername;
            profile.SmtpPassword = update.SmtpPassword;
            profile.SmtpEnableSsl = update.SmtpEnableSsl;
            profile.SmtpSenderEmail = update.SmtpSenderEmail;
            profile.SmtpSenderName = update.SmtpSenderName;

            // Update Backups rules
            profile.BackupEnabled = update.BackupEnabled;
            profile.BackupFrequency = update.BackupFrequency;
            profile.BackupTime = update.BackupTime;
            profile.BackupPath = update.BackupPath;

            profile.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            // Log update settings event to Audit Service
            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "UpdateSystemSettings",
                "Settings",
                profile.LabProfileId,
                new { Old = oldSettings, New = update }
            );

            if (smsApiKeyRotated)
            {
                await _auditService.LogAsync(_userContext.CurrentUserId, "ApiKeyRotated", "Settings", profile.LabProfileId, new { Service = "SMS", Action = "Rotate" });
            }
            if (whatsAppApiKeyRotated)
            {
                await _auditService.LogAsync(_userContext.CurrentUserId, "ApiKeyRotated", "Settings", profile.LabProfileId, new { Service = "WhatsApp", Action = "Rotate" });
            }
            if (smtpPasswordRotated)
            {
                await _auditService.LogAsync(_userContext.CurrentUserId, "SecretRotated", "Settings", profile.LabProfileId, new { Service = "SMTP", Action = "RotatePassword" });
            }

            return Ok(profile);
        }

        [HttpGet("advanced")]
        public async Task<IActionResult> GetAdvancedSettings()
        {
            try
            {
                var clientPath = FindAppSettingsPath();
                JsonObject? clientRoot = null;
                if (System.IO.File.Exists(clientPath))
                {
                    var jsonText = await System.IO.File.ReadAllTextAsync(clientPath);
                    clientRoot = JsonNode.Parse(jsonText)?.AsObject();
                }

                var dto = new AdvancedSettingsDto();

                // 1. Read Bootstrap Settings from appsettings.json
                if (clientRoot != null)
                {
                    dto.ConnectionString = GetNodeValue(clientRoot, "ConnectionStrings:DefaultConnection")?.ToString();
                    dto.JwtSecret = "********";
                    dto.JwtIssuer = GetNodeValue(clientRoot, "Jwt:Issuer")?.ToString();
                    dto.JwtAudience = GetNodeValue(clientRoot, "Jwt:Audience")?.ToString();
                    dto.PacsRootPath = GetNodeValue(clientRoot, "Pacs:RootPath")?.ToString();
                    dto.FileStoragePublicBaseUrl = GetNodeValue(clientRoot, "FileStorage:PublicBaseUrl")?.ToString();
                    dto.SecureLinkBaseUrl = GetNodeValue(clientRoot, "SecureLink:BaseUrl")?.ToString();
                    dto.SecureLinkPublicBaseUrl = GetNodeValue(clientRoot, "SecureLink:PublicBaseUrl")?.ToString();
                    dto.AllowedHosts = GetNodeValue(clientRoot, "AllowedHosts")?.ToString();
                    dto.TrustedKey2026v1 = GetNodeValue(clientRoot, "TrustedKeys:key-2026-v1")?.ToString();
                    dto.JwtSecretStatus = GetNodeValue(clientRoot, "Jwt:Secret") != null ? "Configured" : "Not Configured";
                }

                // 2. Read Operational Settings from Client DB (LabProfile)
                var profile = await _context.LabProfiles.FirstOrDefaultAsync();
                if (profile != null)
                {
                    dto.MiddlewareApiUrl = profile.MiddlewareApiUrl;
                    dto.LabId = profile.LabId;
                    dto.LicenseType = profile.LicenseType;
                    dto.MaximumBranches = profile.MaximumBranches;
                    dto.LicenseExpiryDate = profile.LicenseExpiryDate?.ToString("yyyy-MM-dd");
                    dto.LicenseStatus = profile.LicenseStatus;
                    dto.EnabledFeatures = profile.EnabledFeatures;
                    dto.MiddlewareApiKey = "********";
                    dto.BackupEncryptionKey = "********";
                    dto.DiagnosticsEncryptionKey = "********";
                    dto.PacsMaxInstancesPerSeriesInSeriesTree = profile.PacsMaxInstancesPerSeriesInSeriesTree;
                    dto.PacsMaxTotalInstancesPerStudyInSeriesTree = profile.PacsMaxTotalInstancesPerStudyInSeriesTree;
                    dto.ReferralEconomicsEnabled = profile.ReferralEconomicsEnabled;
                    dto.InventoryValuationMethod = profile.InventoryValuationMethod;

                    // Paths & Directory concepts
                    dto.FileStorageBasePath = profile.ReportStorageFolder;
                    dto.WorkingDirectory = profile.WorkingDirectory;

                    // JWT Expiry
                    dto.JwtExpiryMinutes = profile.JwtExpiryMinutes;
                    dto.JwtRefreshTokenExpiryDays = profile.JwtRefreshTokenExpiryDays;

                    // OTA Update Settings
                    dto.OtaChannel = profile.OtaChannel;
                    dto.OtaPolicy = profile.OtaPolicy;
                    dto.OtaMaintenanceDay = profile.MaintenanceDay;
                    dto.OtaMaintenanceStartHour = profile.MaintenanceStartHour;
                    dto.OtaMaintenanceEndHour = profile.MaintenanceEndHour;

                    // Secrets Status Metadata
                    dto.BackupKeyStatus = string.IsNullOrEmpty(profile.BackupEncryptionKey) ? "Not Configured" : "Configured";
                    dto.DiagnosticsKeyStatus = string.IsNullOrEmpty(profile.DiagnosticsEncryptionKey) ? "Not Configured" : "Configured";
                }

                // 3. Read Middleware Operational Settings from SQLite DB
                var sqlitePath = FindMiddlewareDbPath();
                if (System.IO.File.Exists(sqlitePath))
                {
                    try
                    {
                        using var connection = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={sqlitePath}");
                        await connection.OpenAsync();
                        using var command = connection.CreateCommand();
                        command.CommandText = @"
                            SELECT AllowedOrigins, RateLimitPermitLimit, RateLimitWindowSeconds, RateLimitQueueLimit,
                                   WhatsAppGraphApiVersion, WhatsAppAppSecret, WhatsAppVerifyToken, WhatsAppPhoneNumberId,
                                   WhatsAppBusinessAccountId, WhatsAppActiveTemplateName, WhatsAppPublicTunnelUrl, WhatsAppAccessToken
                            FROM MiddlewareSettings LIMIT 1";
                        using var reader = await command.ExecuteReaderAsync();
                        if (await reader.ReadAsync())
                        {
                            dto.AllowedOrigins = reader.IsDBNull(0) ? null : reader.GetString(0);
                            dto.RateLimitPermitLimit = reader.IsDBNull(1) ? 100 : reader.GetInt32(1);
                            dto.RateLimitWindowSeconds = reader.IsDBNull(2) ? 60 : reader.GetInt32(2);
                            dto.RateLimitQueueLimit = reader.IsDBNull(3) ? 10 : reader.GetInt32(3);

                            dto.WhatsAppGraphApiVersion = reader.IsDBNull(4) ? null : reader.GetString(4);
                            dto.WhatsAppAppSecret = reader.IsDBNull(5) ? "********" : "********";
                            dto.WhatsAppVerifyToken = reader.IsDBNull(6) ? "********" : "********";
                            dto.WhatsAppPhoneNumberId = reader.IsDBNull(7) ? null : reader.GetString(7);
                            dto.WhatsAppBusinessAccountId = reader.IsDBNull(8) ? null : reader.GetString(8);
                            dto.WhatsAppActiveTemplateName = reader.IsDBNull(9) ? null : reader.GetString(9);
                            dto.WhatsAppPublicTunnelUrl = reader.IsDBNull(10) ? null : reader.GetString(10);
                            dto.WhatsAppAccessToken = reader.IsDBNull(11) ? "********" : "********";
                        }
                    }
                    catch
                    {
                        // Fallback defaults if table doesn't exist yet or query fails
                        dto.AllowedOrigins = "http://localhost:5173";
                        dto.RateLimitPermitLimit = 100;
                        dto.RateLimitWindowSeconds = 60;
                        dto.RateLimitQueueLimit = 10;
                    }
                }

                return Ok(dto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("advanced")]
        public async Task<IActionResult> UpdateAdvancedSettings([FromBody] AdvancedSettingsDto dto)
        {
            try
            {
                var clientPath = FindAppSettingsPath();
                if (!System.IO.File.Exists(clientPath))
                {
                    return BadRequest("appsettings.json not found on client.");
                }

                var clientJson = await System.IO.File.ReadAllTextAsync(clientPath);
                var clientRoot = JsonNode.Parse(clientJson)?.AsObject();
                if (clientRoot == null) return BadRequest("Failed to parse client appsettings.json.");

                // 1. Save Bootstrap Settings to appsettings.json
                if (dto.ConnectionString != null)
                    SetNodeValue(clientRoot, "ConnectionStrings:DefaultConnection", JsonValue.Create(dto.ConnectionString));

                if (dto.JwtSecret != null && dto.JwtSecret != "********")
                    SetNodeValue(clientRoot, "Jwt:Secret", JsonValue.Create(dto.JwtSecret));

                if (dto.JwtIssuer != null)
                    SetNodeValue(clientRoot, "Jwt:Issuer", JsonValue.Create(dto.JwtIssuer));

                if (dto.JwtAudience != null)
                    SetNodeValue(clientRoot, "Jwt:Audience", JsonValue.Create(dto.JwtAudience));

                if (dto.PacsRootPath != null)
                    SetNodeValue(clientRoot, "Pacs:RootPath", JsonValue.Create(dto.PacsRootPath));

                if (dto.FileStorageBasePath != null)
                    SetNodeValue(clientRoot, "FileStorage:BasePath", JsonValue.Create(dto.FileStorageBasePath));

                if (dto.FileStoragePublicBaseUrl != null)
                    SetNodeValue(clientRoot, "FileStorage:PublicBaseUrl", JsonValue.Create(dto.FileStoragePublicBaseUrl));

                if (dto.SecureLinkBaseUrl != null)
                    SetNodeValue(clientRoot, "SecureLink:BaseUrl", JsonValue.Create(dto.SecureLinkBaseUrl));

                if (dto.SecureLinkPublicBaseUrl != null)
                    SetNodeValue(clientRoot, "SecureLink:PublicBaseUrl", JsonValue.Create(dto.SecureLinkPublicBaseUrl));

                if (dto.AllowedHosts != null)
                    SetNodeValue(clientRoot, "AllowedHosts", JsonValue.Create(dto.AllowedHosts));

                if (dto.TrustedKey2026v1 != null)
                    SetNodeValue(clientRoot, "TrustedKeys:key-2026-v1", JsonValue.Create(dto.TrustedKey2026v1));

                var writeOptions = new JsonSerializerOptions { WriteIndented = true };
                var updatedClientJson = JsonSerializer.Serialize(clientRoot, writeOptions);
                await System.IO.File.WriteAllTextAsync(clientPath, updatedClientJson);

                // 2. Save Operational Settings to Client DB (LabProfile)
                var profile = await _context.LabProfiles.FirstOrDefaultAsync();
                if (profile != null)
                {
                    if (dto.MiddlewareApiUrl != null)
                        profile.MiddlewareApiUrl = dto.MiddlewareApiUrl;

                    if (dto.MiddlewareApiKey != null && dto.MiddlewareApiKey != "********")
                        profile.MiddlewareApiKey = dto.MiddlewareApiKey;

                    if (dto.BackupEncryptionKey != null && dto.BackupEncryptionKey != "********")
                        profile.BackupEncryptionKey = dto.BackupEncryptionKey;

                    if (dto.DiagnosticsEncryptionKey != null && dto.DiagnosticsEncryptionKey != "********")
                        profile.DiagnosticsEncryptionKey = dto.DiagnosticsEncryptionKey;

                    if (dto.PacsMaxInstancesPerSeriesInSeriesTree.HasValue)
                        profile.PacsMaxInstancesPerSeriesInSeriesTree = dto.PacsMaxInstancesPerSeriesInSeriesTree.Value;

                    if (dto.PacsMaxTotalInstancesPerStudyInSeriesTree.HasValue)
                        profile.PacsMaxTotalInstancesPerStudyInSeriesTree = dto.PacsMaxTotalInstancesPerStudyInSeriesTree.Value;

                    if (dto.ReferralEconomicsEnabled.HasValue)
                        profile.ReferralEconomicsEnabled = dto.ReferralEconomicsEnabled.Value;

                    if (dto.InventoryValuationMethod != null)
                        profile.InventoryValuationMethod = dto.InventoryValuationMethod;

                    // New directories & operational path mappings
                    if (dto.FileStorageBasePath != null)
                        profile.ReportStorageFolder = dto.FileStorageBasePath;

                    if (dto.WorkingDirectory != null)
                        profile.WorkingDirectory = dto.WorkingDirectory;

                    // JWT lifetimes
                    if (dto.JwtExpiryMinutes.HasValue)
                        profile.JwtExpiryMinutes = dto.JwtExpiryMinutes.Value;

                    if (dto.JwtRefreshTokenExpiryDays.HasValue)
                        profile.JwtRefreshTokenExpiryDays = dto.JwtRefreshTokenExpiryDays.Value;

                    // OTA update properties
                    if (dto.OtaChannel != null)
                        profile.OtaChannel = dto.OtaChannel;

                    if (dto.OtaPolicy != null)
                        profile.OtaPolicy = dto.OtaPolicy;

                    if (dto.OtaMaintenanceDay != null)
                        profile.MaintenanceDay = dto.OtaMaintenanceDay;

                    if (dto.OtaMaintenanceStartHour != null)
                        profile.MaintenanceStartHour = dto.OtaMaintenanceStartHour;

                    if (dto.OtaMaintenanceEndHour != null)
                        profile.MaintenanceEndHour = dto.OtaMaintenanceEndHour;

                    profile.UpdatedAt = DateTimeOffset.UtcNow;
                    await _context.SaveChangesAsync();
                }

                // 3. Save Middleware Operational Settings to SQLite DB
                var sqlitePath = FindMiddlewareDbPath();
                if (System.IO.File.Exists(sqlitePath))
                {
                    using var connection = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={sqlitePath}");
                    await connection.OpenAsync();

                    using var checkCmd = connection.CreateCommand();
                    checkCmd.CommandText = "SELECT COUNT(*) FROM MiddlewareSettings";
                    var count = Convert.ToInt32(await checkCmd.ExecuteScalarAsync() ?? 0);

                    using var saveCmd = connection.CreateCommand();
                    if (count == 0)
                    {
                        saveCmd.CommandText = @"
                            INSERT INTO MiddlewareSettings (AllowedOrigins, RateLimitPermitLimit, RateLimitWindowSeconds, RateLimitQueueLimit, DiagnosticsEncryptionKey,
                                                           WhatsAppGraphApiVersion, WhatsAppAppSecret, WhatsAppVerifyToken, WhatsAppPhoneNumberId, WhatsAppBusinessAccountId,
                                                           WhatsAppActiveTemplateName, WhatsAppPublicTunnelUrl, WhatsAppAccessToken)
                            VALUES ($origins, $permit, $window, $queue, $diagKey, $waVer, $waSec, $waTok, $waPhone, $waBus, $waTemp, $waTun, $waAccess)";
                    }
                    else
                    {
                        saveCmd.CommandText = @"
                            UPDATE MiddlewareSettings
                            SET AllowedOrigins = $origins,
                                RateLimitPermitLimit = $permit,
                                RateLimitWindowSeconds = $window,
                                RateLimitQueueLimit = $queue,
                                DiagnosticsEncryptionKey = CASE WHEN $diagKey != '********' THEN $diagKey ELSE DiagnosticsEncryptionKey END,
                                WhatsAppGraphApiVersion = $waVer,
                                WhatsAppAppSecret = CASE WHEN $waSec != '********' THEN $waSec ELSE WhatsAppAppSecret END,
                                WhatsAppVerifyToken = CASE WHEN $waTok != '********' THEN $waTok ELSE WhatsAppVerifyToken END,
                                WhatsAppPhoneNumberId = $waPhone,
                                WhatsAppBusinessAccountId = $waBus,
                                WhatsAppActiveTemplateName = $waTemp,
                                WhatsAppPublicTunnelUrl = $waTun,
                                WhatsAppAccessToken = CASE WHEN $waAccess != '********' THEN $waAccess ELSE WhatsAppAccessToken END";
                    }

                    saveCmd.Parameters.AddWithValue("$origins", dto.AllowedOrigins ?? "http://localhost:5173");
                    saveCmd.Parameters.AddWithValue("$permit", dto.RateLimitPermitLimit ?? 100);
                    saveCmd.Parameters.AddWithValue("$window", dto.RateLimitWindowSeconds ?? 60);
                    saveCmd.Parameters.AddWithValue("$queue", dto.RateLimitQueueLimit ?? 10);
                    saveCmd.Parameters.AddWithValue("$diagKey", dto.DiagnosticsEncryptionKey ?? "********");

                    saveCmd.Parameters.AddWithValue("$waVer", dto.WhatsAppGraphApiVersion ?? (object)DBNull.Value);
                    saveCmd.Parameters.AddWithValue("$waSec", dto.WhatsAppAppSecret ?? "********");
                    saveCmd.Parameters.AddWithValue("$waTok", dto.WhatsAppVerifyToken ?? "********");
                    saveCmd.Parameters.AddWithValue("$waPhone", dto.WhatsAppPhoneNumberId ?? (object)DBNull.Value);
                    saveCmd.Parameters.AddWithValue("$waBus", dto.WhatsAppBusinessAccountId ?? (object)DBNull.Value);
                    saveCmd.Parameters.AddWithValue("$waTemp", dto.WhatsAppActiveTemplateName ?? (object)DBNull.Value);
                    saveCmd.Parameters.AddWithValue("$waTun", dto.WhatsAppPublicTunnelUrl ?? (object)DBNull.Value);
                    saveCmd.Parameters.AddWithValue("$waAccess", dto.WhatsAppAccessToken ?? "********");

                    await saveCmd.ExecuteNonQueryAsync();
                }

                // Audit log
                await _auditService.LogAsync(_userContext.CurrentUserId, "UpdateAdvancedSettings", "Settings", Guid.Empty, new { UpdatedKeys = "bootstrap appsettings.json and database operational settings" });

                return Ok(new { success = true, message = "Advanced bootstrap and operational configurations updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("health")]
        public async Task<IActionResult> GetSystemHealth()
        {
            var dbStatus = "Connected";
            try { await _context.Database.CanConnectAsync(); } catch { dbStatus = "Error"; }

            var profile = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
            var middlewareStatus = "Error";
            if (profile != null && !string.IsNullOrEmpty(profile.MiddlewareApiUrl))
            {
                try
                {
                    using var client = new System.Net.Http.HttpClient();
                    client.Timeout = TimeSpan.FromSeconds(3);
                    var response = await client.GetAsync(profile.MiddlewareApiUrl.Replace("/api/events", "/health") ?? "http://localhost:5069/health");
                    if (response.IsSuccessStatusCode) middlewareStatus = "Connected";
                }
                catch { }
            }

            var storageStatus = "Accessible";
            long freeSpace = 0;
            if (profile != null && !string.IsNullOrEmpty(profile.ReportStorageFolder))
            {
                try
                {
                    var drive = new DriveInfo(Path.GetPathRoot(profile.ReportStorageFolder) ?? "C:\\");
                    if (drive.IsReady) freeSpace = drive.AvailableFreeSpace;
                }
                catch { storageStatus = "Error"; }
            }

            var lastBackupStr = "Never";
            if (profile != null)
            {
                var backupDir = Path.Combine(profile.WorkingDirectory ?? AppContext.BaseDirectory, "Backup");
                if (Directory.Exists(backupDir))
                {
                    var files = Directory.GetFiles(backupDir, "backup_*.zip.enc");
                    if (files.Length > 0)
                    {
                        var latest = files.Select(f => new FileInfo(f)).OrderByDescending(f => f.LastWriteTime).First();
                        lastBackupStr = $"{latest.LastWriteTime:yyyy-MM-dd HH:mm:ss} ({latest.Length / (1024 * 1024.0):F1} MB)";
                    }
                }
            }

            return Ok(new {
                database = dbStatus,
                middleware = middlewareStatus,
                storage = storageStatus,
                storageFreeSpaceBytes = freeSpace,
                lastBackup = lastBackupStr,
                cloudSync = "Connected",
                currentVersion = "1.2.0-Enterprise",
                license = "Enterprise Active (Expires: 2027-12-31)",
                updateStatus = "Up to date"
            });
        }

        [HttpPost("test-db")]
        public async Task<IActionResult> TestDbConnection([FromBody] DbConnectionDto dto)
        {
            try
            {
                var connBuilder = new SqlConnectionStringBuilder
                {
                    DataSource = dto.Server,
                    InitialCatalog = dto.Database,
                    UserID = dto.User,
                    Password = dto.Password,
                    TrustServerCertificate = true,
                    MultipleActiveResultSets = true,
                    Encrypt = true
                };
                using var conn = new SqlConnection(connBuilder.ConnectionString);
                await conn.OpenAsync();
                return Ok(new { success = true, message = "Database connection test successful." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("test-path")]
        public async Task<IActionResult> TestPathPermissions([FromBody] PathDto dto)
        {
            try
            {
                if (string.IsNullOrEmpty(dto.Path))
                    return BadRequest("Path is empty.");

                if (!Directory.Exists(dto.Path))
                    Directory.CreateDirectory(dto.Path);

                var tempFile = Path.Combine(dto.Path, $"write_test_{Guid.NewGuid():N}.tmp");
                await System.IO.File.WriteAllTextAsync(tempFile, "temp");
                System.IO.File.Delete(tempFile);

                return Ok(new { success = true, message = "Path verification and write permission tests successful." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("test-middleware")]
        public async Task<IActionResult> TestMiddlewareConnection([FromBody] MiddlewareDto dto)
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                if (!string.IsNullOrEmpty(dto.ApiKey))
                {
                    client.DefaultRequestHeaders.Add("X-Api-Key", dto.ApiKey);
                }
                var testUrl = dto.ApiUrl?.Replace("/api/events", "/health") ?? "http://localhost:5069/health";
                var response = await client.GetAsync(testUrl);
                if (response.IsSuccessStatusCode)
                {
                    return Ok(new { success = true, message = "Middleware connection test successful." });
                }
                return Ok(new { success = false, message = $"Middleware returned status code: {response.StatusCode}" });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("run-backup")]
        public async Task<IActionResult> RunBackup()
        {
            try
            {
                var backupId = await _backupService.ExecuteBackupAsync("Manual");
                return Ok(new { success = true, backupId, message = "Manual backup triggered and executed successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("sync-cloud")]
        public async Task<IActionResult> SyncCloud()
        {
            await Task.Delay(1000);
            return Ok(new { success = true, message = "Simulated cloud synchronization triggered and completed successfully." });
        }

        [HttpGet("download-logs")]
        public async Task<IActionResult> DownloadLogs()
        {
            try
            {
                var logFilePattern = $"synos-api-{DateTime.UtcNow:yyyyMMdd}.txt";
                var baseDir = _configuration["Working:Directory"] ?? AppContext.BaseDirectory;
                var fullLogPath = Path.Combine(baseDir, "logs", logFilePattern);

                if (!System.IO.File.Exists(fullLogPath))
                {
                    fullLogPath = Path.Combine(AppContext.BaseDirectory, "logs", logFilePattern);
                }

                if (!System.IO.File.Exists(fullLogPath))
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

                if (!System.IO.File.Exists(fullLogPath))
                {
                    return NotFound(new { message = "Active system log file not found." });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(fullLogPath);
                return File(fileBytes, "text/plain", Path.GetFileName(fullLogPath));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("clear-logs")]
        public async Task<IActionResult> ClearLogs()
        {
            try
            {
                var baseDir = _configuration["Working:Directory"] ?? AppContext.BaseDirectory;
                var logsDir = Path.Combine(baseDir, "logs");
                var count = 0;
                if (Directory.Exists(logsDir))
                {
                    var files = Directory.GetFiles(logsDir, "synos-api-*.txt");
                    var activeLogPattern = $"synos-api-{DateTime.UtcNow:yyyyMMdd}.txt";
                    foreach (var file in files)
                    {
                        if (!file.EndsWith(activeLogPattern, StringComparison.OrdinalIgnoreCase))
                        {
                            System.IO.File.Delete(file);
                            count++;
                        }
                    }
                }
                return Ok(new { success = true, clearedCount = count, message = $"{count} archived log files cleared successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("rotate-secret")]
        public async Task<IActionResult> RotateSecret([FromBody] RotateSecretDto dto)
        {
            try
            {
                if (string.IsNullOrEmpty(dto.SecretType))
                    return BadRequest("secretType is required.");

                var profile = await _context.LabProfiles.FirstOrDefaultAsync();
                if (profile == null)
                    return NotFound("LabProfile not found.");

                var newSecret = GenerateSecureKey(dto.SecretType.ToLower() == "jwt" ? 64 : 32);

                if (dto.SecretType.Equals("jwt", StringComparison.OrdinalIgnoreCase))
                {
                    var clientPath = FindAppSettingsPath();
                    if (System.IO.File.Exists(clientPath))
                    {
                        var jsonText = await System.IO.File.ReadAllTextAsync(clientPath);
                        var root = JsonNode.Parse(jsonText)?.AsObject();
                        if (root != null)
                        {
                            SetNodeValue(root, "Jwt:Secret", JsonValue.Create(newSecret));
                            var writeOptions = new JsonSerializerOptions { WriteIndented = true };
                            await System.IO.File.WriteAllTextAsync(clientPath, JsonSerializer.Serialize(root, writeOptions));
                        }
                    }
                }
                else if (dto.SecretType.Equals("backup", StringComparison.OrdinalIgnoreCase))
                {
                    profile.BackupEncryptionKey = newSecret;
                    await _context.SaveChangesAsync();
                }
                else if (dto.SecretType.Equals("diagnostics", StringComparison.OrdinalIgnoreCase))
                {
                    profile.DiagnosticsEncryptionKey = newSecret;
                    await _context.SaveChangesAsync();
                }
                else if (dto.SecretType.Equals("middleware", StringComparison.OrdinalIgnoreCase))
                {
                    profile.MiddlewareApiKey = newSecret;
                    await _context.SaveChangesAsync();
                    await _auditService.LogAsync(_userContext.CurrentUserId, "SecretRotated", "Settings", profile.LabProfileId, new { SecretType = dto.SecretType });
                    return Ok(new { success = true, key = newSecret, message = "Middleware API Key rotated successfully." });
                }
                else
                {
                    return BadRequest($"Invalid secret type '{dto.SecretType}'.");
                }

                await _auditService.LogAsync(_userContext.CurrentUserId, "SecretRotated", "Settings", profile.LabProfileId, new { SecretType = dto.SecretType });
                return Ok(new { success = true, message = $"{dto.SecretType} secret key rotated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("update-license-key")]
        public async Task<IActionResult> UpdateLicenseKey([FromBody] UpdateLicenseKeyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.LicenseKey))
            {
                return BadRequest(new { success = false, message = "License Key is required." });
            }

            var profile = await _context.LabProfiles.FirstOrDefaultAsync();
            if (profile == null)
            {
                return NotFound(new { message = "Global Lab Profile settings not found." });
            }

            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.Timeout = TimeSpan.FromSeconds(5);

                var apiUrl = string.IsNullOrWhiteSpace(profile.MiddlewareApiUrl) ? "http://localhost:5069/api/events" : profile.MiddlewareApiUrl;
                var validateUrl = apiUrl.Replace("/api/events", "/api/labs/validate");

                var request = new HttpRequestMessage(HttpMethod.Post, validateUrl);
                request.Headers.Add("X-Api-Key", dto.LicenseKey);

                var response = await client.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;
                    var labId = root.TryGetProperty("labId", out var idProp) ? idProp.GetString() : null;
                    var labName = root.TryGetProperty("labName", out var nameProp) ? nameProp.GetString() : null;
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

                    // Save to local database
                    profile.MiddlewareApiKey = dto.LicenseKey;
                    if (!string.IsNullOrEmpty(labId)) profile.LabId = labId;
                    if (!string.IsNullOrEmpty(licenseType)) profile.LicenseType = licenseType;
                    profile.MaximumBranches = maximumBranches;
                    if (!string.IsNullOrEmpty(licenseStatus)) profile.LicenseStatus = licenseStatus;
                    profile.EnabledFeatures = enabledFeatures;
                    if (!string.IsNullOrEmpty(expiryDate) && DateTime.TryParse(expiryDate, out var parsedExp))
                    {
                        profile.LicenseExpiryDate = parsedExp;
                    }
                    else
                    {
                        profile.LicenseExpiryDate = null;
                    }
                    profile.UpdatedAt = DateTimeOffset.UtcNow;

                    await _context.SaveChangesAsync();

                    // Save to appsettings.json
                    var clientPath = FindAppSettingsPath();
                    if (System.IO.File.Exists(clientPath))
                    {
                        var jsonText = await System.IO.File.ReadAllTextAsync(clientPath);
                        var settingsNode = JsonNode.Parse(jsonText)?.AsObject();
                        if (settingsNode != null)
                        {
                            SetNodeValue(settingsNode, "Middleware:ApiKey", JsonValue.Create(dto.LicenseKey));
                            if (!string.IsNullOrEmpty(labId))
                            {
                                SetNodeValue(settingsNode, "Middleware:LabId", JsonValue.Create(labId));
                            }
                            var writeOptions = new JsonSerializerOptions { WriteIndented = true };
                            await System.IO.File.WriteAllTextAsync(clientPath, JsonSerializer.Serialize(settingsNode, writeOptions));
                        }
                    }

                    // Reload configurations
                    if (_configuration is IConfigurationRoot configRoot)
                    {
                        configRoot.Reload();
                    }

                    await _auditService.LogAsync(_userContext.CurrentUserId, "LicenseUpdated", "Settings", profile.LabProfileId, new { LicenseKey = dto.LicenseKey, LicenseType = licenseType });

                    return Ok(new 
                    { 
                        success = true, 
                        message = "License key updated successfully.",
                        licenseType = licenseType,
                        maximumBranches = maximumBranches,
                        expiryDate = expiryDate
                    });
                }
                else
                {
                    return Ok(new { success = false, message = $"Verification failed: Middleware returned status code: {response.StatusCode}" });
                }
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = $"Failed to connect to Middleware: {ex.Message}" });
            }
        }

        private string GenerateSecureKey(int length)
        {
            var bytes = new byte[length];
            using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            return Convert.ToBase64String(bytes);
        }

        private string FindAppSettingsPath()
        {
            var paths = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "appsettings.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "src", "SynOS.Api", "appsettings.json")
            };
            foreach (var path in paths)
            {
                if (System.IO.File.Exists(path)) return path;
            }
            return Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        }

        private string FindMiddlewareAppSettingsPath()
        {
            var paths = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), "TBZ.Middleware", "src", "TBZ.Middleware.Api", "appsettings.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "TBZ.Middleware", "src", "TBZ.Middleware.Api", "appsettings.json"),
                Path.Combine(AppContext.BaseDirectory, "..", "TBZ.Middleware", "src", "TBZ.Middleware.Api", "appsettings.json")
            };
            foreach (var path in paths)
            {
                if (System.IO.File.Exists(path)) return path;
            }
            return Path.Combine(AppContext.BaseDirectory, "TBZ.Middleware", "src", "TBZ.Middleware.Api", "appsettings.json");
        }

        private string FindMiddlewareDbPath()
        {
            var paths = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), "TBZ.Middleware", "src", "TBZ.Middleware.Api", "MiddlewareDb.db"),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "TBZ.Middleware", "src", "TBZ.Middleware.Api", "MiddlewareDb.db"),
                Path.Combine(AppContext.BaseDirectory, "..", "TBZ.Middleware", "src", "TBZ.Middleware.Api", "MiddlewareDb.db"),
                Path.Combine(AppContext.BaseDirectory, "MiddlewareDb.db")
            };
            foreach (var path in paths)
            {
                if (System.IO.File.Exists(path)) return path;
            }
            return Path.Combine(AppContext.BaseDirectory, "MiddlewareDb.db");
        }

        private void SetNodeValue(JsonNode root, string path, JsonNode? value)
        {
            var parts = path.Split(':');
            JsonNode current = root;
            for (int i = 0; i < parts.Length - 1; i++)
            {
                var part = parts[i];
                if (current[part] == null)
                {
                    current[part] = new JsonObject();
                }
                current = current[part]!;
            }
            current[parts[^1]] = value;
        }

        private JsonNode? GetNodeValue(JsonNode root, string path)
        {
            var parts = path.Split(':');
            JsonNode? current = root;
            for (int i = 0; i < parts.Length; i++)
            {
                var part = parts[i];
                current = current?[part];
                if (current == null) return null;
            }
            return current;
        }
    }

    public class AdvancedSettingsDto
    {
        public string? ConnectionString { get; set; }
        public string? LabId { get; set; }
        public string? LicenseType { get; set; }
        public int MaximumBranches { get; set; }
        public string? LicenseExpiryDate { get; set; }
        public string? LicenseStatus { get; set; }
        public System.Collections.Generic.List<string>? EnabledFeatures { get; set; }
        public string? JwtSecret { get; set; }
        public string? JwtIssuer { get; set; }
        public string? JwtAudience { get; set; }
        public string? MiddlewareApiUrl { get; set; }
        public string? MiddlewareApiKey { get; set; }
        public string? BackupEncryptionKey { get; set; }
        public string? DiagnosticsEncryptionKey { get; set; }
        public string? PacsRootPath { get; set; }
        public int? PacsMaxInstancesPerSeriesInSeriesTree { get; set; }
        public int? PacsMaxTotalInstancesPerStudyInSeriesTree { get; set; }
        public string? FileStorageBasePath { get; set; }
        public string? FileStoragePublicBaseUrl { get; set; }
        public string? SecureLinkBaseUrl { get; set; }
        public string? SecureLinkPublicBaseUrl { get; set; }
        public bool? ReferralEconomicsEnabled { get; set; }
        public string? InventoryValuationMethod { get; set; }
        public string? AllowedHosts { get; set; }
        public string? TrustedKey2026v1 { get; set; }
        public string? AllowedOrigins { get; set; }
        public int? RateLimitPermitLimit { get; set; }
        public int? RateLimitWindowSeconds { get; set; }
        public int? RateLimitQueueLimit { get; set; }

        // New properties
        public string? WorkingDirectory { get; set; }
        public int? JwtExpiryMinutes { get; set; }
        public int? JwtRefreshTokenExpiryDays { get; set; }
        public string? OtaChannel { get; set; }
        public string? OtaPolicy { get; set; }
        public string? OtaMaintenanceDay { get; set; }
        public string? OtaMaintenanceStartHour { get; set; }
        public string? OtaMaintenanceEndHour { get; set; }

        // Secrets Status Metadata
        public string? JwtSecretStatus { get; set; }
        public string? BackupKeyStatus { get; set; }
        public string? DiagnosticsKeyStatus { get; set; }

        // WhatsApp settings
        public string? WhatsAppGraphApiVersion { get; set; }
        public string? WhatsAppAppSecret { get; set; }
        public string? WhatsAppVerifyToken { get; set; }
        public string? WhatsAppPhoneNumberId { get; set; }
        public string? WhatsAppBusinessAccountId { get; set; }
        public string? WhatsAppActiveTemplateName { get; set; }
        public string? WhatsAppPublicTunnelUrl { get; set; }
        public string? WhatsAppAccessToken { get; set; }
    }

    public class DbConnectionDto
    {
        public string Server { get; set; } = null!;
        public string Database { get; set; } = null!;
        public string User { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class PathDto
    {
        public string Path { get; set; } = null!;
    }

    public class MiddlewareDto
    {
        public string ApiUrl { get; set; } = null!;
        public string ApiKey { get; set; } = null!;
    }

    public class RotateSecretDto
    {
        public string SecretType { get; set; } = null!;
    }

    public class UpdateLicenseKeyDto
    {
        public string LicenseKey { get; set; } = null!;
    }
}
