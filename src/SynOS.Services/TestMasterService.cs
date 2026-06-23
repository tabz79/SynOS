using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;

namespace SynOS.Services
{
    public class TestMasterService : ITestMasterService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditService _auditService;
        private readonly ITestsCacheService _testsCacheService;

        public TestMasterService(
            SynOSDbContext context,
            IMapper mapper,
            IAuditService auditService,
            ITestsCacheService testsCacheService)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
            _testsCacheService = testsCacheService; // may be null - methods check for null
        }

        // -------------------------
        // Test management
        // -------------------------
        public async Task<Test> CreateTestAsync(CreateTestDto dto, Guid actorUserId)
        {
            var exists = await _context.Tests.AnyAsync(t => t.TestCode.ToUpper() == dto.TestCode.ToUpper());
            if (exists)
            {
                throw new InvalidOperationException($"Test code '{dto.TestCode}' already exists.");
            }

            var test = _mapper.Map<Test>(dto);
            test.TestId = Guid.NewGuid();
            test.CreatedAt = DateTimeOffset.UtcNow;
            test.IsActive = true;
            test.IsOutsourced = dto.IsOutsourced;
            test.SpecimenTypeCode = dto.SpecimenTypeCode;

            // Phase 8: Resolve DepartmentId from string
            if (!string.IsNullOrEmpty(dto.Department))
            {
                var deptMaster = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == dto.Department && d.IsActive);
                if (deptMaster == null)
                {
                    deptMaster = await _context.DepartmentMasters.FirstOrDefaultAsync(d => (d.Name == dto.Department || d.Code == dto.Department) && d.IsActive);
                }
                if (deptMaster == null)
                {
                    deptMaster = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == dto.Department);
                }
                if (deptMaster == null)
                {
                    deptMaster = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == dto.Department || d.Code == dto.Department);
                }
                
                if (deptMaster != null)
                {
                    test.DepartmentId = deptMaster.DepartmentId;
                }
                else
                {
                     // Fallback: Let's query active Pathology default first, then legacy Pathology.
                     var defaultDept = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == "Pathology" && d.IsActive);
                     if (defaultDept == null)
                     {
                          defaultDept = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == "Pathology");
                     }
                     test.DepartmentId = defaultDept?.DepartmentId;
                }
            }

            if (dto.BasePrice > 0)
            {
                test.TestPricings = new List<TestPricing>
                {
                    new TestPricing
                    {
                        PricingId = Guid.NewGuid(),
                        TestId = test.TestId,
                        BasePrice = dto.BasePrice,
                        EffectiveFrom = DateTime.Today, // Effective Today
                        CreatedAt = DateTimeOffset.UtcNow
                    }
                };
            }

            if (!string.IsNullOrEmpty(dto.DefaultInterpretation))
            {
                test.DefaultInterpretationLastUpdatedAt = DateTimeOffset.UtcNow;
                test.DefaultInterpretationLastUpdatedBy = actorUserId;
            }

            _context.Tests.Add(test);
            await _context.SaveChangesAsync();

            await SyncToCatalogAsync(test, dto, actorUserId);

            // Audit: map to DTO to avoid EF circular refs
            var testDtoNew = _mapper.Map<TestDto>(test);
            await _auditService.LogAsync(actorUserId, "CreateTest", "Test", test.TestId, testDtoNew);

            _testsCacheService?.InvalidateTestsCache();
            return test;
        }

        public async Task<Test> UpdateTestAsync(Guid testId, UpdateTestDto dto, Guid actorUserId)
        {
            var test = await _context.Tests
                .Include(t => t.TestPricings)
                .Include(t => t.DepartmentMaster)
                .FirstOrDefaultAsync(t => t.TestId == testId);
                
            if (test == null) throw new KeyNotFoundException("Test not found");

            if (dto.TestCode != null && dto.TestCode.Trim().ToUpper() != test.TestCode.ToUpper())
            {
                var exists = await _context.Tests.AnyAsync(t => t.TestId != testId && t.TestCode.ToUpper() == dto.TestCode.Trim().ToUpper());
                if (exists)
                {
                    throw new InvalidOperationException($"Test code '{dto.TestCode}' already exists.");
                }
                test.TestCode = dto.TestCode.Trim().ToUpper();
            }

            var oldDto = _mapper.Map<TestDto>(test);

            // Phase 8: Handle Department Change
            if (dto.Department != null && (test.DepartmentMaster?.Name != dto.Department))
            {
                var newDept = await _context.DepartmentMasters.FirstOrDefaultAsync(d => (d.Name == dto.Department || d.Code == dto.Department) && d.IsActive);
                if (newDept == null)
                {
                    newDept = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == dto.Department || d.Code == dto.Department);
                }
                if (newDept != null)
                {
                    test.DepartmentId = newDept.DepartmentId;
                    test.DepartmentMaster = newDept; // Update nav for automapper if needed
                }
            }

            // Phase 8: Handle Price Change
            // Check current price
            var currentPricing = test.TestPricings
                .Where(tp => tp.EffectiveFrom <= DateTime.UtcNow)
                .OrderByDescending(tp => tp.EffectiveFrom)
                .FirstOrDefault();

            decimal currentPrice = currentPricing?.BasePrice ?? 0;

            if (dto.BasePrice != currentPrice)
            {
                 var newPricing = new TestPricing
                 {
                     PricingId = Guid.NewGuid(),
                     TestId = test.TestId,
                     BasePrice = dto.BasePrice,
                     EffectiveFrom = DateTime.Today, // Effective from today
                     CreatedAt = DateTimeOffset.UtcNow
                 };
                 _context.TestPricings.Add(newPricing);
            }

            // Map other fields (Name, Category, TAT, etc.)
            // Exclude Department and BasePrice from auto-mapping if they conflict, 
            // but since they are removed from Test entity, AutoMapper might ignore them or we need to be careful.
            // DTO likely still has them.
            // We should manually map what allowed.
            if (dto.TestName != null) test.TestName = dto.TestName;
            if (dto.Category != null) test.Category = dto.Category;
            test.TAT_Hours = dto.TAT_Hours;
            test.IsActive = dto.IsActive;
            test.IsOutsourced = dto.IsOutsourced;
            test.SpecimenTypeCode = dto.SpecimenTypeCode;
            test.IsProfile = dto.IsProfile;
            test.ModalityId = dto.ModalityId; // Save ModalityId
            test.ReportTemplateId = dto.ReportTemplateId; // Save ReportTemplateId
            
            // _mapper.Map(dto, test); // CAUTION: If DTO has BasePrice/Department, this might try to set non-existent props? 
            // Since props are removed from Test, AutoMapper fails silently or errors depending on config.
            // To be safe, rely on the manual updates above and standard properties.
            
            if (test.DefaultInterpretation != dto.DefaultInterpretation)
            {
                test.DefaultInterpretation = dto.DefaultInterpretation;
                test.DefaultInterpretationLastUpdatedAt = DateTimeOffset.UtcNow;
                test.DefaultInterpretationLastUpdatedBy = actorUserId;
            }

            test.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            await SyncToCatalogAsync(test, dto, actorUserId);

            var newDto = _mapper.Map<TestDto>(test);
            await _auditService.LogAsync(actorUserId, "UpdateTest", "Test", test.TestId, new { Old = oldDto, New = newDto });

            _testsCacheService?.InvalidateTestsCache();
            return test;
        }

        public async Task<Test?> GetTestAsync(Guid testId)
        {
            return await _context.Tests
                .Include(t => t.Parameters.Where(p => p.IsActive))
                    .ThenInclude(p => p.ReferenceRanges)
                .Include(t => t.PriceConfigs)
                .Include(t => t.TestPricings) 
                .Include(t => t.DepartmentMaster) 
                .Include(t => t.ProfileChildren)
                    .ThenInclude(pc => pc.ChildTest)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TestId == testId);
        }

        public async Task<IReadOnlyList<Test>> GetTestsAsync()
        {
            return await _context.Tests
                .Where(t => t.IsActive)
                .Include(t => t.Parameters.Where(p => p.IsActive))
                    .ThenInclude(p => p.ReferenceRanges)
                .Include(t => t.TestPricings)
                .Include(t => t.DepartmentMaster)
                .Include(t => t.ProfileChildren)
                    .ThenInclude(pc => pc.ChildTest)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task DeleteTestAsync(Guid testId, Guid actorUserId)
        {
            var test = await _context.Tests.FindAsync(testId);
            if (test == null) throw new KeyNotFoundException("Test not found");

            // ALWAYS soft-delete and rename code to release original code for future use with ZERO risk of foreign key failures
            var originalCode = test.TestCode;
            var suffix = $"_DEL_{DateTime.UtcNow.Ticks}";
            var maxLen = 50 - suffix.Length;
            if (originalCode.Length > maxLen)
            {
                originalCode = originalCode.Substring(0, maxLen);
            }
            
            var newCode = originalCode + suffix;

            // 1. Remove CatalogPanelMappings referencing this test to prevent Restrict constraint failures
            var catalogPanelMappings = await _context.CatalogPanelMappings
                .Where(m => m.PanelTestCode == originalCode || m.ChildTestCode == originalCode)
                .ToListAsync();
            _context.CatalogPanelMappings.RemoveRange(catalogPanelMappings);

            // 2. Remove operational ProfileMaps referencing this test
            var profileMaps = await _context.ProfileMaps
                .Where(pm => pm.ParentTestId == testId || pm.ChildTestId == testId)
                .ToListAsync();
            _context.ProfileMaps.RemoveRange(profileMaps);

            // 3. Update operational parameters to be inactive (uses TestId, which is not modified)
            var opParams = await _context.Parameters.Where(p => p.TestId == testId).ToListAsync();
            foreach (var p in opParams)
            {
                p.IsActive = false;
                p.UpdatedAt = DateTimeOffset.UtcNow;
            }

            // 4. Update the main Test record (TestId is key, TestCode is not key, so update is allowed!)
            test.TestCode = newCode;
            test.IsActive = false;
            test.UpdatedAt = DateTimeOffset.UtcNow;

            // 5. Handle CatalogTest and CatalogParameters. TestCode is part of primary/identifying keys, 
            // so EF Core forbids updating it. Instead, we delete the old records and insert new inactive ones.
            var catalogTest = await _context.CatalogTests.FirstOrDefaultAsync(ct => ct.TestCode == originalCode);
            if (catalogTest != null)
            {
                var catalogParams = await _context.CatalogParameters.Where(cp => cp.TestCode == originalCode).ToListAsync();

                // DTO data extraction for recreation
                var newCatalogTest = new CatalogTest
                {
                    TestCode = newCode,
                    TestName = catalogTest.TestName,
                    DepartmentCode = catalogTest.DepartmentCode,
                    SpecimenCode = catalogTest.SpecimenCode,
                    TubeCode = catalogTest.TubeCode,
                    Price = catalogTest.Price,
                    IsPanel = catalogTest.IsPanel,
                    IsActive = false,
                    CreatedBy = catalogTest.CreatedBy,
                    UpdatedBy = actorUserId,
                    CreatedAt = catalogTest.CreatedAt,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                var newParams = catalogParams.Select(cp => new CatalogParameter
                {
                    Id = Guid.NewGuid(),
                    TestCode = newCode,
                    ParameterCode = cp.ParameterCode,
                    ParameterName = cp.ParameterName,
                    DataType = cp.DataType,
                    Unit = cp.Unit,
                    ReferenceRange = cp.ReferenceRange,
                    SortOrder = cp.SortOrder,
                    Methodology = cp.Methodology,
                    Formula = cp.Formula,
                    IsCalculated = cp.IsCalculated,
                    IsActive = false,
                    CreatedBy = cp.CreatedBy,
                    UpdatedBy = actorUserId,
                    CreatedAt = cp.CreatedAt,
                    UpdatedAt = DateTimeOffset.UtcNow
                }).ToList();

                // Delete old records first to release the old key LFT
                _context.CatalogParameters.RemoveRange(catalogParams);
                _context.CatalogTests.Remove(catalogTest);
                await _context.SaveChangesAsync();

                // Add the new inactive records under the new suffixed key
                _context.CatalogTests.Add(newCatalogTest);
                _context.CatalogParameters.AddRange(newParams);
            }

            await _context.SaveChangesAsync();

            // audit simple payload
            await _auditService.LogAsync(actorUserId, "DeleteTest", "Test", testId, new { testId, deleted = true });

            _testsCacheService?.InvalidateTestsCache();
        }

        // -------------------------
        // Parameter management
        // -------------------------
        public async Task<Parameter> AddParameterToTestAsync(Guid testId, CreateParameterDto dto, Guid actorUserId)
        {
            var test = await _context.Tests.FindAsync(testId);
            if (test == null) throw new KeyNotFoundException("Test not found");

            var parameter = _mapper.Map<Parameter>(dto);
            parameter.ParameterId = Guid.NewGuid();
            parameter.TestId = testId;
            parameter.CreatedAt = DateTimeOffset.UtcNow;
            parameter.IsActive = true;

            _context.Parameters.Add(parameter);
            await _context.SaveChangesAsync();

            // audit: map to DTO
            var paramDto = _mapper.Map<ParameterDto>(parameter);
            await _auditService.LogAsync(actorUserId, "AddParameter", "Parameter", parameter.ParameterId, paramDto);

            _testsCacheService?.InvalidateTestsCache();
            return parameter;
        }

        public async Task<Parameter> UpdateParameterAsync(Guid testId, Guid parameterId, UpdateParameterDto dto, Guid actorUserId)
        {
            var parameter = await _context.Parameters.FirstOrDefaultAsync(p => p.TestId == testId && p.ParameterId == parameterId);
            if (parameter == null) throw new KeyNotFoundException("Parameter not found");

            var oldDto = _mapper.Map<ParameterDto>(parameter);
            _mapper.Map(dto, parameter);
            parameter.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            var newDto = _mapper.Map<ParameterDto>(parameter);
            await _auditService.LogAsync(actorUserId, "UpdateParameter", "Parameter", parameter.ParameterId, new { Old = oldDto, New = newDto });

            _testsCacheService?.InvalidateTestsCache();
            return parameter;
        }

        public async Task DeleteParameterAsync(Guid testId, Guid parameterId, Guid actorUserId)
        {
            var parameter = await _context.Parameters.FirstOrDefaultAsync(p => p.TestId == testId && p.ParameterId == parameterId);
            if (parameter == null) throw new KeyNotFoundException("Parameter not found");

            parameter.IsActive = false;
            parameter.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(actorUserId, "DeleteParameter", "Parameter", parameterId, new { parameterId, deleted = true });

            _testsCacheService?.InvalidateTestsCache();
        }

        // -------------------------
        // Reference Range management
        // -------------------------
        public async Task<ReferenceRange> AddReferenceRangeToParameterAsync(Guid parameterId, CreateReferenceRangeDto dto, Guid actorUserId)
        {
            var parameter = await _context.Parameters.FindAsync(parameterId);
            if (parameter == null) throw new KeyNotFoundException("Parameter not found");

            var range = _mapper.Map<ReferenceRange>(dto);
            range.ReferenceRangeId = Guid.NewGuid();
            range.ParameterId = parameterId;
            range.CreatedAt = DateTimeOffset.UtcNow;
            range.IsActive = true;

            _context.ReferenceRanges.Add(range);
            await _context.SaveChangesAsync();

            var rangeDto = _mapper.Map<ReferenceRangeDto>(range);
            await _auditService.LogAsync(actorUserId, "AddReferenceRange", "ReferenceRange", range.ReferenceRangeId, rangeDto);

            _testsCacheService?.InvalidateTestsCache();
            return range;
        }

        public async Task<ReferenceRange> UpdateReferenceRangeAsync(Guid parameterId, Guid rangeId, UpdateReferenceRangeDto dto, Guid actorUserId)
        {
            var range = await _context.ReferenceRanges.FirstOrDefaultAsync(r => r.ParameterId == parameterId && r.ReferenceRangeId == rangeId);
            if (range == null) throw new KeyNotFoundException("Reference range not found");

            var oldDto = _mapper.Map<ReferenceRangeDto>(range);
            _mapper.Map(dto, range);
            range.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            var newDto = _mapper.Map<ReferenceRangeDto>(range);
            await _auditService.LogAsync(actorUserId, "UpdateReferenceRange", "ReferenceRange", range.ReferenceRangeId, new { Old = oldDto, New = newDto });

            _testsCacheService?.InvalidateTestsCache();
            return range;
        }

        public async Task DeleteReferenceRangeAsync(Guid parameterId, Guid rangeId, Guid actorUserId)
        {
            var range = await _context.ReferenceRanges.FirstOrDefaultAsync(r => r.ParameterId == parameterId && r.ReferenceRangeId == rangeId);
            if (range == null) throw new KeyNotFoundException("Reference range not found");

            range.IsActive = false;
            range.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(actorUserId, "DeleteReferenceRange", "ReferenceRange", rangeId, new { rangeId, deleted = true });

            _testsCacheService?.InvalidateTestsCache();
        }

        // -------------------------
        // Price config
        // -------------------------
        public async Task<PriceConfig> AddOrUpdatePriceConfigAsync(Guid testId, CreatePriceConfigDto dto, Guid actorUserId)
        {
            var test = await _context.Tests.FindAsync(testId);
            if (test == null) throw new KeyNotFoundException("Test not found");

            var existing = await _context.PriceConfigs.FirstOrDefaultAsync(p => p.TestId == testId &&
                                                                                 p.EffectiveFrom == dto.EffectiveFrom &&
                                                                                 (dto.IsActive == null || p.IsActive == dto.IsActive));

            if (existing == null)
            {
                var price = _mapper.Map<PriceConfig>(dto);
                price.PriceId = Guid.NewGuid();
                price.TestId = testId;
                price.CreatedAt = DateTimeOffset.UtcNow;

                _context.PriceConfigs.Add(price);
                await _context.SaveChangesAsync();

                var priceDto = _mapper.Map<PriceConfigDto>(price);
                await _auditService.LogAsync(actorUserId, "AddPriceConfig", "PriceConfig", price.PriceId, priceDto);

                _testsCacheService?.InvalidateTestsCache();
                return price;
            }
            else
            {
                var oldDto = _mapper.Map<PriceConfigDto>(existing);
                _mapper.Map(dto, existing);
                existing.UpdatedAt = DateTimeOffset.UtcNow;

                await _context.SaveChangesAsync();

                var newDto = _mapper.Map<PriceConfigDto>(existing);
                await _auditService.LogAsync(actorUserId, "UpdatePriceConfig", "PriceConfig", existing.PriceId, new { Old = oldDto, New = newDto });

                _testsCacheService?.InvalidateTestsCache();
                return existing;
            }
        }

        // -------------------------
        // Additional helper required by other services
        // -------------------------
        /// <summary>
        /// Lookup Test by code (case-insensitive). Includes parameters and price configs.
        /// Implemented to satisfy ITestMasterService.GetTestByCodeAsync(string, string?).
        /// </summary>
        public async Task<Test?> GetTestByCodeAsync(string testCode, string? department = null)
        {
            if (string.IsNullOrWhiteSpace(testCode)) return null;
            var normalized = testCode.Trim();

            var query = _context.Tests
                .AsNoTracking()
                .Include(t => t.Parameters.Where(p => p.IsActive))
                    .ThenInclude(p => p.ReferenceRanges)
                .Include(t => t.PriceConfigs)
                .Include(t => t.DepartmentMaster) // Added
                .Include(t => t.TestPricings) // Added
                .Where(t => t.TestCode.ToUpper() == normalized.ToUpper());

            if (!string.IsNullOrWhiteSpace(department))
            {
                var deptUpper = department.ToUpperInvariant();
                // Phase 8: Filter by DepartmentMaster.Name or DepartmentMaster.Code
                query = query.Where(t => t.DepartmentMaster.Name.ToUpper() == deptUpper || t.DepartmentMaster.Code.ToUpper() == deptUpper);
            }

            return await query.FirstOrDefaultAsync();
        }

        private string MapSpecimenToTube(string specimenCode)
        {
            if (string.IsNullOrWhiteSpace(specimenCode)) return "PLAIN";
            var normalized = specimenCode.Trim().ToUpperInvariant();
            switch (normalized)
            {
                case "SERUM": return "PLAIN";
                case "EDTA": return "EDTA";
                case "PLASMA": return "PLAIN";
                case "SST": return "SST";
                case "URINE": return "PLAIN";
                case "CSF": return "PLAIN";
                case "SWAB": return "PLAIN";
                default: return "PLAIN";
            }
        }

        private string GetTubeColor(string tubeCode)
        {
            if (string.IsNullOrWhiteSpace(tubeCode)) return "Red";
            var normalized = tubeCode.Trim().ToUpperInvariant();
            switch (normalized)
            {
                case "EDTA": return "Purple";
                case "SST": return "Yellow";
                case "FLUORIDE": return "Grey";
                case "CITRATE": return "Blue";
                case "PLAIN": return "Red";
                default: return "Red";
            }
        }

        private static string? NormalizeFormula(string? formula)
        {
            return string.IsNullOrWhiteSpace(formula) ? null : formula.Trim();
        }

        private static bool HasCalculation(ParameterSaveDto parameter)
        {
            return parameter.IsCalculated || !string.IsNullOrWhiteSpace(parameter.Formula);
        }

        private async Task<Guid> EnsureTestExistsAsync(string testCode, string deptCode)
        {
            var test = await _context.Tests.FirstOrDefaultAsync(t => t.TestCode == testCode);
            if (test == null)
            {
                var defaultDept = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Code == deptCode || d.Name == deptCode);
                if (defaultDept == null)
                {
                    defaultDept = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == "Biochemistry");
                }
                
                test = new Test
                {
                    TestId = Guid.NewGuid(),
                    TestCode = testCode,
                    TestName = testCode,
                    DepartmentId = defaultDept?.DepartmentId,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.Tests.Add(test);
                await _context.SaveChangesAsync();
            }
            return test.TestId;
        }

        private async Task EnsureCatalogTestExistsAsync(string testCode, string deptCode, Guid actorUserId)
        {
            var catalogTest = await _context.CatalogTests.FirstOrDefaultAsync(c => c.TestCode == testCode);
            if (catalogTest == null)
            {
                catalogTest = new CatalogTest
                {
                    TestCode = testCode,
                    TestName = testCode,
                    DepartmentCode = deptCode,
                    SpecimenCode = "SERUM",
                    TubeCode = "PLAIN",
                    Price = 0,
                    IsPanel = false,
                    IsActive = true,
                    CreatedBy = actorUserId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.CatalogTests.Add(catalogTest);
                await _context.SaveChangesAsync();
            }
        }

        private async Task SyncToCatalogAsync(Test test, CreateTestDto dto, Guid actorUserId)
        {
            var deptCode = test.DepartmentMaster?.Code ?? "BIO";
            var catalogDept = await _context.CatalogProcessingDepartments.FirstOrDefaultAsync(d => d.DepartmentCode == deptCode);
            if (catalogDept == null)
            {
                catalogDept = new CatalogProcessingDepartment
                {
                    DepartmentCode = deptCode,
                    DepartmentName = deptCode,
                    ServiceCategoryCode = "LAB",
                    RequiresSpecimen = !string.Equals(deptCode, "RAD", StringComparison.OrdinalIgnoreCase),
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.CatalogProcessingDepartments.Add(catalogDept);
                await _context.SaveChangesAsync();
            }

            var specCode = (test.SpecimenTypeCode ?? "SERUM").ToUpperInvariant();
            var catalogSpec = await _context.CatalogSpecimenTypes.FirstOrDefaultAsync(s => s.SpecimenCode == specCode);
            if (catalogSpec == null)
            {
                catalogSpec = new CatalogSpecimenType
                {
                    SpecimenCode = specCode,
                    SpecimenName = specCode,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.CatalogSpecimenTypes.Add(catalogSpec);
                await _context.SaveChangesAsync();
            }

            var tubeCode = MapSpecimenToTube(specCode);
            var catalogTube = await _context.CatalogTubeTypes.FirstOrDefaultAsync(t => t.TubeCode == tubeCode);
            if (catalogTube == null)
            {
                catalogTube = new CatalogTubeType
                {
                    TubeCode = tubeCode,
                    TubeName = tubeCode,
                    Color = GetTubeColor(tubeCode),
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.CatalogTubeTypes.Add(catalogTube);
                await _context.SaveChangesAsync();
            }

            var specType = await _context.SpecimenTypes.FirstOrDefaultAsync(s => s.Code == specCode);
            if (specType == null)
            {
                specType = new SpecimenType
                {
                    Code = specCode,
                    Name = specCode,
                    ContainerCategory = "General",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.SpecimenTypes.Add(specType);
                await _context.SaveChangesAsync();
            }

            var catalogTest = await _context.CatalogTests.FirstOrDefaultAsync(ct => ct.TestCode == test.TestCode);
            if (catalogTest == null)
            {
                catalogTest = new CatalogTest
                {
                    TestCode = test.TestCode,
                    TestName = test.TestName,
                    DepartmentCode = deptCode,
                    SpecimenCode = specCode,
                    TubeCode = tubeCode,
                    Price = dto.BasePrice,
                    IsPanel = dto.IsProfile,
                    IsActive = test.IsActive,
                    CreatedBy = actorUserId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                    DefaultInterpretation = test.DefaultInterpretation,
                    DefaultInterpretationLastUpdatedAt = test.DefaultInterpretationLastUpdatedAt,
                    DefaultInterpretationLastUpdatedBy = test.DefaultInterpretationLastUpdatedBy
                };
                _context.CatalogTests.Add(catalogTest);
            }
            else
            {
                catalogTest.TestName = test.TestName;
                catalogTest.DepartmentCode = deptCode;
                catalogTest.SpecimenCode = specCode;
                catalogTest.TubeCode = tubeCode;
                catalogTest.Price = dto.BasePrice;
                catalogTest.IsPanel = dto.IsProfile;
                catalogTest.IsActive = test.IsActive;
                catalogTest.UpdatedBy = actorUserId;
                catalogTest.UpdatedAt = DateTimeOffset.UtcNow;
                catalogTest.DefaultInterpretation = test.DefaultInterpretation;
                catalogTest.DefaultInterpretationLastUpdatedAt = test.DefaultInterpretationLastUpdatedAt;
                catalogTest.DefaultInterpretationLastUpdatedBy = test.DefaultInterpretationLastUpdatedBy;
            }
            await _context.SaveChangesAsync();

            var inputParamCodes = (dto.Parameters ?? new List<ParameterSaveDto>()).Select(p => p.ParameterCode.ToUpperInvariant()).ToList();
            
            var catalogParams = await _context.CatalogParameters.Where(cp => cp.TestCode == test.TestCode).ToListAsync();
            foreach (var paramDto in dto.Parameters ?? new List<ParameterSaveDto>())
            {
                var normParamCode = paramDto.ParameterCode.Trim().ToUpperInvariant();
                var catParam = catalogParams.FirstOrDefault(cp => cp.ParameterCode.ToUpperInvariant() == normParamCode);
                var formula = NormalizeFormula(paramDto.Formula);
                var isCalculated = HasCalculation(paramDto);
                if (catParam == null)
                {
                    catParam = new CatalogParameter
                    {
                        Id = Guid.NewGuid(),
                        TestCode = test.TestCode,
                        ParameterCode = paramDto.ParameterCode,
                        ParameterName = paramDto.ParameterName,
                        DataType = paramDto.DataType,
                        Unit = paramDto.Unit,
                        ReferenceRange = paramDto.ReferenceRange,
                        SortOrder = paramDto.SortOrder,
                        Methodology = paramDto.Methodology,
                        Formula = formula,
                        IsCalculated = isCalculated,
                        IsActive = true,
                        CreatedBy = actorUserId,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogParameters.Add(catParam);
                }
                else
                {
                    catParam.ParameterName = paramDto.ParameterName;
                    catParam.DataType = paramDto.DataType;
                    catParam.Unit = paramDto.Unit;
                    catParam.ReferenceRange = paramDto.ReferenceRange;
                    catParam.SortOrder = paramDto.SortOrder;
                    catParam.Methodology = paramDto.Methodology;
                    catParam.Formula = formula;
                    catParam.IsCalculated = isCalculated;
                    catParam.IsActive = true;
                    catParam.UpdatedBy = actorUserId;
                    catParam.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }

            foreach (var catParam in catalogParams)
            {
                if (!inputParamCodes.Contains(catParam.ParameterCode.ToUpperInvariant()))
                {
                    catParam.IsActive = false;
                    catParam.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }

            var opParams = await _context.Parameters.Where(p => p.TestId == test.TestId).ToListAsync();
            var opParamIds = opParams.Select(p => p.ParameterId).ToList();
            var opRanges = await _context.ReferenceRanges.Where(r => opParamIds.Contains(r.ParameterId)).ToListAsync();

            foreach (var paramDto in dto.Parameters ?? new List<ParameterSaveDto>())
            {
                var normParamCode = paramDto.ParameterCode.Trim().ToUpperInvariant();
                var opParam = opParams.FirstOrDefault(p => p.ParameterCode.ToUpperInvariant() == normParamCode);
                if (opParam == null)
                {
                    opParam = new Parameter
                    {
                        ParameterId = Guid.NewGuid(),
                        TestId = test.TestId,
                        ParameterCode = paramDto.ParameterCode,
                        ParameterName = paramDto.ParameterName,
                        Unit = paramDto.Unit,
                        DataType = paramDto.DataType,
                        SortOrder = paramDto.SortOrder,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.Parameters.Add(opParam);
                }
                else
                {
                    opParam.ParameterName = paramDto.ParameterName;
                    opParam.Unit = paramDto.Unit;
                    opParam.DataType = paramDto.DataType;
                    opParam.SortOrder = paramDto.SortOrder;
                    opParam.IsActive = true;
                    opParam.UpdatedAt = DateTimeOffset.UtcNow;
                }
                
                await _context.SaveChangesAsync();

                // Sync demographic reference ranges
                var currentParamRanges = opRanges.Where(r => r.ParameterId == opParam.ParameterId).ToList();
                var currentCatalogRanges = await _context.CatalogReferenceRanges
                    .Where(r => r.TestCode == test.TestCode && r.ParameterCode == paramDto.ParameterCode)
                    .ToListAsync();

                void SyncRange(bool use, string sex, string ageGroup, decimal? min, decimal? max, string? textRange = null)
                {
                    // Derive age min/max for Catalog_ReferenceRanges based on ageGroup
                    int? catAgeMin = null;
                    int? catAgeMax = null;

                    if (ageGroup == "Newborn")
                    {
                        catAgeMin = 0;
                        catAgeMax = 0; // Newborns are 0-28 days, represented as 0 years in catalog age-based system
                    }
                    else if (ageGroup == "Infant")
                    {
                        catAgeMin = 0;
                        catAgeMax = 1; // 29 days - 12 months, represented as up to 1 year
                    }
                    else if (ageGroup == "Child")
                    {
                        catAgeMin = 1;
                        catAgeMax = 12; // 1-12 years
                    }
                    else if (ageGroup == "Adult")
                    {
                        catAgeMin = 12;
                        catAgeMax = 120; // 13+ years
                    }

                    // 1. Sync Operational database (ReferenceRanges)
                    var existing = currentParamRanges.FirstOrDefault(r => r.Sex == sex && r.AgeGroup == ageGroup);
                    if (use)
                    {
                        if (existing == null)
                        {
                            var newRange = new ReferenceRange
                            {
                                ReferenceRangeId = Guid.NewGuid(),
                                ParameterId = opParam.ParameterId,
                                AgeGroup = ageGroup,
                                Sex = sex,
                                RefLow = min,
                                RefHigh = max,
                                TextRange = textRange,
                                EffectiveFrom = DateTime.UtcNow.Date,
                                IsActive = true,
                                CreatedAt = DateTimeOffset.UtcNow,
                                UpdatedAt = DateTimeOffset.UtcNow
                            };
                            _context.ReferenceRanges.Add(newRange);
                        }
                        else
                        {
                            existing.RefLow = min;
                            existing.RefHigh = max;
                            existing.TextRange = textRange;
                            existing.IsActive = true;
                            existing.UpdatedAt = DateTimeOffset.UtcNow;
                        }
                    }
                    else
                    {
                        if (existing != null)
                        {
                            _context.ReferenceRanges.Remove(existing);
                        }
                    }

                    // 2. Sync Catalog database (Catalog_ReferenceRanges)
                    var existingCat = currentCatalogRanges.FirstOrDefault(r => r.Sex == sex && r.AgeMin == catAgeMin && r.AgeMax == catAgeMax);
                    if (use)
                    {
                        if (existingCat == null)
                        {
                            var newCatRange = new CatalogReferenceRange
                            {
                                Id = Guid.NewGuid(),
                                TestCode = test.TestCode,
                                ParameterCode = paramDto.ParameterCode,
                                Sex = sex,
                                AgeMin = catAgeMin,
                                AgeMax = catAgeMax,
                                RefLow = min,
                                RefHigh = max,
                                TextRange = textRange,
                                EffectiveFrom = DateTime.UtcNow.Date,
                                IsActive = true,
                                CreatedAt = DateTimeOffset.UtcNow,
                                UpdatedAt = DateTimeOffset.UtcNow
                            };
                            _context.CatalogReferenceRanges.Add(newCatRange);
                        }
                        else
                        {
                            existingCat.RefLow = min;
                            existingCat.RefHigh = max;
                            existingCat.TextRange = textRange;
                            existingCat.IsActive = true;
                            existingCat.UpdatedAt = DateTimeOffset.UtcNow;
                        }
                    }
                    else
                    {
                        if (existingCat != null)
                        {
                            _context.CatalogReferenceRanges.Remove(existingCat);
                        }
                    }
                }

                SyncRange(paramDto.UseMale, "Male", "ALL", paramDto.MaleMin, paramDto.MaleMax);
                SyncRange(paramDto.UseFemale, "Female", "ALL", paramDto.FemaleMin, paramDto.FemaleMax);
                SyncRange(paramDto.UseInfant, "ALL", "Infant", paramDto.InfantMin, paramDto.InfantMax);
                SyncRange(paramDto.UseChild, "ALL", "Child", paramDto.ChildMin, paramDto.ChildMax);
                SyncRange(paramDto.UseAdult, "ALL", "Adult", paramDto.AdultMin, paramDto.AdultMax);

                // Category specific overrides (Newborn, Infant, Child, Adult for Male/Female)
                SyncRange(paramDto.UseNewbornMale, "Male", "Newborn", paramDto.NewbornMaleMin, paramDto.NewbornMaleMax, paramDto.NewbornMaleText);
                SyncRange(paramDto.UseNewbornFemale, "Female", "Newborn", paramDto.NewbornFemaleMin, paramDto.NewbornFemaleMax, paramDto.NewbornFemaleText);
                SyncRange(paramDto.UseInfantMale, "Male", "Infant", paramDto.InfantMaleMin, paramDto.InfantMaleMax, paramDto.InfantMaleText);
                SyncRange(paramDto.UseInfantFemale, "Female", "Infant", paramDto.InfantFemaleMin, paramDto.InfantFemaleMax, paramDto.InfantFemaleText);
                SyncRange(paramDto.UseChildMale, "Male", "Child", paramDto.ChildMaleMin, paramDto.ChildMaleMax, paramDto.ChildMaleText);
                SyncRange(paramDto.UseChildFemale, "Female", "Child", paramDto.ChildFemaleMin, paramDto.ChildFemaleMax, paramDto.ChildFemaleText);
                SyncRange(paramDto.UseAdultMale, "Male", "Adult", paramDto.AdultMaleMin, paramDto.AdultMaleMax, paramDto.AdultMaleText);
                SyncRange(paramDto.UseAdultFemale, "Female", "Adult", paramDto.AdultFemaleMin, paramDto.AdultFemaleMax, paramDto.AdultFemaleText);

                if (!string.IsNullOrWhiteSpace(paramDto.ReferenceRange))
                {
                    var range = currentParamRanges.FirstOrDefault(r => r.ParameterId == opParam.ParameterId && r.AgeGroup == "ALL" && r.Sex == "ALL");
                    decimal? refLow = null;
                    decimal? refHigh = null;

                    // Try parsing default numeric range
                    var rangeStr = paramDto.ReferenceRange.Trim();
                    if (rangeStr.Contains('-'))
                    {
                        var parts = rangeStr.Split('-');
                        if (parts.Length == 2 && 
                            decimal.TryParse(parts[0].Trim(), out var rLow) && 
                            decimal.TryParse(parts[1].Trim(), out var rHigh))
                        {
                            refLow = rLow;
                            refHigh = rHigh;
                        }
                    }
                    else if (rangeStr.StartsWith('<'))
                    {
                        if (decimal.TryParse(rangeStr.Substring(1).Trim(), out var rHigh))
                        {
                            refHigh = rHigh;
                        }
                    }
                    else if (rangeStr.StartsWith('>'))
                    {
                        if (decimal.TryParse(rangeStr.Substring(1).Trim(), out var rLow))
                        {
                            refLow = rLow;
                        }
                    }

                    if (range == null)
                    {
                        range = new ReferenceRange
                        {
                            ReferenceRangeId = Guid.NewGuid(),
                            ParameterId = opParam.ParameterId,
                            AgeGroup = "ALL",
                            Sex = "ALL",
                            TextRange = paramDto.ReferenceRange,
                            RefLow = refLow,
                            RefHigh = refHigh,
                            EffectiveFrom = DateTime.UtcNow.Date,
                            IsActive = true,
                            CreatedAt = DateTimeOffset.UtcNow,
                            UpdatedAt = DateTimeOffset.UtcNow
                        };
                        _context.ReferenceRanges.Add(range);
                    }
                    else
                    {
                        range.TextRange = paramDto.ReferenceRange;
                        range.RefLow = refLow;
                        range.RefHigh = refHigh;
                        range.IsActive = true;
                        range.UpdatedAt = DateTimeOffset.UtcNow;
                    }

                    // Sync default range to Catalog_ReferenceRanges as well to avoid clean sweep wiping it
                    var existingCat = currentCatalogRanges.FirstOrDefault(r => r.Sex == "ALL" && r.AgeMin == null && r.AgeMax == null);
                    if (existingCat == null)
                    {
                        var newCatRange = new CatalogReferenceRange
                        {
                            Id = Guid.NewGuid(),
                            TestCode = test.TestCode,
                            ParameterCode = paramDto.ParameterCode,
                            Sex = "ALL",
                            AgeMin = null,
                            AgeMax = null,
                            RefLow = refLow,
                            RefHigh = refHigh,
                            TextRange = paramDto.ReferenceRange,
                            EffectiveFrom = DateTime.UtcNow.Date,
                            IsActive = true,
                            CreatedAt = DateTimeOffset.UtcNow,
                            UpdatedAt = DateTimeOffset.UtcNow
                        };
                        _context.CatalogReferenceRanges.Add(newCatRange);
                    }
                    else
                    {
                        existingCat.RefLow = refLow;
                        existingCat.RefHigh = refHigh;
                        existingCat.TextRange = paramDto.ReferenceRange;
                        existingCat.IsActive = true;
                        existingCat.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
                else
                {
                    var range = currentParamRanges.FirstOrDefault(r => r.ParameterId == opParam.ParameterId && r.AgeGroup == "ALL" && r.Sex == "ALL");
                    if (range != null)
                    {
                        _context.ReferenceRanges.Remove(range);
                    }

                    var existingCat = currentCatalogRanges.FirstOrDefault(r => r.Sex == "ALL" && r.AgeMin == null && r.AgeMax == null);
                    if (existingCat != null)
                    {
                        _context.CatalogReferenceRanges.Remove(existingCat);
                    }
                }
            }

            foreach (var opParam in opParams)
            {
                if (!inputParamCodes.Contains(opParam.ParameterCode.ToUpperInvariant()))
                {
                    opParam.IsActive = false;
                    opParam.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }
            await _context.SaveChangesAsync();

            var existingCatalogMappings = await _context.CatalogPanelMappings.Where(m => m.PanelTestCode == test.TestCode).ToListAsync();
            _context.CatalogPanelMappings.RemoveRange(existingCatalogMappings);

            var existingOpMappings = await _context.ProfileMaps.Where(m => m.ParentTestId == test.TestId).ToListAsync();
            _context.ProfileMaps.RemoveRange(existingOpMappings);
            await _context.SaveChangesAsync();

            if (dto.IsProfile && dto.IncludedTestCodes != null && dto.IncludedTestCodes.Any())
            {
                int sequence = 1;
                foreach (var childCode in dto.IncludedTestCodes)
                {
                    if (string.IsNullOrWhiteSpace(childCode)) continue;

                    var childTestId = await EnsureTestExistsAsync(childCode, deptCode);
                    await EnsureCatalogTestExistsAsync(childCode, deptCode, actorUserId);

                    var catMapping = new CatalogPanelMapping
                    {
                        Id = Guid.NewGuid(),
                        PanelTestCode = test.TestCode,
                        ChildTestCode = childCode,
                        SortOrder = sequence,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogPanelMappings.Add(catMapping);

                    var opMapping = new SynOS.Models.Entities.ProfileMap
                    {
                        ProfileMapId = Guid.NewGuid(),
                        ParentTestId = test.TestId,
                        ChildTestId = childTestId,
                        Sequence = sequence
                    };
                    _context.ProfileMaps.Add(opMapping);

                    sequence++;
                }
                await _context.SaveChangesAsync();
            }
        }
    }
}
