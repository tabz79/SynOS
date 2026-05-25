using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/macros")]
    [Route("api/v1/macros")]
    public class MacrosController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public MacrosController(SynOSDbContext context)
        {
            _context = context;
        }

        private Guid? GetCurrentUserId()
        {
            var claimValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(claimValue, out var parsedGuid))
            {
                return parsedGuid;
            }
            
            // Fallback to first user in database for dev/testing robustness
            var firstUser = _context.Users.FirstOrDefault();
            return firstUser?.UserId;
        }

        // GET: api/macros
        [HttpGet]
        public async Task<IActionResult> GetMacros()
        {
            var userId = GetCurrentUserId();

            var macros = await _context.MedicalMacros
                .Where(m => m.Scope == "SYSTEM" || (m.Scope == "PERSONAL" && m.UserId == userId))
                .OrderBy(m => m.Shortcut)
                .ToListAsync();

            return Ok(macros);
        }

        // POST: api/macros
        [HttpPost]
        public async Task<IActionResult> CreateMacro([FromBody] MacroDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload");
            if (string.IsNullOrWhiteSpace(dto.Shortcut) || !dto.Shortcut.StartsWith("/"))
            {
                return BadRequest("Macro triggers must start with a slash (e.g. /my-macro)");
            }
            if (string.IsNullOrWhiteSpace(dto.Label) || string.IsNullOrWhiteSpace(dto.Text))
            {
                return BadRequest("Label and expansion text are required.");
            }

            var userId = GetCurrentUserId();

            // Check duplicate shortcut triggers in relevant scopes
            var duplicateExists = await _context.MedicalMacros.AnyAsync(m => 
                m.Shortcut.ToLower() == dto.Shortcut.ToLower() && 
                (m.Scope == "SYSTEM" || m.UserId == userId));

            if (duplicateExists)
            {
                return BadRequest("This trigger shortcut is already in use.");
            }

            var macro = new MedicalMacro
            {
                MacroId = Guid.NewGuid(),
                Shortcut = dto.Shortcut.Trim(),
                Label = dto.Label.Trim(),
                Description = dto.Description?.Trim() ?? "",
                Text = dto.Text.Trim(),
                Scope = dto.Scope?.ToUpper() == "SYSTEM" ? "SYSTEM" : "PERSONAL",
                UserId = dto.Scope?.ToUpper() == "SYSTEM" ? null : userId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _context.MedicalMacros.Add(macro);
            await _context.SaveChangesAsync();

            return Ok(macro);
        }

        // PUT: api/macros/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMacro(Guid id, [FromBody] MacroDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload");
            if (string.IsNullOrWhiteSpace(dto.Shortcut) || !dto.Shortcut.StartsWith("/"))
            {
                return BadRequest("Macro triggers must start with a slash (e.g. /my-macro)");
            }
            if (string.IsNullOrWhiteSpace(dto.Label) || string.IsNullOrWhiteSpace(dto.Text))
            {
                return BadRequest("Label and expansion text are required.");
            }

            var macro = await _context.MedicalMacros.FindAsync(id);
            if (macro == null) return NotFound("Macro not found");

            var userId = GetCurrentUserId();

            // Validate ownership of PERSONAL macro updates
            if (macro.Scope == "PERSONAL" && macro.UserId != userId)
            {
                return Forbid("You do not have permission to modify this macro.");
            }

            // Check duplicate trigger (excluding itself)
            var duplicateExists = await _context.MedicalMacros.AnyAsync(m => 
                m.MacroId != id &&
                m.Shortcut.ToLower() == dto.Shortcut.ToLower() && 
                (m.Scope == "SYSTEM" || m.UserId == userId));

            if (duplicateExists)
            {
                return BadRequest("This trigger shortcut is already in use.");
            }

            macro.Shortcut = dto.Shortcut.Trim();
            macro.Label = dto.Label.Trim();
            macro.Description = dto.Description?.Trim() ?? "";
            macro.Text = dto.Text.Trim();
            
            var newScope = dto.Scope?.ToUpper() == "SYSTEM" ? "SYSTEM" : "PERSONAL";
            macro.Scope = newScope;
            macro.UserId = newScope == "SYSTEM" ? null : userId;
            macro.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(macro);
        }

        // DELETE: api/macros/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMacro(Guid id)
        {
            var macro = await _context.MedicalMacros.FindAsync(id);
            if (macro == null) return NotFound("Macro not found");

            var userId = GetCurrentUserId();
            if (macro.Scope == "PERSONAL" && macro.UserId != userId)
            {
                return Forbid("You do not have permission to delete this macro.");
            }

            _context.MedicalMacros.Remove(macro);
            await _context.SaveChangesAsync();

            return Ok(true);
        }
    }

    public class MacroDto
    {
        public string Shortcut { get; set; } = null!;
        public string Label { get; set; } = null!;
        public string? Description { get; set; }
        public string Text { get; set; } = null!;
        public string? Scope { get; set; } // "PERSONAL" or "SYSTEM"
    }
}
