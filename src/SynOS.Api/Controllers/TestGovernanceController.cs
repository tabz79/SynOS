using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Enums.IMS;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/governance/tests")]
    [Authorize]
    public class TestGovernanceController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public TestGovernanceController(SynOSDbContext context)
        {
            _context = context;
        }

        // --- Parameter Mapping ---

        [HttpGet("{testId}/parameters")]
        public async Task<IActionResult> GetParameters(Guid testId)
        {
            var testExists = await _context.Tests.AnyAsync(t => t.TestId == testId);
            if (!testExists)
                return NotFound($"Test '{testId}' not found.");

            var parameters = await _context.Parameters
                .Where(p => p.TestId == testId)
                .OrderBy(p => p.SortOrder)
                .ToListAsync();

            return Ok(parameters);
        }

        [HttpPost("{testId}/parameters")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MapParameter(Guid testId, [FromBody] MapParameterDto dto)
        {
            var test = await _context.Tests.FirstOrDefaultAsync(t => t.TestId == testId);
            if (test == null)
                return NotFound($"Test '{testId}' not found.");

            var parameterMaster = await _context.ParameterMasters.FirstOrDefaultAsync(pm => pm.ParameterCode == dto.ParameterCode);
            if (parameterMaster == null)
                return NotFound($"ParameterMaster '{dto.ParameterCode}' not found.");

            // Check if already mapped
            var existing = await _context.Parameters
                .FirstOrDefaultAsync(p => p.TestId == testId && p.ParameterCode == dto.ParameterCode);

            if (existing != null)
            {
                existing.ParameterName = dto.ParameterName.Trim();
                existing.Unit = dto.Unit?.Trim();
                existing.DataType = dto.DataType.Trim();
                existing.SortOrder = dto.SortOrder;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                var parameter = new Parameter
                {
                    ParameterId = Guid.NewGuid(),
                    TestId = testId,
                    ParameterCode = dto.ParameterCode.Trim(),
                    ParameterName = dto.ParameterName.Trim(),
                    Unit = dto.Unit?.Trim(),
                    DataType = dto.DataType.Trim(),
                    SortOrder = dto.SortOrder,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.Parameters.Add(parameter);
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("{testId}/parameters/{parameterId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UnmapParameter(Guid testId, Guid parameterId)
        {
            var parameter = await _context.Parameters
                .FirstOrDefaultAsync(p => p.ParameterId == parameterId && p.TestId == testId);

            if (parameter == null)
                return NotFound($"Parameter '{parameterId}' not found for test '{testId}'.");

            _context.Parameters.Remove(parameter);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // --- Pricing ---

        [HttpGet("{testId}/pricing")]
        public async Task<IActionResult> GetPricing(Guid testId)
        {
            var test = await _context.Tests
                .Include(t => t.TestPricings)
                .FirstOrDefaultAsync(t => t.TestId == testId);

            if (test == null)
                return NotFound($"Test '{testId}' not found.");

            var priceConfig = await _context.PriceConfigs
                .FirstOrDefaultAsync(pc => pc.TestId == testId);

            return Ok(new
            {
                PriceHistory = test.TestPricings.OrderByDescending(tp => tp.EffectiveFrom).ToList(),
                PriceConfig = priceConfig
            });
        }

        [HttpPost("{testId}/pricing")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetPricing(Guid testId, [FromBody] SetPricingDto dto)
        {
            var test = await _context.Tests.FirstOrDefaultAsync(t => t.TestId == testId);
            if (test == null)
                return NotFound($"Test '{testId}' not found.");

            var userId = GetCurrentUserId();

            // 1. Add pricing entry
            var testPricing = new TestPricing
            {
                PricingId = Guid.NewGuid(),
                TestId = testId,
                BasePrice = dto.Price,
                EffectiveFrom = dto.EffectiveFrom?.UtcDateTime ?? DateTime.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedByUserId = userId
            };
            _context.TestPricings.Add(testPricing);

            // 2. Add or update PriceConfig
            var priceConfig = await _context.PriceConfigs.FirstOrDefaultAsync(pc => pc.TestId == testId);
            if (priceConfig == null)
            {
                priceConfig = new PriceConfig
                {
                    PriceId = Guid.NewGuid(),
                    TestId = testId,
                    DiscountPercent = dto.DiscountPercent,
                    ReferrerRatePercent = dto.ReferrerRatePercent,
                    EffectiveFrom = DateTime.UtcNow,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.PriceConfigs.Add(priceConfig);
            }
            else
            {
                priceConfig.DiscountPercent = dto.DiscountPercent;
                priceConfig.ReferrerRatePercent = dto.ReferrerRatePercent;
                priceConfig.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { Pricing = testPricing, Config = priceConfig });
        }

        // --- Consumable Maps ---

        [HttpGet("{testId}/consumables")]
        public async Task<IActionResult> GetConsumables(Guid testId)
        {
            var testExists = await _context.Tests.AnyAsync(t => t.TestId == testId);
            if (!testExists)
                return NotFound($"Test '{testId}' not found.");

            var maps = await _context.ImsTestConsumableMaps
                .Where(m => m.TestId == testId)
                .Include(m => m.Consumable)
                .ToListAsync();

            return Ok(maps);
        }

        [HttpPost("{testId}/consumables")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddConsumable(Guid testId, [FromBody] AddConsumableDto dto)
        {
            var testExists = await _context.Tests.AnyAsync(t => t.TestId == testId);
            if (!testExists)
                return NotFound($"Test '{testId}' not found.");

            var consumableExists = await _context.ImsConsumables.AnyAsync(c => c.ConsumableId == dto.ConsumableId);
            if (!consumableExists)
                return NotFound($"Consumable '{dto.ConsumableId}' not found.");

            var map = new ImsTestConsumableMap
            {
                MapId = Guid.NewGuid(),
                TestId = testId,
                ConsumableId = dto.ConsumableId,
                QuantityPerTest = dto.QuantityPerTest,
                UsageType = dto.UsageType
            };

            _context.ImsTestConsumableMaps.Add(map);
            await _context.SaveChangesAsync();

            return Ok(map);
        }

        [HttpDelete("{testId}/consumables/{mapId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RemoveConsumable(Guid testId, Guid mapId)
        {
            var map = await _context.ImsTestConsumableMaps
                .FirstOrDefaultAsync(m => m.MapId == mapId && m.TestId == testId);

            if (map == null)
                return NotFound($"Consumable mapping '{mapId}' not found for test '{testId}'.");

            _context.ImsTestConsumableMaps.Remove(map);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- Outsourcing Rules ---

        [HttpGet("{testId}/outsource")]
        public async Task<IActionResult> GetOutsource(Guid testId)
        {
            var testExists = await _context.Tests.AnyAsync(t => t.TestId == testId);
            if (!testExists)
                return NotFound($"Test '{testId}' not found.");

            var rules = await _context.ReferenceLabRateRules
                .Where(r => r.TestId == testId)
                .ToListAsync();

            return Ok(rules);
        }

        [HttpPost("{testId}/outsource")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetOutsourceRate(Guid testId, [FromBody] SetOutsourceRateDto dto)
        {
            var testExists = await _context.Tests.AnyAsync(t => t.TestId == testId);
            if (!testExists)
                return NotFound($"Test '{testId}' not found.");

            var labExists = await _context.ReferenceLabs.AnyAsync(l => l.Id == dto.ReferenceLabId);
            if (!labExists)
                return NotFound($"ReferenceLab '{dto.ReferenceLabId}' not found.");

            var rule = await _context.ReferenceLabRateRules
                .FirstOrDefaultAsync(r => r.TestId == testId && r.ReferenceLabId == dto.ReferenceLabId);

            var userId = GetCurrentUserId();

            if (rule == null)
            {
                rule = new ReferenceLabRateRule
                {
                    Id = Guid.NewGuid(),
                    TestId = testId,
                    ReferenceLabId = dto.ReferenceLabId,
                    Cost = dto.Rate,
                    UpdatedAt = DateTime.UtcNow,
                    UpdatedBy = userId
                };
                _context.ReferenceLabRateRules.Add(rule);
            }
            else
            {
                rule.Cost = dto.Rate;
                rule.UpdatedAt = DateTime.UtcNow;
                rule.UpdatedBy = userId;
            }

            await _context.SaveChangesAsync();
            return Ok(rule);
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            return Guid.Empty;
        }
    }

    // --- DTO Classes ---

    public class MapParameterDto
    {
        public string ParameterCode { get; set; } = string.Empty;
        public string ParameterName { get; set; } = string.Empty;
        public string? Unit { get; set; }
        public string DataType { get; set; } = "Numeric";
        public int SortOrder { get; set; } = 1;
    }

    public class SetPricingDto
    {
        public decimal Price { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal ReferrerRatePercent { get; set; }
        public DateTimeOffset? EffectiveFrom { get; set; }
    }

    public class AddConsumableDto
    {
        public Guid ConsumableId { get; set; }
        public int QuantityPerTest { get; set; }
        public ConsumableUsageType UsageType { get; set; } = ConsumableUsageType.Consumption;
    }

    public class SetOutsourceRateDto
    {
        public Guid ReferenceLabId { get; set; }
        public decimal Rate { get; set; }
    }
}
