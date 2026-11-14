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

            // Consolidate fragmented Radiology departments (e.g. Radiology CT/MRI, Radiology Ultrasound, Ultra Sound, X-Ray)
            var radDept = allDepts.FirstOrDefault(d => d.Code.Equals("RAD", StringComparison.OrdinalIgnoreCase) || d.Name.Equals("Radiology", StringComparison.OrdinalIgnoreCase));
            if (radDept != null)
            {
                var fragmentedRadDepts = allDepts.Where(d =>
                    d.DepartmentId != radDept.DepartmentId &&
                    (d.Name.Contains("Radiology", StringComparison.OrdinalIgnoreCase) ||
                     d.Name.Contains("Ultra Sound", StringComparison.OrdinalIgnoreCase) ||
                     d.Name.Equals("X-Ray", StringComparison.OrdinalIgnoreCase) ||
                     d.MacroDepartment.Equals("Radiology", StringComparison.OrdinalIgnoreCase))
                ).ToList();

                if (fragmentedRadDepts.Any())
                {
                    var allModalities = await context.ModalityMasters.ToListAsync();
                    var mriMod = allModalities.FirstOrDefault(m => m.Code == "MRI");
                    var ctMod = allModalities.FirstOrDefault(m => m.Code == "CT");
                    var usMod = allModalities.FirstOrDefault(m => m.Code == "US");
                    var xrayMod = allModalities.FirstOrDefault(m => m.Code == "XRAY");

                    foreach (var legacyDept in fragmentedRadDepts)
                    {
                        var tests = await context.Tests.Where(t => t.DepartmentId == legacyDept.DepartmentId).ToListAsync();
                        foreach (var t in tests)
                        {
                            t.DepartmentId = radDept.DepartmentId;
                            if (!t.ModalityId.HasValue)
                            {
                                var text = $"{t.TestCode} {t.TestName} {legacyDept.Name}".ToUpperInvariant();
                                if (text.Contains("MRI")) t.ModalityId = mriMod?.ModalityId;
                                else if (text.Contains("CT")) t.ModalityId = ctMod?.ModalityId;
                                else if (text.Contains("USG") || text.Contains("SOUND") || text.Contains("ULTRASOUND")) t.ModalityId = usMod?.ModalityId;
                                else if (text.Contains("XRAY") || text.Contains("X-RAY")) t.ModalityId = xrayMod?.ModalityId;
                            }
                        }

                        // Soft-deactivate so historical invoices/reports remain non-orphaned but active UI dropdowns stay clean
                        legacyDept.IsActive = false;
                    }
                    await context.SaveChangesAsync();
                    allDepts = await context.DepartmentMasters.ToListAsync();
                }
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

            var mriGuid = modalityIds["MRI"];
            var ctGuid = modalityIds["CT"];
            var usGuid = modalityIds["US"];
            var xrayGuid = modalityIds["XRAY"];

            // AUTOMATIC MODALITY TAXONOMY NORMALIZATION FOR RADIOLOGY TESTS
            var radTests = await context.Tests
                .Include(t => t.DepartmentMaster)
                .Where(t => t.DepartmentId == radDept.DepartmentId || 
                            t.DepartmentId == legacyDeptId ||
                            (t.DepartmentMaster != null && t.DepartmentMaster.MacroDepartment == "Radiology") ||
                            t.TestCode.Contains("MRI") || t.TestCode.Contains("CT") || t.TestCode.Contains("USG") || t.TestCode.Contains("XRAY") ||
                            t.TestName.Contains("MRI") || t.TestName.Contains("CT") || t.TestName.Contains("ULTRASOUND") || t.TestName.Contains("X-RAY"))
                .ToListAsync();

            foreach (var test in radTests)
            {
                test.DepartmentId = radDept.DepartmentId;
                var text = $"{test.TestCode} {test.TestName}".ToUpperInvariant();

                if (text.Contains("MRI") || text.Contains("MAGNETIC") || text.Contains("MRCP") || 
                    text.Contains("MRV") || text.Contains("MRA") || text.Contains("DWI") ||
                    text.Contains("DEFECOGRAPHY") || text.Contains("DEMENTIA") ||
                    text.Contains("CP ANGLE") || text.Contains("CPANGLE") ||
                    text.Contains("CV JUNCTION") || text.Contains("CVJUNCTION") ||
                    text.Contains("BRAIN PLAIN") || text.Contains("SPINE SCREENING") || text.Contains("CERVICAL SPINE") ||
                    text.Contains("LUMBAR SPINE") || text.Contains("DORSAL SPINE") || text.Contains("BRAIN STROKE") ||
                    text.Contains("MR ANGIO") || text.Contains("MR NEURO"))
                {
                    test.ModalityId = mriGuid;
                    test.Category = "MRI";
                }
                else if (text.Contains("CT SCAN") || text.Contains("COMPUTED") || text.Contains("HRCT") || 
                         text.Contains("CECT") || text.Contains("NCCT") || text.Contains(" CT ") || 
                         text.StartsWith("CT ") || text.Contains("CT_") || text.Contains("CT-") ||
                         text.Contains("CT CONTRAST") || text.Contains("FACIAL BONES") || text.Contains("ORBITS"))
                {
                    test.ModalityId = ctGuid;
                    test.Category = "CT Scan";
                }
                else if (text.Contains("USG") || text.Contains("ULTRASOUND") || text.Contains("SONO") || 
                         text.Contains("DOPPLER") || text.Contains("ECHO") || text.Contains("U/S"))
                {
                    test.ModalityId = usGuid;
                    test.Category = "Ultrasound";
                }
                else
                {
                    test.ModalityId = xrayGuid;
                    test.Category = "X-Ray";
                }
            }

            // Update existing radiology studies to synchronize with their tests
            var studies = await context.RadiologyStudies
                .Include(s => s.Order)
                    .ThenInclude(o => o.Test)
                .ToListAsync();
            foreach (var s in studies)
            {
                var ordTest = s.Order?.Test;
                if (ordTest != null && ordTest.ModalityId.HasValue)
                {
                    s.ModalityId = ordTest.ModalityId.Value;
                    s.Modality = ordTest.Category ?? "X-Ray";
                }
                else
                {
                    var sText = $"{s.Order?.TestCode} {ordTest?.TestName} {s.Modality}".ToUpperInvariant();
                    if (sText.Contains("MRI") || sText.Contains("MAGNETIC") || sText.Contains("MRCP") || sText.Contains("BRAIN PLAIN"))
                    {
                        s.ModalityId = mriGuid;
                        s.Modality = "MRI";
                    }
                    else if (sText.Contains("CT") || sText.Contains("COMPUTED") || sText.Contains("HRCT"))
                    {
                        s.ModalityId = ctGuid;
                        s.Modality = "CT Scan";
                    }
                    else if (sText.Contains("USG") || sText.Contains("ULTRASOUND") || sText.Contains("SONO"))
                    {
                        s.ModalityId = usGuid;
                        s.Modality = "Ultrasound";
                    }
                    else if (s.ModalityId == Guid.Empty)
                    {
                        s.ModalityId = xrayGuid;
                        s.Modality = "X-Ray";
                    }
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

            // Seed and ensure newly requested Radiology studies in Test Master and Catalog
            await SeedRequestedRadiologyStudiesAsync(context, radDept, modalityIds);

            await context.SaveChangesAsync();
            Console.WriteLine("[CatalogSeedService] Seeded base modalities and migrated legacy departments/tests/studies/templates successfully.");
        }

        private static async Task SeedRequestedRadiologyStudiesAsync(
            SynOSDbContext context,
            DepartmentMaster radDept,
            Dictionary<string, Guid> modalityIds)
        {
            var requestedTests = new[]
            {
                new { Code = "MRI_ABD_PLV", Name = "MRI ABDOMEN & PELVIS", ModalityCode = "MRI", Category = "MRI", Price = 11000m },
                new { Code = "MRI_BRAIN_CP_ANGLE", Name = "MRI BRAIN WITH CP ANGLE", ModalityCode = "MRI", Category = "MRI", Price = 6000m },
                new { Code = "MRI_CV_JUNCTION", Name = "MRI CV JUNCTION", ModalityCode = "MRI", Category = "MRI", Price = 6000m },
                new { Code = "MRI_DEFECOGRAPHY", Name = "MRI DEFECOGRAPHY", ModalityCode = "MRI", Category = "MRI", Price = 10000m },
                new { Code = "MRI_DEMENTIA_PROT", Name = "MRI DEMENTIA PROTOCOL (MRA + SWI + DTI)", ModalityCode = "MRI", Category = "MRI", Price = 9000m },
                new { Code = "MRI_BRAIN_ORBITS", Name = "MRI BRAIN WITH ORBITS", ModalityCode = "MRI", Category = "MRI", Price = 8000m },
                new { Code = "MRV_BRAIN", Name = "MRV BRAIN", ModalityCode = "MRI", Category = "MRI", Price = 2000m },
                new { Code = "MRA_BRAIN", Name = "MRA BRAIN", ModalityCode = "MRI", Category = "MRI", Price = 2000m },
                new { Code = "MRA_DWI", Name = "MRA DWI", ModalityCode = "MRI", Category = "MRI", Price = 3000m },
                new { Code = "MRI_DWI", Name = "MRI DWI", ModalityCode = "MRI", Category = "MRI", Price = 3000m },
                new { Code = "CT_BRAIN_ORBITS", Name = "CT BRAIN WITH ORBITS", ModalityCode = "CT", Category = "CT Scan", Price = 3000m }
            };

            const string defaultFindings = "FINDINGS:\n\nIMPRESSION:";

            foreach (var item in requestedTests)
            {
                var modGuid = modalityIds.ContainsKey(item.ModalityCode)
                    ? modalityIds[item.ModalityCode]
                    : (Guid?)null;

                var test = await context.Tests
                    .Include(t => t.TestPricings)
                    .Include(t => t.Parameters)
                    .FirstOrDefaultAsync(t => t.TestCode == item.Code);

                if (test == null)
                {
                    test = new Test
                    {
                        TestId = Guid.NewGuid(),
                        TestCode = item.Code,
                        TestName = item.Name,
                        Category = item.Category,
                        DepartmentId = radDept.DepartmentId,
                        ModalityId = modGuid,
                        SpecimenTypeCode = "NO_SPECIMEN",
                        IsActive = true,
                        IsProfile = false,
                        TAT_Hours = 24,
                        DefaultInterpretation = defaultFindings,
                        ReportTitle = item.Name,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    context.Tests.Add(test);
                }
                else
                {
                    test.TestName = item.Name;
                    test.Category = item.Category;
                    test.DepartmentId = radDept.DepartmentId;
                    test.ModalityId = modGuid;
                    test.SpecimenTypeCode = "NO_SPECIMEN";
                    test.IsActive = true;
                    if (string.IsNullOrWhiteSpace(test.DefaultInterpretation))
                    {
                        test.DefaultInterpretation = defaultFindings;
                    }
                    test.UpdatedAt = DateTimeOffset.UtcNow;
                }

                // Ensure pricing
                var pricing = test.TestPricings?.FirstOrDefault()
                    ?? await context.TestPricings.FirstOrDefaultAsync(p => p.TestId == test.TestId);

                if (pricing == null)
                {
                    context.TestPricings.Add(new TestPricing
                    {
                        PricingId = Guid.NewGuid(),
                        TestId = test.TestId,
                        BasePrice = item.Price,
                        EffectiveFrom = DateTime.Today.AddYears(-1),
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    pricing.BasePrice = item.Price;
                }

                // Ensure parameter for radiology narrative template
                var param = test.Parameters?.FirstOrDefault()
                    ?? await context.Parameters.FirstOrDefaultAsync(p => p.TestId == test.TestId);

                if (param == null)
                {
                    context.Parameters.Add(new Parameter
                    {
                        ParameterId = Guid.NewGuid(),
                        TestId = test.TestId,
                        ParameterCode = "PARAM1",
                        ParameterName = "Findings & Impressions",
                        DataType = "Text",
                        SortOrder = 1,
                        IsActive = true,
                        ShowNarrative = true,
                        NarrativeTemplate = defaultFindings,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(param.NarrativeTemplate))
                    {
                        param.NarrativeTemplate = defaultFindings;
                    }
                    param.ShowNarrative = true;
                }

                // Ensure CatalogTest synchronization
                var catalogTest = await context.CatalogTests.FirstOrDefaultAsync(c => c.TestCode == item.Code);
                if (catalogTest == null)
                {
                    context.CatalogTests.Add(new CatalogTest
                    {
                        TestCode = item.Code,
                        TestName = item.Name,
                        DepartmentCode = "RAD",
                        SpecimenCode = "NO_SPECIMEN",
                        TubeCode = "NA",
                        Price = item.Price,
                        IsPanel = false,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    catalogTest.TestName = item.Name;
                    catalogTest.Price = item.Price;
                    catalogTest.DepartmentCode = "RAD";
                    catalogTest.IsActive = true;
                    catalogTest.UpdatedAt = DateTimeOffset.UtcNow;
                }

                // Ensure CatalogParameter synchronization
                var catalogParam = await context.CatalogParameters.FirstOrDefaultAsync(cp => cp.TestCode == item.Code && cp.ParameterCode == "PARAM1");
                if (catalogParam == null)
                {
                    context.CatalogParameters.Add(new CatalogParameter
                    {
                        Id = Guid.NewGuid(),
                        TestCode = item.Code,
                        ParameterCode = "PARAM1",
                        ParameterName = "Findings & Impressions",
                        DataType = "Text",
                        Methodology = "Spectrophotometry",
                        NarrativeTemplate = defaultFindings,
                        ShowNarrative = true,
                        IsActive = true,
                        SortOrder = 1,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(catalogParam.NarrativeTemplate))
                    {
                        catalogParam.NarrativeTemplate = defaultFindings;
                    }
                    catalogParam.ShowNarrative = true;
                    catalogParam.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }
        }
    }
}
