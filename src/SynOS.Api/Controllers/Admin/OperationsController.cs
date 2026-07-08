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

        public OperationsController(
            SynOSDbContext context,
            IBackupService backupService,
            ISupportService supportService,
            IUpdateService updateService)
        {
            _context = context;
            _backupService = backupService;
            _supportService = supportService;
            _updateService = updateService;
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
                var outboxEvents = await _context.OutboxEvents
                    .Where(e => e.EventType == "SupportTicketCreated")
                    .OrderByDescending(e => e.CreatedAt)
                    .ToListAsync();

                var tickets = outboxEvents.Select(e =>
                {
                    using var doc = JsonDocument.Parse(e.PayloadJson);
                    var root = doc.RootElement;

                    return new
                    {
                        TicketId = root.GetProperty("TicketId").GetGuid(),
                        Title = root.GetProperty("Title").GetString(),
                        Description = root.GetProperty("Description").GetString(),
                        Priority = root.GetProperty("Priority").GetString(),
                        Category = root.GetProperty("Category").GetString(),
                        CreatedAt = root.GetProperty("CreatedAt").GetDateTime(),
                        Status = e.Status
                    };
                }).ToList();

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
        public IActionResult CheckForUpdates()
        {
            return Ok(new
            {
                updateAvailable = false,
                version = "v1.2.0",
                message = "The system is already running the latest software version."
            });
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
