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
                new { Code = "SERO", Name = "Serology", Macro = "Pathology" },
                new { Code = "MICRO", Name = "Microbiology", Macro = "Pathology" },
                new { Code = "CP", Name = "Clinical Pathology", Macro = "Pathology" },
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
                    existing.IsActive = true; // Ensure they are active
                }
            }

            // 3. Deactivate legacy unused department codes
            var legacyCodesToDeactivate = new[] { "CPA", "MIC", "SER" };
            foreach (var code in legacyCodesToDeactivate)
            {
                var legacyDept = allDepts.FirstOrDefault(d => d.Code.Equals(code, StringComparison.OrdinalIgnoreCase));
                if (legacyDept != null)
                {
                    legacyDept.IsActive = false;
                }
            }

            await context.SaveChangesAsync();
        }

        public static async Task SeedModalityMastersAsync(SynOSDbContext context)
        {
            var radDept = await context.DepartmentMasters.FirstOrDefaultAsync(d => d.Code == "RAD");
            if (radDept == null)
            {
                radDept = new DepartmentMaster
                {
                    DepartmentId = Guid.NewGuid(),
                    Code = "RAD",
                    Name = "Radiology",
                    MacroDepartment = "Radiology",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                context.DepartmentMasters.Add(radDept);
                await context.SaveChangesAsync();
            }

            var modalities = new[]
            {
                new { Code = "XRAY", Name = "X-Ray" },
                new { Code = "CT", Name = "CT Scan" },
                new { Code = "MRI", Name = "MRI" },
                new { Code = "US", Name = "Ultrasound" }
            };

            var modalityIds = new Dictionary<string, Guid>();

            foreach (var m in modalities)
            {
                var existing = await context.ModalityMasters.FirstOrDefaultAsync(mm => mm.Code == m.Code);
                if (existing == null)
                {
                    var newModality = new ModalityMaster
                    {
                        ModalityId = Guid.NewGuid(),
                        Code = m.Code,
                        Name = m.Name,
                        DepartmentId = radDept.DepartmentId,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    context.ModalityMasters.Add(newModality);
                    modalityIds[m.Code] = newModality.ModalityId;
                }
                else
                {
                    modalityIds[m.Code] = existing.ModalityId;
                }
            }
            await context.SaveChangesAsync();

            // CONSOLIDATE LEGACY DATA:
            var legacyDeptId = Guid.Parse("99f8d2bd-3b7c-4188-840a-2f647aad6454");
            var legacyDept = await context.DepartmentMasters.FindAsync(legacyDeptId);
            if (legacyDept != null)
            {
                legacyDept.IsActive = false;
            }

            var xrayGuid = modalityIds["XRAY"];

            // Update all tests pointing to legacy department to point to RAD and set ModalityId to XRAY
            var legacyTests = await context.Tests
                .Where(t => t.DepartmentId == legacyDeptId || t.TestCode == "ABD" || t.TestCode == "AORTOGRAM")
                .ToListAsync();

            foreach (var test in legacyTests)
            {
                test.DepartmentId = radDept.DepartmentId;
                test.ModalityId = xrayGuid;
                test.Category = "X-Ray";
            }

            // Update existing radiology studies
            var studies = await context.RadiologyStudies.ToListAsync();
            foreach (var s in studies)
            {
                if (s.ModalityId == Guid.Empty)
                {
                    s.ModalityId = xrayGuid;
                    s.Modality = "X-Ray";
                }
            }

            // Update existing report templates matching string modality to their respective ModalityId
            var templates = await context.ReportTemplates.ToListAsync();
            foreach (var t in templates)
            {
                if (!t.ModalityId.HasValue && !string.IsNullOrEmpty(t.Modality))
                {
                    var modUpper = t.Modality.ToUpperInvariant();
                    if (modUpper.Contains("XRAY") || modUpper.Contains("X-RAY") || modUpper.Contains("XR"))
                    {
                        t.ModalityId = xrayGuid;
                        t.Modality = "X-Ray";
                    }
                    else if (modUpper.Contains("CT"))
                    {
                        t.ModalityId = modalityIds["CT"];
                        t.Modality = "CT Scan";
                    }
                    else if (modUpper.Contains("MRI"))
                    {
                        t.ModalityId = modalityIds["MRI"];
                        t.Modality = "MRI";
                    }
                    else if (modUpper.Contains("US") || modUpper.Contains("ULTRASOUND") || modUpper.Contains("SONO"))
                    {
                        t.ModalityId = modalityIds["US"];
                        t.Modality = "Ultrasound";
                    }
                }
            }

            await context.SaveChangesAsync();
            Console.WriteLine("[CatalogSeedService] Seeded base modalities and migrated legacy departments/tests/studies/templates successfully.");
        }
    }
}
