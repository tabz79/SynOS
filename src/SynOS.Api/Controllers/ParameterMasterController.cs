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
    [Route("api/v1/parameters")]
    [Authorize] // Standard token-based auth
    public class ParameterMasterController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public ParameterMasterController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var parameters = await _context.ParameterMasters
                .OrderBy(pm => pm.ParameterCode)
                .ToListAsync();
            return Ok(parameters);
        }

        [HttpGet("{parameterCode}")]
        public async Task<IActionResult> GetByCode(string parameterCode)
        {
            var parameter = await _context.ParameterMasters
                .Include(pm => pm.DerivedRules)
                .Include(pm => pm.AnalyzerMaps)
                .FirstOrDefaultAsync(pm => pm.ParameterCode == parameterCode);

            if (parameter == null)
                return NotFound($"Parameter master '{parameterCode}' not found.");

            return Ok(parameter);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateParameterMasterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ParameterCode))
                return BadRequest("Parameter code is required.");

            var exists = await _context.ParameterMasters.AnyAsync(pm => pm.ParameterCode == dto.ParameterCode);
            if (exists)
                return Conflict($"Parameter code '{dto.ParameterCode}' already exists.");

            var parameter = new ParameterMaster
            {
                ParameterCode = dto.ParameterCode.Trim(),
                CanonicalName = dto.CanonicalName.Trim(),
                ShortName = dto.ShortName?.Trim(),
                UnitType = dto.UnitType.Trim(),
                DefaultUnit = dto.DefaultUnit?.Trim(),
                DataType = dto.DataType.Trim(),
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _context.ParameterMasters.Add(parameter);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetByCode), new { parameterCode = parameter.ParameterCode }, parameter);
        }

        [HttpPut("{parameterCode}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(string parameterCode, [FromBody] UpdateParameterMasterDto dto)
        {
            var parameter = await _context.ParameterMasters.FirstOrDefaultAsync(pm => pm.ParameterCode == parameterCode);
            if (parameter == null)
                return NotFound($"Parameter master '{parameterCode}' not found.");

            parameter.CanonicalName = dto.CanonicalName.Trim();
            parameter.ShortName = dto.ShortName?.Trim();
            parameter.UnitType = dto.UnitType.Trim();
            parameter.DefaultUnit = dto.DefaultUnit?.Trim();
            parameter.DataType = dto.DataType.Trim();
            parameter.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(parameter);
        }

        [HttpDelete("{parameterCode}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(string parameterCode)
        {
            var parameter = await _context.ParameterMasters.FirstOrDefaultAsync(pm => pm.ParameterCode == parameterCode);
            if (parameter == null)
                return NotFound($"Parameter master '{parameterCode}' not found.");

            _context.ParameterMasters.Remove(parameter);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // --- Derived Formula Sub-Routes ---

        [HttpGet("{parameterCode}/formulas")]
        public async Task<IActionResult> GetFormulas(string parameterCode)
        {
            var parameter = await _context.ParameterMasters.AnyAsync(pm => pm.ParameterCode == parameterCode);
            if (!parameter)
                return NotFound($"Parameter master '{parameterCode}' not found.");

            var rules = await _context.DerivedParameterRules
                .Where(r => r.ParameterCode == parameterCode)
                .ToListAsync();

            return Ok(rules);
        }

        [HttpPost("{parameterCode}/formulas")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetFormula(string parameterCode, [FromBody] SetDerivedFormulaDto dto)
        {
            var parameter = await _context.ParameterMasters.FirstOrDefaultAsync(pm => pm.ParameterCode == parameterCode);
            if (parameter == null)
                return NotFound($"Parameter master '{parameterCode}' not found.");

            // Clear any existing rules for this parameter (since we support one formula rule per derived parameter)
            var existing = await _context.DerivedParameterRules
                .Where(r => r.ParameterCode == parameterCode)
                .ToListAsync();
            _context.DerivedParameterRules.RemoveRange(existing);

            var rule = new DerivedParameterRule
            {
                RuleId = Guid.NewGuid(),
                ParameterCode = parameterCode,
                FormulaExpression = dto.FormulaExpression.Trim(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.DerivedParameterRules.Add(rule);
            await _context.SaveChangesAsync();

            return Ok(rule);
        }

        [HttpDelete("{parameterCode}/formulas/{ruleId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteFormula(string parameterCode, Guid ruleId)
        {
            var rule = await _context.DerivedParameterRules
                .FirstOrDefaultAsync(r => r.RuleId == ruleId && r.ParameterCode == parameterCode);

            if (rule == null)
                return NotFound($"Formula rule '{ruleId}' not found for parameter '{parameterCode}'.");

            _context.DerivedParameterRules.Remove(rule);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- Analyzer Mapping Sub-Routes ---

        [HttpGet("{parameterCode}/analyzers")]
        public async Task<IActionResult> GetAnalyzerMappings(string parameterCode)
        {
            var parameter = await _context.ParameterMasters.AnyAsync(pm => pm.ParameterCode == parameterCode);
            if (!parameter)
                return NotFound($"Parameter master '{parameterCode}' not found.");

            var maps = await _context.AnalyzerParameterMaps
                .Where(m => m.InternalParameterCode == parameterCode)
                .ToListAsync();

            return Ok(maps);
        }

        [HttpPost("{parameterCode}/analyzers")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddAnalyzerMapping(string parameterCode, [FromBody] CreateAnalyzerMapDto dto)
        {
            var parameter = await _context.ParameterMasters.AnyAsync(pm => pm.ParameterCode == parameterCode);
            if (!parameter)
                return NotFound($"Parameter master '{parameterCode}' not found.");

            var exists = await _context.AnalyzerParameterMaps
                .AnyAsync(m => m.AnalyzerId == dto.AnalyzerId && m.ExternalParameterCode == dto.ExternalParameterCode);

            if (exists)
                return Conflict($"Mapping for analyzer '{dto.AnalyzerId}' and external code '{dto.ExternalParameterCode}' already exists.");

            var map = new AnalyzerParameterMap
            {
                MapId = Guid.NewGuid(),
                AnalyzerId = dto.AnalyzerId.Trim(),
                ExternalParameterCode = dto.ExternalParameterCode.Trim(),
                InternalParameterCode = parameterCode,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.AnalyzerParameterMaps.Add(map);
            await _context.SaveChangesAsync();

            return Ok(map);
        }

        [HttpDelete("{parameterCode}/analyzers/{mapId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteAnalyzerMapping(string parameterCode, Guid mapId)
        {
            var map = await _context.AnalyzerParameterMaps
                .FirstOrDefaultAsync(m => m.MapId == mapId && m.InternalParameterCode == parameterCode);

            if (map == null)
                return NotFound($"Analyzer map '{mapId}' not found for parameter '{parameterCode}'.");

            _context.AnalyzerParameterMaps.Remove(map);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    // --- DTO Classes ---

    public class CreateParameterMasterDto
    {
        public string ParameterCode { get; set; } = string.Empty;
        public string CanonicalName { get; set; } = string.Empty;
        public string? ShortName { get; set; }
        public string UnitType { get; set; } = string.Empty;
        public string? DefaultUnit { get; set; }
        public string DataType { get; set; } = "Numeric";
    }

    public class UpdateParameterMasterDto
    {
        public string CanonicalName { get; set; } = string.Empty;
        public string? ShortName { get; set; }
        public string UnitType { get; set; } = string.Empty;
        public string? DefaultUnit { get; set; }
        public string DataType { get; set; } = "Numeric";
    }

    public class SetDerivedFormulaDto
    {
        public string FormulaExpression { get; set; } = string.Empty;
    }

    public class CreateAnalyzerMapDto
    {
        public string AnalyzerId { get; set; } = string.Empty;
        public string ExternalParameterCode { get; set; } = string.Empty;
    }
}
