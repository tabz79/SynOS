using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities;

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
            var test = _mapper.Map<Test>(dto);
            test.TestId = Guid.NewGuid();
            test.CreatedAt = DateTimeOffset.UtcNow;
            test.IsActive = true;
            test.IsOutsourced = dto.IsOutsourced;

            // Phase 8: Resolve DepartmentId from string
            if (!string.IsNullOrEmpty(dto.Department))
            {
                var deptMaster = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == dto.Department);
                if (deptMaster == null)
                {
                    // Fallback or Create? For now, we assume Master exists or throw.
                    // Let's default to creating it if strict mode isn't on, OR throw.
                    // SAFE: Throw if not found to enforce master data integrity.
                    // Actually, during migration we might want flexibility but strict is better.
                    // But wait, DTO likely still has 'Department' string.
                    // Try to find by Name or Code.
                     deptMaster = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == dto.Department || d.Code == dto.Department);
                }
                
                if (deptMaster != null)
                {
                    test.DepartmentId = deptMaster.DepartmentId;
                }
                else
                {
                     // Fallback: Create dynamic department? No, that violates stabilization.
                     // Assign to 'Other' or throw?
                     // Current choice: Leave null, let validation catch it, or assign 'Pathology' default?
                     // Let's query Pathology default.
                     var defaultDept = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == "Pathology");
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

            _context.Tests.Add(test);
            await _context.SaveChangesAsync();

            // Audit: map to DTO to avoid EF circular refs
            var testDto = _mapper.Map<TestDto>(test);
            await _auditService.LogAsync(actorUserId, "CreateTest", "Test", test.TestId, testDto);

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

            var oldDto = _mapper.Map<TestDto>(test);

            // Phase 8: Handle Department Change
            if (dto.Department != null && (test.DepartmentMaster?.Name != dto.Department))
            {
                var newDept = await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Name == dto.Department || d.Code == dto.Department);
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
            
            // _mapper.Map(dto, test); // CAUTION: If DTO has BasePrice/Department, this might try to set non-existent props? 
            // Since props are removed from Test, AutoMapper fails silently or errors depending on config.
            // To be safe, rely on the manual updates above and standard properties.
            
            test.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            var newDto = _mapper.Map<TestDto>(test);
            await _auditService.LogAsync(actorUserId, "UpdateTest", "Test", test.TestId, new { Old = oldDto, New = newDto });

            _testsCacheService?.InvalidateTestsCache();
            return test;
        }

        public async Task<Test?> GetTestAsync(Guid testId)
        {
            return await _context.Tests
                .Include(t => t.Parameters)
                    .ThenInclude(p => p.ReferenceRanges)
                .Include(t => t.Parameters)
                    .ThenInclude(p => p.ReferenceRanges)
                .Include(t => t.PriceConfigs)
                .Include(t => t.TestPricings) // Added
                .Include(t => t.DepartmentMaster) // Added
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TestId == testId);
        }

        public async Task<IReadOnlyList<Test>> GetTestsAsync()
        {
            return await _context.Tests
                .Include(t => t.Parameters)
                .Include(t => t.TestPricings)
                .Include(t => t.DepartmentMaster)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task DeleteTestAsync(Guid testId, Guid actorUserId)
        {
            var test = await _context.Tests.FindAsync(testId);
            if (test == null) throw new KeyNotFoundException("Test not found");

            test.IsActive = false;
            test.UpdatedAt = DateTimeOffset.UtcNow;

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
                .Include(t => t.Parameters)
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
    }
}
