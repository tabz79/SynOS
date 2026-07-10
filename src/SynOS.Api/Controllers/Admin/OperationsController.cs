using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Services;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/operations")]
    [Authorize(Roles = "Admin")]
    public class OperationsController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IBackupService _backupService;
        private readonly ISupportService _supportService;
        private readonly IUpdateService _updateService;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;
        private readonly System.Net.Http.IHttpClientFactory _httpClientFactory;

        public OperationsController(
            SynOSDbContext context,
            IBackupService backupService,
            ISupportService supportService,
            IUpdateService updateService,
            Microsoft.Extensions.Configuration.IConfiguration configuration,
            System.Net.Http.IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _backupService = backupService;
            _supportService = supportService;
            _updateService = updateService;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        // ==========================================
        // 1. BACKUP & RESTORE ENDPOINTS
        // ==========================================

        [HttpGet("backups")]
        public IActionResult GetBackups()
        {
            try
            {
                var baseDir = AppContext.BaseDirectory;
                var backupFolder = Path.Combine(baseDir, "Backups");

                if (!Directory.Exists(backupFolder))
                {
                    return Ok(Array.Empty<object>());
                }

                var files = Directory.GetFiles(backupFolder, "*.zip.enc")
                    .Select(file =>
                    {
                        var info = new FileInfo(file);
                        var parts = Path.GetFileNameWithoutExtension(Path.GetFileNameWithoutExtension(file)).Split('_');
                        var backupId = parts.Length > 1 ? parts[1] : Guid.NewGuid().ToString();

                        return new
                        {
                            BackupId = backupId,
                            FileName = Path.GetFileName(file),
                            FilePath = file,
                            Size = info.Length,
                            CreatedAt = info.CreationTimeUtc,
                            Status = "Verified"
                        };
                    })
                    .OrderByDescending(f => f.CreatedAt)
                    .ToList();

                return Ok(files);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("backups/run")]
        public async Task<IActionResult> RunBackup([FromQuery] string backupType = "Full")
        {
            try
            {
                var backupId = await _backupService.ExecuteBackupAsync(backupType);
                return Ok(new { backupId = backupId, message = "Backup executed successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("backups/restore")]
        public async Task<IActionResult> RestoreBackup([FromQuery] Guid backupId, [FromQuery] string fileName)
        {
            try
            {
                var baseDir = AppContext.BaseDirectory;
                var backupFilePath = Path.Combine(baseDir, "Backups", fileName);

                if (!System.IO.File.Exists(backupFilePath))
                {
                    return NotFound(new { message = "Backup file not found on disk." });
                }

                var success = await _backupService.ExecuteRestoreAsync(backupId, backupFilePath, Guid.Empty);
                return Ok(new { success = success, message = success ? "Database restore completed successfully" : "Database restore failed" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // 2. SUPPORT & TICKETS ENDPOINTS
        // ==========================================

        [HttpGet("tickets")]
        public async Task<IActionResult> GetTickets()
        {
            try
            {
                var tickets = await _context.SupportTickets
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => new
                    {
                        TicketId = t.Id,
                        Title = t.Title,
                        Description = t.Description,
                        Priority = t.Priority,
                        Category = t.Category,
                        CreatedAt = t.CreatedAt,
                        Status = t.Status,
                        StatusMessage = t.StatusMessage,
                        UpdatedAt = t.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(tickets);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("tickets/create")]
        public async Task<IActionResult> CreateTicket([FromBody] SupportTicketRequest request)
        {
            try
            {
                var ticketId = await _supportService.CreateTicketAsync(
                    request.Title,
                    request.Description,
                    request.Priority,
                    request.Category
                );
                return Ok(new { ticketId = ticketId, message = "Support ticket queued successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // 3. ABOUT & UPDATES ENDPOINTS
        // ==========================================

        [HttpGet("system-info")]
        public IActionResult GetSystemInfo()
        {
            try
            {
                var systemInfo = new
                {
                    Version = "v1.2.0",
                    Status = "Stable",
                    OS = Environment.OSVersion.ToString(),
                    DotNet = Environment.Version.ToString(),
                    UpdateAvailable = false,
                    PendingReleaseVersion = "",
                    ReleaseNotes = "Canary Release Ring. Includes extended support triage tools and database partitioning.",
                    LastChecked = DateTime.UtcNow.AddHours(-1)
                };

                return Ok(systemInfo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("updates/check")]
        public async Task<IActionResult> CheckForUpdates()
        {
            try
            {
                var versionObj = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version;
                var currentVersion = versionObj != null ? $"{versionObj.Major}.{versionObj.Minor}.{versionObj.Build}" : "1.2.0";
                if (currentVersion == "1.0.0")
                {
                    currentVersion = "1.2.0";
                }

                var labId = _configuration["Middleware:LabId"] ?? "LAB001";
                var apiUrl = _configuration["Middleware:ApiUrl"] ?? "http://localhost:5069/api/events";
                var apiKey = _configuration["Middleware:ApiKey"] ?? "TBZ-LAB-KEY-12345";

                var baseUrl = apiUrl.Replace("/api/events", "/api/controltower");
                var requestUrl = $"{baseUrl}/updates/check?labId={Uri.EscapeDataString(labId)}&currentVersion={Uri.EscapeDataString(currentVersion)}";

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("X-Lab-Id", labId);
                client.DefaultRequestHeaders.Add("X-Api-Key", apiKey);

                var response = await client.GetAsync(requestUrl);
                if (!response.IsSuccessStatusCode)
                {
                    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        return Ok(new
                        {
                            updateAvailable = false,
                            version = currentVersion,
                            message = "The system is already running the latest software version."
                        });
                    }
                    var errText = await response.Content.ReadAsStringAsync();
                    return StatusCode((int)response.StatusCode, new { message = $"Middleware error: {errText}" });
                }

                var jsonText = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonText);
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to check for updates: {ex.Message}" });
            }
        }

        [HttpPost("updates/assess")]
        public async Task<IActionResult> AssessReadiness([FromBody] System.Text.Json.JsonElement manifest)
        {
            try
            {
                var manifestJson = manifest.GetRawText();
                var report = await _updateService.AssessUpdateReadinessAsync(manifestJson);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("updates/apply")]
        public async Task<IActionResult> ApplyUpdate([FromBody] System.Text.Json.JsonElement manifest)
        {
            try
            {
                var manifestJson = manifest.GetRawText();
                var success = await _updateService.ExecuteUpdateAsync(manifestJson);
                return Ok(new { success = success, message = success ? "Software update successfully applied" : "Software update failed" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class SupportTicketRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
    }
}
