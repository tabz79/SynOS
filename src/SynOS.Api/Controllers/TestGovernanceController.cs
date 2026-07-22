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
                DisplayQuantity = dto.DisplayQuantity ?? dto.QuantityPerTest,
                DisplayUnit = dto.DisplayUnit,
                UsageType = dto.UsageType
            };

            _context.ImsTestConsumableMaps.Add(map);
            await _context.SaveChangesAsync();

            return Ok(map);
        }

        [HttpPut("{testId}/consumables/{mapId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateConsumable(Guid testId, Guid mapId, [FromBody] UpdateConsumableMapDto dto)
        {
            var map = await _context.ImsTestConsumableMaps
                .FirstOrDefaultAsync(m => m.MapId == mapId && m.TestId == testId);

            if (map == null)
                return NotFound($"Consumable mapping '{mapId}' not found for test '{testId}'.");

            if (dto.QuantityPerTest.HasValue && dto.QuantityPerTest.Value > 0)
            {
                map.QuantityPerTest = dto.QuantityPerTest.Value;
            }
            if (dto.DisplayQuantity.HasValue)
            {
                map.DisplayQuantity = dto.DisplayQuantity.Value;
            }
            if (dto.DisplayUnit != null)
            {
                map.DisplayUnit = dto.DisplayUnit;
            }
            if (dto.UsageType.HasValue)
            {
                map.UsageType = dto.UsageType.Value;
            }

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

        [HttpPut("{testId}/tubes/{mapId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateTube(Guid testId, Guid mapId, [FromBody] UpdateTubeMapDto dto)
        {
            var map = await _context.ImsTestTubeMaps
                .FirstOrDefaultAsync(m => m.MapId == mapId && m.TestId == testId);

            if (map == null)
                return NotFound($"Tube mapping '{mapId}' not found for test '{testId}'.");

            if (dto.QuantityPerSample.HasValue && dto.QuantityPerSample.Value > 0)
            {
                map.QuantityPerSample = dto.QuantityPerSample.Value;
            }

            await _context.SaveChangesAsync();
            return Ok(map);
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

        [HttpPost("auto-map-all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AutoMapAllTests()
        {
            // 1. Purge all legacy dummy items by removing dependent foreign keys first in EF Core
            var validMasterCodes = new HashSet<string> {
                "TUBE-PLAIN", "TUBE-EDTA", "TUBE-FLUO", "TUBE-HEPARIN", "TUBE-CITRATE", "CONT-URINE",
                "CONT-STOOL", "BOTTLE-BC-AER", "BOTTLE-BC-ANA", "CONT-BIOPSY",
                "REAG-CBC-DIL", "REAG-LYSE", "REAG-CLEAN", "REAG-ESR", "REAG-BIOCHEM", "REAG-ISE",
                "KIT-DENGUE", "KIT-HIV", "KIT-HBSAG", "KIT-MALARIA", "STAIN-GRAM", "STAIN-AFB",
                "MEDIA-AGAR", "STAIN-HE", "STAIN-PAP", "SUP-SLIDES", "SUP-GLOVES", "SUP-ALCOHOL",
                "SUP-SWAB", "SUP-PAPER", "XR-FLM-810", "XR-FLM-1012", "XR-FLM-1417",
                "RAD-CNT-50", "RAD-CNT-100", "RAD-GAD-20", "RAD-GEL", "RAD-PAPER"
            };

            var dummyConsumables = await _context.ImsConsumables
                .Where(c => !validMasterCodes.Contains(c.Code))
                .ToListAsync();
            var dummyConsIds = dummyConsumables.Select(c => c.ConsumableId).ToHashSet();

            var dummyItems = await _context.ImsInventoryItems
                .Where(i => !validMasterCodes.Contains(i.ItemCode))
                .ToListAsync();
            var dummyItemIds = dummyItems.Select(i => i.ItemId).ToHashSet();

            var dummyTubes = await _context.ImsTubeMasters
                .Where(t => !validMasterCodes.Contains(t.Code))
                .ToListAsync();
            var dummyTubeIds = dummyTubes.Select(t => t.TubeId).ToHashSet();

            try
            {
                if (dummyConsIds.Any())
                {
                    var usagePolicies = await _context.Set<SynOS.Models.Entities.CostAttribution.CostAttribution_UsagePolicy>()
                        .Where(p => dummyItemIds.Contains(p.InventoryItemId))
                        .ToListAsync();
                    if (usagePolicies.Any()) _context.Set<SynOS.Models.Entities.CostAttribution.CostAttribution_UsagePolicy>().RemoveRange(usagePolicies);

                    var requests = await _context.ImsStockRequests
                        .Where(r => dummyConsIds.Contains(r.ConsumableId))
                        .ToListAsync();
                    if (requests.Any()) _context.ImsStockRequests.RemoveRange(requests);

                    var profiles = await _context.ImsInventoryUsageProfiles
                        .Where(p => dummyConsIds.Contains(p.ConsumableId))
                        .ToListAsync();
                    if (profiles.Any()) _context.ImsInventoryUsageProfiles.RemoveRange(profiles);

                    var cMaps = await _context.ImsTestConsumableMaps
                        .Where(m => dummyConsIds.Contains(m.ConsumableId))
                        .ToListAsync();
                    if (cMaps.Any()) _context.ImsTestConsumableMaps.RemoveRange(cMaps);

                    var rMaps = await _context.ImsRoleItemMaps
                        .Where(m => dummyConsIds.Contains(m.ConsumableId))
                        .ToListAsync();
                    if (rMaps.Any()) _context.ImsRoleItemMaps.RemoveRange(rMaps);

                    var cLots = await _context.ImsConsumableLots
                        .Where(l => dummyConsIds.Contains(l.ConsumableId))
                        .ToListAsync();
                    if (cLots.Any()) _context.ImsConsumableLots.RemoveRange(cLots);
                }

                if (dummyTubeIds.Any())
                {
                    var tMaps = await _context.ImsTestTubeMaps
                        .Where(m => dummyTubeIds.Contains(m.TubeId))
                        .ToListAsync();
                    if (tMaps.Any()) _context.ImsTestTubeMaps.RemoveRange(tMaps);

                    var tubeLots = await _context.ImsTubeLots
                        .Where(l => dummyTubeIds.Contains(l.TubeId))
                        .ToListAsync();
                    if (tubeLots.Any()) _context.ImsTubeLots.RemoveRange(tubeLots);

                    var poItems = await _context.ImsPOItems
                        .Where(p => dummyTubeIds.Contains(p.TubeId))
                        .ToListAsync();
                    if (poItems.Any()) _context.ImsPOItems.RemoveRange(poItems);
                }

                if (dummyItemIds.Any())
                {
                    var invLots = await _context.ImsInventoryLots
                        .Where(l => l.ItemId.HasValue && dummyItemIds.Contains(l.ItemId.Value))
                        .ToListAsync();
                    var invLotIds = invLots.Select(l => l.LotId).ToHashSet();

                    var movements = await _context.ImsStockMovements
                        .Where(m => (m.InventoryLotId.HasValue && invLotIds.Contains(m.InventoryLotId.Value)) ||
                                    (m.ConsumableId.HasValue && dummyConsIds.Contains(m.ConsumableId.Value)) ||
                                    (m.TubeId.HasValue && dummyTubeIds.Contains(m.TubeId.Value)))
                        .ToListAsync();
                    if (movements.Any()) _context.ImsStockMovements.RemoveRange(movements);

                    if (invLots.Any()) _context.ImsInventoryLots.RemoveRange(invLots);
                }

                await _context.SaveChangesAsync();

                if (dummyConsumables.Any()) _context.ImsConsumables.RemoveRange(dummyConsumables);
                if (dummyItems.Any()) _context.ImsInventoryItems.RemoveRange(dummyItems);
                if (dummyTubes.Any()) _context.ImsTubeMasters.RemoveRange(dummyTubes);

                await _context.SaveChangesAsync();
            }
            catch (Exception purgeEx)
            {
                // Fallback: If physical deletion is blocked by system audit logs, mark dummy items inactive
                foreach (var c in dummyConsumables) c.IsActive = false;
                foreach (var t in dummyTubes) t.IsActive = false;
                await _context.SaveChangesAsync();
            }

            // 2. Ensure Standard Master Catalog Items Exist (Laboratory & Radiology)
            var masterTubes = new List<(string Code, string Name, string Unit)>
            {
                ("TUBE-PLAIN", "Plain Red Top Serum Tube", "PCS"),
                ("TUBE-EDTA", "EDTA K3 Purple Top Tube", "PCS"),
                ("TUBE-FLUO", "Fluoride Gray Top Tube", "PCS"),
                ("TUBE-HEPARIN", "Heparin Green Top Tube", "PCS"),
                ("TUBE-CITRATE", "Blue Top Sodium Citrate Tube", "PCS"),
                ("CONT-URINE", "Sterile Urine Container", "PCS"),
                ("CONT-STOOL", "Sterile Stool Container", "PCS"),
                ("BOTTLE-BC-AER", "Aerobic Blood Culture Bottle", "BOTTLE"),
                ("BOTTLE-BC-ANA", "Anaerobic Blood Culture Bottle", "BOTTLE"),
                ("CONT-BIOPSY", "Biopsy Specimen Container with Formalin", "PCS")
            };

            var tubeMap = new Dictionary<string, Guid>();
            foreach (var t in masterTubes)
            {
                var tube = await _context.ImsTubeMasters.FirstOrDefaultAsync(tm => tm.Code == t.Code);
                if (tube == null)
                {
                    tube = new ImsTubeMaster
                    {
                        TubeId = Guid.NewGuid(),
                        Code = t.Code,
                        Name = t.Name,
                        UnitOfMeasure = t.Unit,
                        IsActive = true
                    };
                    _context.ImsTubeMasters.Add(tube);
                }
                tubeMap[t.Code] = tube.TubeId;

                var invItem = await _context.ImsInventoryItems.FirstOrDefaultAsync(i => i.ItemCode == t.Code);
                if (invItem == null)
                {
                    _context.ImsInventoryItems.Add(new ImsInventoryItem
                    {
                        ItemId = Guid.NewGuid(),
                        ItemCode = t.Code,
                        Name = t.Name,
                        ServiceArea = "Laboratory",
                        Modality = null
                    });
                }

                var cons = await _context.ImsConsumables.FirstOrDefaultAsync(c => c.Code == t.Code);
                if (cons == null)
                {
                    _context.ImsConsumables.Add(new ImsConsumable
                    {
                        ConsumableId = Guid.NewGuid(),
                        Code = t.Code,
                        Name = t.Name,
                        Category = "Tube Consumables",
                        UnitOfMeasure = t.Unit,
                        LowStockThreshold = 50,
                        IsActive = true,
                        LegacyTubeId = tube.TubeId
                    });
                }
            }

            var masterConsumables = new List<(string Code, string Name, string Category, string ServiceArea, string? Modality, string Unit)>
            {
                ("REAG-CBC-DIL", "CBC Cell Pack Diluent", "Test Consumables", "Laboratory", null, "LITER"),
                ("REAG-LYSE", "Lysing Agent 500ml", "Test Consumables", "Laboratory", null, "BOTTLE"),
                ("REAG-CLEAN", "Hematology Analyzer Cell Cleaner 1L", "Test Consumables", "Laboratory", null, "BOTTLE"),
                ("REAG-ESR", "ESR Pipette & Stand Kit", "Test Consumables", "Laboratory", null, "PCS"),
                ("REAG-BIOCHEM", "Biochemistry Multi-Reagent Kit", "Test Consumables", "Laboratory", null, "KIT"),
                ("REAG-ISE", "ISE Electrolyte Reagent Pack", "Test Consumables", "Laboratory", null, "PACK"),
                ("KIT-DENGUE", "Dengue NS1/IgG/IgM Rapid Test Kit", "Test Consumables", "Laboratory", null, "BOX"),
                ("KIT-HIV", "HIV 1&2 Rapid Test Kit", "Test Consumables", "Laboratory", null, "BOX"),
                ("KIT-HBSAG", "HBsAg Hepatitis B Rapid Kit", "Test Consumables", "Laboratory", null, "BOX"),
                ("KIT-MALARIA", "Malaria Ag Rapid Test Kit", "Test Consumables", "Laboratory", null, "BOX"),
                ("STAIN-GRAM", "Gram Stain Kit 4x250ml", "Test Consumables", "Laboratory", null, "KIT"),
                ("STAIN-AFB", "AFB Ziehl-Neelsen Stain Kit", "Test Consumables", "Laboratory", null, "KIT"),
                ("MEDIA-AGAR", "Blood Agar / MacConkey Media Plates", "Test Consumables", "Laboratory", null, "BOX"),
                ("STAIN-HE", "Hematoxylin & Eosin (H&E) Stain Kit", "Test Consumables", "Laboratory", null, "KIT"),
                ("STAIN-PAP", "Papanicolaou (PAP) Cytology Stain Kit", "Test Consumables", "Laboratory", null, "KIT"),
                ("SUP-SLIDES", "Microscope Glass Slides & Coverslips", "Test Consumables", "Laboratory", null, "BOX"),
                ("SUP-GLOVES", "Nitrile Gloves (Large)", "General", "Laboratory", null, "BOX"),
                ("SUP-ALCOHOL", "Alcohol Swabs Box", "General", "Laboratory", null, "BOX"),
                ("SUP-SWAB", "Sterile Cotton Swabs", "General", "Laboratory", null, "PACK"),
                ("SUP-PAPER", "Thermal Printer Paper A4", "General", "Laboratory", null, "REAM"),
                ("XR-FLM-810", "X-Ray Film 8x10 Box", "Test Consumables", "Radiology", "X-Ray", "BOX"),
                ("XR-FLM-1012", "X-Ray Film 10x12 Box", "Test Consumables", "Radiology", "X-Ray", "BOX"),
                ("XR-FLM-1417", "X-Ray Film 14x17 Box", "Test Consumables", "Radiology", "X-Ray", "BOX"),
                ("RAD-CNT-50", "CT/MRI Non-Ionic Contrast Medium 50ml", "Test Consumables", "Radiology", "CT", "BOTTLE"),
                ("RAD-CNT-100", "CT/MRI Non-Ionic Contrast Medium 100ml", "Test Consumables", "Radiology", "CT", "BOTTLE"),
                ("RAD-GAD-20", "MRI Gadolinium Contrast 20ml", "Test Consumables", "Radiology", "MRI", "BOTTLE"),
                ("RAD-GEL", "Ultrasound Transmission Gel 5L", "Test Consumables", "Radiology", "Ultrasound", "CAN"),
                ("RAD-PAPER", "Sony Thermal Print Film Box", "Test Consumables", "Radiology", "Ultrasound", "BOX")
            };

            var consMap = new Dictionary<string, Guid>();
            foreach (var c in masterConsumables)
            {
                var cons = await _context.ImsConsumables.FirstOrDefaultAsync(cm => cm.Code == c.Code);
                if (cons == null)
                {
                    cons = new ImsConsumable
                    {
                        ConsumableId = Guid.NewGuid(),
                        Code = c.Code,
                        Name = c.Name,
                        Category = c.Category,
                        UnitOfMeasure = c.Unit,
                        LowStockThreshold = 20,
                        IsActive = true
                    };
                    _context.ImsConsumables.Add(cons);
                }
                consMap[c.Code] = cons.ConsumableId;

                var invItem = await _context.ImsInventoryItems.FirstOrDefaultAsync(i => i.ItemCode == c.Code);
                if (invItem == null)
                {
                    _context.ImsInventoryItems.Add(new ImsInventoryItem
                    {
                        ItemId = Guid.NewGuid(),
                        ItemCode = c.Code,
                        Name = c.Name,
                        ServiceArea = c.ServiceArea,
                        Modality = c.Modality
                    });
                }
            }

            await _context.SaveChangesAsync();

            // 3. Auto-Map All 1,151 Tests in DB
            var allTests = await _context.Tests.Include(t => t.DepartmentMaster).ToListAsync();
            int createdTubeMaps = 0;
            int createdConsMaps = 0;

            var existingConsMaps = await _context.ImsTestConsumableMaps.ToListAsync();
            var existingTubeMaps = await _context.ImsTestTubeMaps.ToListAsync();

            var consSet = new HashSet<string>(existingConsMaps.Select(m => $"{m.TestId}_{m.ConsumableId}"));
            var tubeSet = new HashSet<string>(existingTubeMaps.Select(m => $"{m.TestId}_{m.TubeId}"));

            foreach (var test in allTests)
            {
                var spec = (test.SpecimenTypeCode ?? "").ToUpper();
                var dept = (test.DepartmentMaster?.Name ?? test.Category ?? "").ToUpper();
                var name = (test.TestName ?? "").ToUpper();

                bool isEdta = spec.Contains("EDTA") || name.Contains("CBP") || name.Contains("CBC") || name.Contains("HBA1C") || name.Contains("ESR") || name.Contains("PLATELET");
                bool isFluoride = spec.Contains("FLUORIDE") || name.Contains("GLUCOSE") || name.Contains("SUGAR") || name.Contains("RBS") || name.Contains("FBS") || name.Contains("PPBS");
                bool isUrine = spec.Contains("URINE") || name.Contains("URINE");
                bool isStool = spec.Contains("STOOL") || name.Contains("STOOL");
                bool isCulture = name.Contains("CULTURE") || name.Contains("BLOOD CULTURE");
                bool isBiopsy = spec.Contains("BIOPSY") || name.Contains("HISTOPATHOLOGY") || dept.Contains("HISTO");
                bool isCytology = name.Contains("PAP") || name.Contains("CYTOLOGY") || dept.Contains("CYTO");
                bool isMicro = dept.Contains("MICRO");
                bool isCitrate = spec.Contains("CITRATE") || name.Contains("PT/INR") || name.Contains("COAGULATION");

                bool isXray = dept.Contains("XRAY") || dept.Contains("X-RAY");
                bool isCt = dept.Contains("CT");
                bool isMri = dept.Contains("MRI");
                bool isUsg = dept.Contains("ULTRASOUND") || dept.Contains("USG") || dept.Contains("SONO");

                // Rapid Test Kits
                bool isDengue = name.Contains("DENGUE");
                bool isHiv = name.Contains("HIV");
                bool isHbsag = name.Contains("HBSAG");
                bool isMalaria = name.Contains("MALARIA");

                if (isXray)
                {
                    AddConsumableMap(test.TestId, "XR-FLM-810");
                }
                else if (isCt)
                {
                    AddConsumableMap(test.TestId, "RAD-CNT-50");
                }
                else if (isMri)
                {
                    AddConsumableMap(test.TestId, "RAD-GAD-20");
                }
                else if (isUsg)
                {
                    AddConsumableMap(test.TestId, "RAD-GEL");
                    AddConsumableMap(test.TestId, "RAD-PAPER");
                }
                else if (isDengue)
                {
                    AddTubeMap(test.TestId, "TUBE-PLAIN");
                    AddConsumableMap(test.TestId, "KIT-DENGUE");
                }
                else if (isHiv)
                {
                    AddTubeMap(test.TestId, "TUBE-PLAIN");
                    AddConsumableMap(test.TestId, "KIT-HIV");
                }
                else if (isHbsag)
                {
                    AddTubeMap(test.TestId, "TUBE-PLAIN");
                    AddConsumableMap(test.TestId, "KIT-HBSAG");
                }
                else if (isMalaria)
                {
                    AddTubeMap(test.TestId, "TUBE-EDTA");
                    AddConsumableMap(test.TestId, "KIT-MALARIA");
                }
                else if (isBiopsy)
                {
                    AddTubeMap(test.TestId, "CONT-BIOPSY");
                    AddConsumableMap(test.TestId, "STAIN-HE");
                }
                else if (isCytology)
                {
                    AddConsumableMap(test.TestId, "STAIN-PAP");
                    AddConsumableMap(test.TestId, "SUP-SLIDES");
                }
                else if (isMicro)
                {
                    if (isCulture) AddTubeMap(test.TestId, "BOTTLE-BC-AER");
                    else AddTubeMap(test.TestId, "CONT-URINE");
                    AddConsumableMap(test.TestId, "MEDIA-AGAR");
                    AddConsumableMap(test.TestId, "STAIN-GRAM");
                }
                else if (isStool)
                {
                    AddTubeMap(test.TestId, "CONT-STOOL");
                }
                else if (isEdta)
                {
                    AddTubeMap(test.TestId, "TUBE-EDTA");
                    AddConsumableMap(test.TestId, "REAG-CBC-DIL");
                }
                else if (isFluoride)
                {
                    AddTubeMap(test.TestId, "TUBE-FLUO");
                }
                else if (isUrine)
                {
                    AddTubeMap(test.TestId, "CONT-URINE");
                }
                else if (isCitrate)
                {
                    AddTubeMap(test.TestId, "TUBE-CITRATE");
                }
                else
                {
                    AddTubeMap(test.TestId, "TUBE-PLAIN");
                    AddConsumableMap(test.TestId, "REAG-BIOCHEM");
                }
            }

            void AddTubeMap(Guid testId, string tubeCode)
            {
                if (tubeMap.TryGetValue(tubeCode, out var tId))
                {
                    var key = $"{testId}_{tId}";
                    if (!tubeSet.Contains(key))
                    {
                        _context.ImsTestTubeMaps.Add(new ImsTestTubeMap
                        {
                            MapId = Guid.NewGuid(),
                            TestId = testId,
                            TubeId = tId,
                            QuantityPerSample = 1
                        });
                        tubeSet.Add(key);
                        createdTubeMaps++;
                    }
                }
            }

            void AddConsumableMap(Guid testId, string consCode)
            {
                if (consMap.TryGetValue(consCode, out var cId))
                {
                    var key = $"{testId}_{cId}";
                    if (!consSet.Contains(key))
                    {
                        _context.ImsTestConsumableMaps.Add(new ImsTestConsumableMap
                        {
                            MapId = Guid.NewGuid(),
                            TestId = testId,
                            ConsumableId = cId,
                            QuantityPerTest = 1,
                            UsageType = ConsumableUsageType.Consumption
                        });
                        consSet.Add(key);
                        createdConsMaps++;
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                totalTestsProcessed = allTests.Count,
                createdConsumableMappings = createdConsMaps,
                createdTubeMappings = createdTubeMaps,
                message = $"Successfully auto-mapped inventory items for all {allTests.Count} diagnostic tests."
            });
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
        public decimal QuantityPerTest { get; set; }
        public decimal? DisplayQuantity { get; set; }
        public string? DisplayUnit { get; set; }
        public ConsumableUsageType UsageType { get; set; } = ConsumableUsageType.Consumption;
    }

    public class UpdateConsumableMapDto
    {
        public decimal? QuantityPerTest { get; set; }
        public decimal? DisplayQuantity { get; set; }
        public string? DisplayUnit { get; set; }
        public ConsumableUsageType? UsageType { get; set; }
    }

    public class UpdateTubeMapDto
    {
        public int? QuantityPerSample { get; set; }
    }

    public class SetOutsourceRateDto
    {
        public Guid ReferenceLabId { get; set; }
        public decimal Rate { get; set; }
    }
}
