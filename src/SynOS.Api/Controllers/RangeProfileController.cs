using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/ranges/profiles")]
    [Authorize]
    public class RangeProfileController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public RangeProfileController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfiles([FromQuery] string? parameterCode)
        {
            var query = _context.RangeProfiles.AsQueryable();

            if (!string.IsNullOrWhiteSpace(parameterCode))
            {
                query = query.Where(p => p.ParameterCode == parameterCode);
            }

            var profiles = await query
                .OrderBy(p => p.ProfileName)
                .ToListAsync();

            return Ok(profiles);
        }

        [HttpGet("{profileId}")]
        public async Task<IActionResult> GetProfileById(Guid profileId)
        {
            var profile = await _context.RangeProfiles
                .Include(p => p.RangeConditions)
                .FirstOrDefaultAsync(p => p.ProfileId == profileId);

            if (profile == null)
                return NotFound($"Range profile '{profileId}' not found.");

            return Ok(profile);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateProfile([FromBody] CreateRangeProfileDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ParameterCode) || string.IsNullOrWhiteSpace(dto.ProfileName))
                return BadRequest("Parameter code and profile name are required.");

            var parameterExists = await _context.ParameterMasters.AnyAsync(pm => pm.ParameterCode == dto.ParameterCode);
            if (!parameterExists)
                return NotFound($"Parameter master '{dto.ParameterCode}' not found.");

            var profile = new RangeProfile
            {
                ProfileId = Guid.NewGuid(),
                ParameterCode = dto.ParameterCode,
                ProfileName = dto.ProfileName.Trim(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.RangeProfiles.Add(profile);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProfileById), new { profileId = profile.ProfileId }, profile);
        }

        [HttpPut("{profileId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateProfile(Guid profileId, [FromBody] UpdateRangeProfileDto dto)
        {
            var profile = await _context.RangeProfiles.FirstOrDefaultAsync(p => p.ProfileId == profileId);
            if (profile == null)
                return NotFound($"Range profile '{profileId}' not found.");

            profile.ProfileName = dto.ProfileName.Trim();
            await _context.SaveChangesAsync();

            return Ok(profile);
        }

        [HttpDelete("{profileId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteProfile(Guid profileId)
        {
            var profile = await _context.RangeProfiles.FirstOrDefaultAsync(p => p.ProfileId == profileId);
            if (profile == null)
                return NotFound($"Range profile '{profileId}' not found.");

            _context.RangeProfiles.Remove(profile);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- Condition Builder Sub-Routes ---

        [HttpGet("{profileId}/conditions")]
        public async Task<IActionResult> GetConditions(Guid profileId)
        {
            var profileExists = await _context.RangeProfiles.AnyAsync(p => p.ProfileId == profileId);
            if (!profileExists)
                return NotFound($"Range profile '{profileId}' not found.");

            var conditions = await _context.RangeConditions
                .Where(c => c.ProfileId == profileId)
                .OrderBy(c => c.AgeMinDays)
                .ToListAsync();

            return Ok(conditions);
        }

        [HttpPost("{profileId}/conditions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateCondition(Guid profileId, [FromBody] CreateRangeConditionDto dto)
        {
            var profileExists = await _context.RangeProfiles.AnyAsync(p => p.ProfileId == profileId);
            if (!profileExists)
                return NotFound($"Range profile '{profileId}' not found.");

            var condition = new RangeCondition
            {
                ConditionId = Guid.NewGuid(),
                ProfileId = profileId,
                Sex = dto.Sex.Trim(),
                AgeMinDays = dto.AgeMinDays,
                AgeMaxDays = dto.AgeMaxDays,
                FastingStatus = dto.FastingStatus.Trim(),
                Methodology = dto.Methodology?.Trim(),
                InstrumentCode = dto.InstrumentCode?.Trim(),
                MinNormal = dto.MinNormal,
                MaxNormal = dto.MaxNormal,
                MinCritical = dto.MinCritical,
                MaxCritical = dto.MaxCritical,
                TextRange = dto.TextRange?.Trim(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.RangeConditions.Add(condition);
            await _context.SaveChangesAsync();

            return Ok(condition);
        }

        [HttpPut("{profileId}/conditions/{conditionId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateCondition(Guid profileId, Guid conditionId, [FromBody] UpdateRangeConditionDto dto)
        {
            var condition = await _context.RangeConditions
                .FirstOrDefaultAsync(c => c.ConditionId == conditionId && c.ProfileId == profileId);

            if (condition == null)
                return NotFound($"Condition '{conditionId}' not found in profile '{profileId}'.");

            condition.Sex = dto.Sex.Trim();
            condition.AgeMinDays = dto.AgeMinDays;
            condition.AgeMaxDays = dto.AgeMaxDays;
            condition.FastingStatus = dto.FastingStatus.Trim();
            condition.Methodology = dto.Methodology?.Trim();
            condition.InstrumentCode = dto.InstrumentCode?.Trim();
            condition.MinNormal = dto.MinNormal;
            condition.MaxNormal = dto.MaxNormal;
            condition.MinCritical = dto.MinCritical;
            condition.MaxCritical = dto.MaxCritical;
            condition.TextRange = dto.TextRange?.Trim();

            await _context.SaveChangesAsync();
            return Ok(condition);
        }

        [HttpDelete("{profileId}/conditions/{conditionId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCondition(Guid profileId, Guid conditionId)
        {
            var condition = await _context.RangeConditions
                .FirstOrDefaultAsync(c => c.ConditionId == conditionId && c.ProfileId == profileId);

            if (condition == null)
                return NotFound($"Condition '{conditionId}' not found in profile '{profileId}'.");

            _context.RangeConditions.Remove(condition);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    // --- DTO Classes ---

    public class CreateRangeProfileDto
    {
        public string ParameterCode { get; set; } = string.Empty;
        public string ProfileName { get; set; } = string.Empty;
    }

    public class UpdateRangeProfileDto
    {
        public string ProfileName { get; set; } = string.Empty;
    }

    public class CreateRangeConditionDto
    {
        public string Sex { get; set; } = "ALL";
        public int AgeMinDays { get; set; } = 0;
        public int AgeMaxDays { get; set; } = 36525;
        public string FastingStatus { get; set; } = "Irrelevant";
        public string? Methodology { get; set; }
        public string? InstrumentCode { get; set; }
        public decimal? MinNormal { get; set; }
        public decimal? MaxNormal { get; set; }
        public decimal? MinCritical { get; set; }
        public decimal? MaxCritical { get; set; }
        public string? TextRange { get; set; }
    }

    public class UpdateRangeConditionDto
    {
        public string Sex { get; set; } = "ALL";
        public int AgeMinDays { get; set; } = 0;
        public int AgeMaxDays { get; set; } = 36525;
        public string FastingStatus { get; set; } = "Irrelevant";
        public string? Methodology { get; set; }
        public string? InstrumentCode { get; set; }
        public decimal? MinNormal { get; set; }
        public decimal? MaxNormal { get; set; }
        public decimal? MinCritical { get; set; }
        public decimal? MaxCritical { get; set; }
        public string? TextRange { get; set; }
    }
}
