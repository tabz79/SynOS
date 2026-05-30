using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Services;
using SynOS.Services.Security;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/printing")]
    [Authorize(Roles = "Admin")]
    public class PrintingConfigController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IUserContext _userContext;

        public PrintingConfigController(SynOSDbContext context, IAuditService auditService, IUserContext userContext)
        {
            _context = context;
            _auditService = auditService;
            _userContext = userContext;
        }

        #region Branch Printers

        [HttpGet("printers")]
        public async Task<IActionResult> GetPrinters()
        {
            var printers = await _context.BranchPrinters
                .Include(p => p.Branch)
                .OrderBy(p => p.Branch!.Name)
                .ThenBy(p => p.PrinterName)
                .ToListAsync();
            return Ok(printers);
        }

        [HttpPost("printers")]
        public async Task<IActionResult> CreatePrinter([FromBody] BranchPrinter printer)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            _context.BranchPrinters.Add(printer);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "RegisterBranchPrinter",
                "BranchPrinter",
                printer.PrinterId,
                printer
            );

            return CreatedAtAction(nameof(GetPrinters), new { id = printer.PrinterId }, printer);
        }

        [HttpPut("printers/{id}")]
        public async Task<IActionResult> UpdatePrinter(Guid id, [FromBody] BranchPrinter update)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var printer = await _context.BranchPrinters.FindAsync(id);
            if (printer == null)
            {
                return NotFound(new { message = "Branch printer not found." });
            }

            var oldState = new
            {
                printer.PrinterName,
                printer.PrinterType,
                printer.IsActive,
                printer.BranchId
            };

            printer.PrinterName = update.PrinterName;
            printer.PrinterType = update.PrinterType;
            printer.IsActive = update.IsActive;
            printer.BranchId = update.BranchId;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "UpdateBranchPrinter",
                "BranchPrinter",
                printer.PrinterId,
                new { Old = oldState, New = update }
            );

            return Ok(printer);
        }

        [HttpDelete("printers/{id}")]
        public async Task<IActionResult> DeletePrinter(Guid id)
        {
            var printer = await _context.BranchPrinters.FindAsync(id);
            if (printer == null)
            {
                return NotFound(new { message = "Branch printer not found." });
            }

            // Check if any Terminal uses this printer
            var activeAssignments = await _context.TerminalPrinterConfigs
                .AnyAsync(c => c.SpecificReceiptPrinterId == id);

            if (activeAssignments)
            {
                return BadRequest(new { message = "Cannot delete printer. Workstations are currently configured to route to this printer." });
            }

            _context.BranchPrinters.Remove(printer);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "DeleteBranchPrinter",
                "BranchPrinter",
                id,
                new { DeletedPrinterName = printer.PrinterName }
            );

            return Ok(new { message = "Printer deleted successfully." });
        }

        #endregion

        #region Terminal Printer Configs

        [HttpGet("terminals")]
        public async Task<IActionResult> GetTerminals()
        {
            var configs = await _context.TerminalPrinterConfigs
                .Include(c => c.Branch)
                .Include(c => c.SpecificReceiptPrinter)
                .OrderBy(c => c.Branch!.Name)
                .ThenBy(c => c.TerminalIdentifier)
                .ToListAsync();
            return Ok(configs);
        }

        [HttpPost("terminals")]
        public async Task<IActionResult> CreateTerminalConfig([FromBody] TerminalPrinterConfig config)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var existing = await _context.TerminalPrinterConfigs.FindAsync(config.TerminalIdentifier);
            if (existing != null)
            {
                return Conflict(new { message = "Terminal configuration already exists for this identifier." });
            }

            config.UpdatedAt = DateTime.UtcNow;
            _context.TerminalPrinterConfigs.Add(config);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "RegisterTerminalPrinterConfig",
                "TerminalPrinterConfig",
                null,
                config
            );

            return CreatedAtAction(nameof(GetTerminals), new { id = config.TerminalIdentifier }, config);
        }

        [HttpPut("terminals/{identifier}")]
        public async Task<IActionResult> UpdateTerminalConfig(string identifier, [FromBody] TerminalPrinterConfig update)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var config = await _context.TerminalPrinterConfigs.FindAsync(identifier);
            if (config == null)
            {
                return NotFound(new { message = "Terminal configuration not found." });
            }

            var oldState = new
            {
                config.BranchId,
                config.IsLeadPrintTerminal,
                config.SpecificReceiptPrinterId
            };

            config.BranchId = update.BranchId;
            config.IsLeadPrintTerminal = update.IsLeadPrintTerminal;
            config.SpecificReceiptPrinterId = update.SpecificReceiptPrinterId;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "UpdateTerminalPrinterConfig",
                "TerminalPrinterConfig",
                null,
                new { Old = oldState, New = update }
            );

            return Ok(config);
        }

        [HttpDelete("terminals/{identifier}")]
        public async Task<IActionResult> DeleteTerminalConfig(string identifier)
        {
            var config = await _context.TerminalPrinterConfigs.FindAsync(identifier);
            if (config == null)
            {
                return NotFound(new { message = "Terminal configuration not found." });
            }

            _context.TerminalPrinterConfigs.Remove(config);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "DeleteTerminalPrinterConfig",
                "TerminalPrinterConfig",
                null,
                new { DeletedTerminalId = identifier }
            );

            return Ok(new { message = "Terminal configuration removed successfully." });
        }

        #endregion

        #region Thermal Receipt Layout Settings

        [HttpGet("settings")]
        public async Task<IActionResult> GetGlobalThermalSettings()
        {
            var path = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "thermal_settings.json");
            if (!System.IO.File.Exists(path))
            {
                var defaultSettings = new
                {
                    paperWidth = "80mm",
                    textSize = "standard",
                    fontFamily = "sans-serif",
                    showHeader = true,
                    showAgeGender = true,
                    showVisitId = true,
                    showTokenBox = true,
                    showDoctorName = true,
                    showItemDiscounts = true,
                    showUpiQr = false,
                    upiId = "",
                    headerSubtext = "",
                    footerDisclaimer = "* Clinical correlation of findings."
                };
                var defaultJson = System.Text.Json.JsonSerializer.Serialize(defaultSettings);
                await System.IO.File.WriteAllTextAsync(path, defaultJson);
                return Content(defaultJson, "application/json");
            }
            var json = await System.IO.File.ReadAllTextAsync(path);
            return Content(json, "application/json");
        }

        [HttpPost("settings")]
        public async Task<IActionResult> SaveGlobalThermalSettings([FromBody] System.Text.Json.JsonElement settings)
        {
            var path = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "thermal_settings.json");
            var json = settings.ToString();
            await System.IO.File.WriteAllTextAsync(path, json);

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "UpdateGlobalThermalSettings",
                "Settings",
                null,
                settings
            );

            return Ok(new { message = "Global thermal layout settings saved successfully." });
        }

        #endregion
    }
}
