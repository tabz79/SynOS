using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Models.Entities.Catalog;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Entities;

namespace SynOS.Data
{
    public static class CatalogSeedService
    {
        public static async Task SeedProcessingDepartmentsAsync(SynOSDbContext context)
        {
            // 1. Ensure ServiceCategory "LAB" exists.
            var labCategory = await context.CatalogServiceCategories
                .FirstOrDefaultAsync(c => c.ServiceCategoryCode == "LAB");

            if (labCategory == null)
            {
                labCategory = new CatalogServiceCategory
                {
                    ServiceCategoryCode = "LAB",
                    ServiceCategoryName = "Laboratory",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                context.CatalogServiceCategories.Add(labCategory);
                await context.SaveChangesAsync();
            }

            // 2. Extract distinct DepartmentCode values from operational tables with normalization.
            var codesFromResources = await context.OperationalResources
                .Select(r => r.DepartmentCode)
                .ToListAsync();

            var codesFromAssignments = await context.ProcessingAssignments
                .Select(a => a.DepartmentCode)
                .ToListAsync();

            var codesFromOrders = await context.Orders
                .Select(o => o.Department)
                .ToListAsync();

            var allUniqueCodes = codesFromResources
                .Concat(codesFromAssignments)
                .Concat(codesFromOrders)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim().ToUpperInvariant())
                .Distinct()
                .ToList();

            // Fetch existing codes to perform per-code UPSERT (Insert if not exists)
            var existingCodes = await context.CatalogProcessingDepartments
                .Select(d => d.DepartmentCode)
                .ToListAsync();

            var existingCodesSet = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);

            // 3. Insert CatalogProcessingDepartments for codes that don't exist yet.
            var seededCount = 0;
            var newlySeededCodes = new List<string>();

            foreach (var code in allUniqueCodes)
            {
                if (existingCodesSet.Contains(code))
                {
                    continue; // Skip existing rows as per requirements
                }

                var requiresSpecimen = GetRequiresSpecimenMapping(code);
                
                var dept = new CatalogProcessingDepartment
                {
                    DepartmentCode = code,
                    DepartmentName = code, // Default name to code for now
                    ServiceCategoryCode = "LAB",
                    RequiresSpecimen = requiresSpecimen,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                context.CatalogProcessingDepartments.Add(dept);
                newlySeededCodes.Add(code);
                seededCount++;
            }

            if (seededCount > 0)
            {
                await context.SaveChangesAsync();
                // 5. Log the seeded departments.
                Console.WriteLine($"[CatalogSeedService] Seeded {seededCount} NEW ProcessingDepartments: {string.Join(", ", newlySeededCodes)}");
            }
        }

        public static async Task SeedSpecimenTypesAsync(SynOSDbContext context)
        {
            var codesToSeed = new[] { "BLOOD", "SERUM", "PLASMA", "URINE", "STOOL", "SWAB" };
            
            var normalizedCodes = codesToSeed
                .Select(c => c.Trim().ToUpperInvariant())
                .Distinct()
                .ToList();

            var existingCodes = await context.CatalogSpecimenTypes
                .Select(s => s.SpecimenCode)
                .ToListAsync();

            var existingCodesSet = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);

            var seededCount = 0;
            var newlySeededCodes = new List<string>();

            foreach (var code in normalizedCodes)
            {
                if (existingCodesSet.Contains(code)) continue;

                var specimenType = new CatalogSpecimenType
                {
                    SpecimenCode = code,
                    SpecimenName = code, // Default name to code
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                context.CatalogSpecimenTypes.Add(specimenType);
                newlySeededCodes.Add(code);
                seededCount++;
            }

            if (seededCount > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"[CatalogSeedService] Seeded {seededCount} NEW SpecimenTypes: {string.Join(", ", newlySeededCodes)}");
            }
        }

        public static async Task SeedTubeTypesAsync(SynOSDbContext context)
        {
            var tubesToSeed = new[] 
            { 
                new { Code = "EDTA", Name = "EDTA", Color = "Purple" },
                new { Code = "SST", Name = "SST", Color = "Yellow" },
                new { Code = "FLUORIDE", Name = "Fluoride", Color = "Grey" },
                new { Code = "CITRATE", Name = "Citrate", Color = "Blue" },
                new { Code = "PLAIN", Name = "Plain", Color = "Red" }
            };

            var existingCodes = await context.CatalogTubeTypes
                .Select(t => t.TubeCode)
                .ToListAsync();

            var existingCodesSet = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);

            var seededCount = 0;
            var newlySeededCodes = new List<string>();

            foreach (var tube in tubesToSeed)
            {
                var normalizedCode = tube.Code.Trim().ToUpperInvariant();
                if (existingCodesSet.Contains(normalizedCode)) continue;

                var tubeType = new CatalogTubeType
                {
                    TubeCode = normalizedCode,
                    TubeName = tube.Name,
                    Color = tube.Color,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                context.CatalogTubeTypes.Add(tubeType);
                newlySeededCodes.Add(normalizedCode);
                seededCount++;
            }

            if (seededCount > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"[CatalogSeedService] Seeded {seededCount} NEW TubeTypes: {string.Join(", ", newlySeededCodes)}");
            }
        }

        private static bool GetRequiresSpecimenMapping(string code)
        {
            // 3. RequiresSpecimen mapping:
            // BIO -> true, HEM -> true, MIC -> true, HIS -> true, PATH -> true, RAD -> false, Default -> true
            if (string.Equals(code, "RAD", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            return true;
        }
    }
}
