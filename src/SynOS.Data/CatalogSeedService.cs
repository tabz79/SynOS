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
            var codesToSeed = new[] { "BLOOD", "SERUM", "PLASMA", "URINE", "STOOL", "SWAB", "NO_SPECIMEN" };
            
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

        public static async Task SeedDepartmentMastersAsync(SynOSDbContext context)
        {
            // 1. Clean up duplicate or unnormalized legacy records in DepartmentMasters
            var allDepts = await context.DepartmentMasters.ToListAsync();
            
            // Consolidate GENERAL / General
            var generalDepts = allDepts.Where(d => d.Code.Equals("GENERAL", StringComparison.OrdinalIgnoreCase) || d.Name.Equals("General", StringComparison.OrdinalIgnoreCase) || d.Name.Contains("General")).ToList();
            if (generalDepts.Count > 1)
            {
                var keep = generalDepts.OrderBy(d => d.Code == "GENERAL" ? 0 : 1).First();
                keep.Code = "GENERAL";
                keep.Name = "General Laboratory Operations";
                keep.MacroDepartment = "General";
                
                foreach (var dup in generalDepts.Where(d => d.DepartmentId != keep.DepartmentId))
                {
                    var tests = await context.Tests.Where(t => t.DepartmentId == dup.DepartmentId).ToListAsync();
                    foreach (var t in tests) t.DepartmentId = keep.DepartmentId;
                    
                    context.DepartmentMasters.Remove(dup);
                }
                await context.SaveChangesAsync();
                allDepts = await context.DepartmentMasters.ToListAsync(); // Refresh cache
            }

            // Consolidate PATHOLOGY / Pathology / PAT
            var pathDepts = allDepts.Where(d => d.Code.Equals("PATHOLOGY", StringComparison.OrdinalIgnoreCase) || d.Code.Equals("PAT", StringComparison.OrdinalIgnoreCase) || d.Name.Equals("Pathology", StringComparison.OrdinalIgnoreCase) || d.Name.Equals("PATHOLOGY", StringComparison.OrdinalIgnoreCase)).ToList();
            if (pathDepts.Count > 1)
            {
                var keep = pathDepts.OrderBy(d => d.Code == "PATHOLOGY" ? 0 : 1).First();
                keep.Code = "PATHOLOGY";
                keep.Name = "Pathology";
                keep.MacroDepartment = "Pathology";
                
                foreach (var dup in pathDepts.Where(d => d.DepartmentId != keep.DepartmentId))
                {
                    var tests = await context.Tests.Where(t => t.DepartmentId == dup.DepartmentId).ToListAsync();
                    foreach (var t in tests) t.DepartmentId = keep.DepartmentId;
                    
                    context.DepartmentMasters.Remove(dup);
                }
                await context.SaveChangesAsync();
                allDepts = await context.DepartmentMasters.ToListAsync(); // Refresh cache
            }

            // Consolidate BIO / Biochemistry
            var bioDepts = allDepts.Where(d => d.Code.Equals("BIO", StringComparison.OrdinalIgnoreCase) || d.Name.Equals("Biochemistry", StringComparison.OrdinalIgnoreCase)).ToList();
            if (bioDepts.Count > 1)
            {
                var keep = bioDepts.OrderBy(d => d.Code == "BIO" ? 0 : 1).First();
                keep.Code = "BIO";
                keep.Name = "Biochemistry";
                keep.MacroDepartment = "Pathology";
                
                foreach (var dup in bioDepts.Where(d => d.DepartmentId != keep.DepartmentId))
                {
                    var tests = await context.Tests.Where(t => t.DepartmentId == dup.DepartmentId).ToListAsync();
                    foreach (var t in tests) t.DepartmentId = keep.DepartmentId;
                    
                    context.DepartmentMasters.Remove(dup);
                }
                await context.SaveChangesAsync();
                allDepts = await context.DepartmentMasters.ToListAsync(); // Refresh cache
            }

            // 2. Seed standard lab departments
            var standardDepts = new[]
            {
                new { Code = "GENERAL", Name = "General Laboratory Operations", Macro = "General" },
                new { Code = "RAD", Name = "Radiology", Macro = "Radiology" },
                new { Code = "BIO", Name = "Biochemistry", Macro = "Pathology" },
                new { Code = "HEM", Name = "Hematology", Macro = "Pathology" },
                new { Code = "SER", Name = "Serology", Macro = "Pathology" },
                new { Code = "MIC", Name = "Microbiology", Macro = "Pathology" },
                new { Code = "CPA", Name = "Clinical Pathology", Macro = "Pathology" },
                new { Code = "CPS", Name = "Clinical Pathology Stool", Macro = "Pathology" }
            };

            foreach (var sd in standardDepts)
            {
                var existing = allDepts.FirstOrDefault(d => d.Code.Equals(sd.Code, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                {
                    context.DepartmentMasters.Add(new DepartmentMaster
                    {
                        DepartmentId = Guid.NewGuid(),
                        Code = sd.Code,
                        Name = sd.Name,
                        MacroDepartment = sd.Macro,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    existing.Code = sd.Code;
                    existing.Name = sd.Name;
                    existing.MacroDepartment = sd.Macro;
                }
            }
            await context.SaveChangesAsync();
        }
    }
}
