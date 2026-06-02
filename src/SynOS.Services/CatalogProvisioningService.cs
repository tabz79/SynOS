using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Dtos;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;

namespace SynOS.Services
{
    public class CatalogProvisioningService : ICatalogProvisioningService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<CatalogProvisioningService> _logger;
        private readonly ITestsCacheService _cacheService;

        public CatalogProvisioningService(
            SynOSDbContext context,
            ILogger<CatalogProvisioningService> logger,
            ITestsCacheService cacheService)
        {
            _context = context;
            _logger = logger;
            _cacheService = cacheService;
        }

        public async Task<string> GetCatalogVersionHashAsync()
        {
            var tests = await _context.CatalogTests.OrderBy(t => t.TestCode).ToListAsync();
            var parameters = await _context.CatalogParameters.OrderBy(p => p.ParameterCode).ToListAsync();
            var mappings = await _context.CatalogPanelMappings.OrderBy(m => m.PanelTestCode).ThenBy(m => m.ChildTestCode).ToListAsync();
            var specimens = await _context.CatalogSpecimenTypes.OrderBy(s => s.SpecimenCode).ToListAsync();
            var tubes = await _context.CatalogTubeTypes.OrderBy(t => t.TubeCode).ToListAsync();

            var sb = new StringBuilder();
            foreach (var t in tests) sb.Append($"{t.TestCode}|{t.TestName}|{t.UpdatedAt:O};");
            foreach (var p in parameters) sb.Append($"{p.ParameterCode}|{p.ParameterName}|{p.UpdatedAt:O};");
            foreach (var m in mappings) sb.Append($"{m.PanelTestCode}|{m.ChildTestCode};");
            foreach (var s in specimens) sb.Append($"{s.SpecimenCode}|{s.SpecimenName}|{s.UpdatedAt:O};");
            foreach (var t in tubes) sb.Append($"{t.TubeCode}|{t.TubeName}|{t.UpdatedAt:O};");

            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()));
            return Convert.ToBase64String(bytes);
        }

        public async Task<CatalogProvisioningResultDto> ProvisionAsync(bool dryRun, string? expectedVersionHash = null)
        {
            var result = new CatalogProvisioningResultDto
            {
                ProvisionId = Guid.NewGuid(),
                IsDryRun = dryRun,
                VersionHash = await GetCatalogVersionHashAsync()
            };

            // Version Lock Check
            if (!dryRun && !string.IsNullOrEmpty(expectedVersionHash) && result.VersionHash != expectedVersionHash)
            {
                result.Status = "Conflict";
                result.ErrorMessage = "Catalog has changed since the preview was generated.";
                return result;
            }

            // Concurrency Lock
            CatalogProvisioningLock? lockEntry = null;
            if (!dryRun)
            {
                // Ensure the lock row exists (Bootstrap if empty)
                if (!await _context.CatalogProvisioningLocks.AnyAsync())
                {
                    try
                    {
                        // Set LockId = 0 so EF Core treats it as unset identity
                        var bootstrapLock = new CatalogProvisioningLock { LockId = 0, IsLocked = false };
                        _context.CatalogProvisioningLocks.Add(bootstrapLock);
                        await _context.SaveChangesAsync();
                    }
                    catch (Exception)
                    {
                        // Ignore potential race condition where another process inserted it simultaneously
                        _context.ChangeTracker.Clear();
                    }
                }

                // Atomic Lock Acquisition
                var rowsAffected = await _context.Database.ExecuteSqlRawAsync(@"
                    UPDATE CatalogProvisioningLocks
                    SET IsLocked = 1,
                        LockedAt = SYSUTCDATETIME()
                    WHERE LockId = 1
                    AND (
                        IsLocked = 0
                        OR LockedAt < DATEADD(MINUTE, -30, SYSUTCDATETIME())
                    )");

                if (rowsAffected == 0)
                {
                    result.Status = "Locked";
                    result.ErrorMessage = "Another provisioning process is currently running.";
                    return result;
                }

                // We need the lockEntry object for the finally block release
                lockEntry = await _context.CatalogProvisioningLocks.FirstAsync(l => l.LockId == 1);
            }

            var log = new CatalogProvisioningLog
            {
                ProvisionId = result.ProvisionId,
                StartedAt = DateTimeOffset.UtcNow,
                IsDryRun = dryRun,
                CatalogVersionHash = result.VersionHash,
                Status = "Pending"
            };
            _context.CatalogProvisioningLogs.Add(log);
            await _context.SaveChangesAsync();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var affectedTestCodes = await GetAffectedTestCodesAsync();
                result.AffectedTestCodes = affectedTestCodes;
                log.AffectedTestCodes = JsonSerializer.Serialize(affectedTestCodes);

                await ProvisionDepartmentsAsync(result);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Provisioning step completed: Departments");

                if (affectedTestCodes.Any())
                {
                    await ProvisionTestsAsync(affectedTestCodes, result);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Provisioning step completed: Tests");

                    await ProvisionParametersAsync(affectedTestCodes, result);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Provisioning step completed: Parameters");

                    await ProvisionReferenceRangesAsync(affectedTestCodes, result);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Provisioning step completed: Ranges");

                    await ProvisionPanelMappingsAsync(affectedTestCodes, result);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Provisioning step completed: Mappings");

                    await ProvisionPricingAsync(affectedTestCodes, result);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Provisioning step completed: Pricing");
                }

                log.TestsAffected = result.TestsAffected;
                log.ParametersAffected = result.ParametersAffected;
                log.MappingsAffected = result.MappingsAffected;
                log.PricingChanges = result.PricingChanges;
                log.Status = dryRun ? "DryRun" : "Success";
                log.CompletedAt = DateTimeOffset.UtcNow;

                if (dryRun)
                {
                    await transaction.RollbackAsync();
                }
                else
                {
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    _cacheService.InvalidateTestsCache();
                }

                result.Status = log.Status;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Provisioning failed for {Id}", result.ProvisionId);
                log.Status = "Failed";
                log.ErrorMessage = ex.Message;
                log.CompletedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();

                result.Status = "Failed";
                result.ErrorMessage = ex.Message;
            }
            finally
            {
                if (!dryRun && lockEntry != null)
                {
                    lockEntry.IsLocked = false;
                    await _context.SaveChangesAsync();
                }
            }

            return result;
        }

        private async Task<List<string>> GetAffectedTestCodesAsync()
        {
            var lastLog = await _context.CatalogProvisioningLogs
                .Where(l => !l.IsDryRun && l.Status == "Success")
                .OrderByDescending(l => l.CompletedAt)
                .FirstOrDefaultAsync();

            var T = lastLog?.StartedAt ?? DateTimeOffset.MinValue;

            var affectedFromTests = await _context.CatalogTests
                .Where(t => t.UpdatedAt > T)
                .Select(t => t.TestCode)
                .ToListAsync();

            var affectedFromParams = await _context.CatalogParameters
                .Where(p => p.UpdatedAt > T)
                .Select(p => p.TestCode)
                .ToListAsync();

            var mappingChanges = await _context.CatalogPanelMappings
                .Where(m => m.CreatedAt > T)
                .Select(m => new { m.PanelTestCode, m.ChildTestCode })
                .ToListAsync();

            var affectedFromMappings = mappingChanges
                .SelectMany(m => new[] { m.PanelTestCode, m.ChildTestCode })
                .ToList();

            var changedSpecs = await _context.CatalogSpecimenTypes
                .Where(s => s.UpdatedAt > T)
                .Select(s => s.SpecimenCode)
                .ToListAsync();

            var affectedFromSpecs = await _context.CatalogTests
                .Where(t => changedSpecs.Contains(t.SpecimenCode))
                .Select(t => t.TestCode)
                .ToListAsync();

            var changedTubes = await _context.CatalogTubeTypes
                .Where(tu => tu.UpdatedAt > T)
                .Select(tu => tu.TubeCode)
                .ToListAsync();

            var affectedFromTubes = await _context.CatalogTests
                .Where(t => changedTubes.Contains(t.TubeCode))
                .Select(t => t.TestCode)
                .ToListAsync();

            var changedDepts = await _context.CatalogProcessingDepartments
                .Where(d => d.UpdatedAt > T)
                .Select(d => d.DepartmentCode)
                .ToListAsync();

            var affectedFromDepts = await _context.CatalogTests
                .Where(t => changedDepts.Contains(t.DepartmentCode))
                .Select(t => t.TestCode)
                .ToListAsync();

            return affectedFromTests
                .Union(affectedFromParams)
                .Union(affectedFromMappings)
                .Union(affectedFromSpecs)
                .Union(affectedFromTubes)
                .Union(affectedFromDepts)
                .Distinct()
                .ToList();
        }

        private async Task ProvisionDepartmentsAsync(CatalogProvisioningResultDto result)
        {
            var catalogs = await _context.CatalogProcessingDepartments.ToListAsync();
            var masters = await _context.DepartmentMasters.ToListAsync();

            foreach (var catalog in catalogs)
            {
                var master = masters.FirstOrDefault(m => m.Code == catalog.DepartmentCode);
                if (master == null)
                {
                    master = new DepartmentMaster
                    {
                        DepartmentId = Guid.NewGuid(),
                        Code = catalog.DepartmentCode,
                        Name = catalog.DepartmentName,
                        MacroDepartment = catalog.ServiceCategoryCode,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    _context.DepartmentMasters.Add(master);
                }
                else
                {
                    master.Name = catalog.DepartmentName;
                    master.MacroDepartment = catalog.ServiceCategoryCode;
                    master.IsActive = true;
                }
            }
        }

        private async Task ProvisionTestsAsync(List<string> testCodes, CatalogProvisioningResultDto result)
        {
            var allTestCodes = await _context.CatalogTests.Select(c => c.TestCode).ToListAsync();
            
            var catalogs = await _context.CatalogTests
                .Where(c => allTestCodes.Contains(c.TestCode))
                .ToListAsync();

            var existingTests = await _context.Tests
                .Where(t => allTestCodes.Contains(t.TestCode))
                .ToListAsync();

            var depts = await _context.DepartmentMasters.ToListAsync();

            foreach (var code in allTestCodes)
            {
                var catalog = catalogs.FirstOrDefault(c => c.TestCode == code);
                var test = existingTests.FirstOrDefault(t => t.TestCode == code);

                if (catalog == null)
                {
                    if (test != null && test.IsActive)
                    {
                        test.IsActive = false;
                        test.UpdatedAt = DateTimeOffset.UtcNow;
                        result.TestsAffected++;
                    }
                    continue;
                }

                var dept = depts.FirstOrDefault(d => d.Code == catalog.DepartmentCode || d.Name == catalog.DepartmentCode);
                bool isRadiology = (dept != null && (string.Equals(dept.MacroDepartment, "Radiology", StringComparison.OrdinalIgnoreCase) || string.Equals(dept.Code, "RAD", StringComparison.OrdinalIgnoreCase)))
                                   || string.Equals(catalog.DepartmentCode, "RAD", StringComparison.OrdinalIgnoreCase)
                                   || string.Equals(catalog.DepartmentCode, "Radiology", StringComparison.OrdinalIgnoreCase);

                if (!isRadiology && (string.IsNullOrWhiteSpace(catalog.TubeCode) || string.IsNullOrWhiteSpace(catalog.SpecimenCode)))
                {
                    _logger.LogError("Catalog Validation Failed: Test {TestCode} is missing TubeCode or SpecimenCode. Import rejected.", 
                        catalog.TestCode);
                    throw new InvalidOperationException($"Catalog Validation Failed: Test '{catalog.TestCode}' must have both a TubeCode and SpecimenCode mapped.");
                }
                // -----------------------------------------------------------
                
                if (test == null)
                {
                    test = new Test
                    {
                        TestId = Guid.NewGuid(),
                        TestCode = catalog.TestCode,
                        TestName = catalog.TestName,
                        DepartmentId = dept?.DepartmentId,
                        SpecimenTypeCode = isRadiology && string.IsNullOrWhiteSpace(catalog.SpecimenCode) ? "NO_SPECIMEN" : catalog.SpecimenCode,
                        IsProfile = catalog.IsPanel,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    _context.Tests.Add(test);
                }
                else
                {
                    test.TestName = catalog.TestName;
                    test.DepartmentId = dept?.DepartmentId;
                    test.SpecimenTypeCode = isRadiology && string.IsNullOrWhiteSpace(catalog.SpecimenCode) ? "NO_SPECIMEN" : catalog.SpecimenCode;
                    test.IsProfile = catalog.IsPanel;
                    test.IsActive = true;
                    test.UpdatedAt = DateTimeOffset.UtcNow;
                }
                result.TestsAffected++;
            }
        }

        private async Task ProvisionParametersAsync(List<string> testCodes, CatalogProvisioningResultDto result)
        {
            var testIds = await _context.Tests
                .Where(t => testCodes.Contains(t.TestCode))
                .ToDictionaryAsync(t => t.TestCode, t => t.TestId);

            var catalogParams = await _context.CatalogParameters
                .Where(p => testCodes.Contains(p.TestCode))
                .ToListAsync();

            // Rule 1, 2, 5: 'existings' ONLY contains parameters loaded from the database, use AsNoTracking
            var existingValidationParams = await _context.Parameters
                .AsNoTracking()
                .Where(p => testIds.Values.Contains(p.TestId))
                .ToListAsync();

            // Load tracked items separately so we can update them without EF tracking confusion
            var trackedParams = await _context.Parameters
                .Where(p => testIds.Values.Contains(p.TestId))
                .ToListAsync();

            foreach (var testCode in testCodes)
            {
                if (!testIds.TryGetValue(testCode, out var testId)) continue;

                var catalogs = catalogParams.Where(cp => cp.TestCode == testCode).ToList();
                var existings = existingValidationParams.Where(ep => ep.TestId == testId).ToList();
                var trackings = trackedParams.Where(ep => ep.TestId == testId).ToList();

                foreach (var catalog in catalogs)
                {
                    var paramToUpdate = trackings.FirstOrDefault(p => p.ParameterCode == catalog.ParameterCode);
                    
                    if (paramToUpdate == null) // It's a new parameter locally
                    {
                        // Rule 3, 4: Only execute if conflicting parameter ACTUALLY exists in DB
                        if (existings.Any())
                        {
                            var nameMatch = existings.FirstOrDefault(p => p.ParameterName.Equals(catalog.ParameterName, StringComparison.OrdinalIgnoreCase));
                            if (nameMatch != null && nameMatch.ParameterCode != catalog.ParameterCode)
                            {
                                throw new InvalidOperationException($"Parameter Identity Violation: Parameter '{catalog.ParameterName}' for test '{testCode}' already exists with code '{nameMatch.ParameterCode}'. Catalog attempt to use '{catalog.ParameterCode}' rejected.");
                            }
                        }

                        paramToUpdate = new Parameter
                        {
                            ParameterId = Guid.NewGuid(),
                            TestId = testId,
                            ParameterCode = catalog.ParameterCode,
                            ParameterName = catalog.ParameterName,
                            Unit = catalog.Unit,
                            DataType = catalog.DataType,
                            SortOrder = catalog.SortOrder,
                            IsActive = true,
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        _context.Parameters.Add(paramToUpdate);
                    }
                    else
                    {
                        paramToUpdate.ParameterName = catalog.ParameterName;
                        paramToUpdate.Unit = catalog.Unit;
                        paramToUpdate.DataType = catalog.DataType;
                        paramToUpdate.SortOrder = catalog.SortOrder;
                        paramToUpdate.IsActive = true;
                        paramToUpdate.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                    result.ParametersAffected++;
                }

                // Deactivate missing
                foreach (var tracking in trackings)
                {
                    if (!catalogs.Any(c => c.ParameterCode == tracking.ParameterCode))
                    {
                        if (tracking.IsActive)
                        {
                            tracking.IsActive = false;
                            tracking.UpdatedAt = DateTimeOffset.UtcNow;
                            result.ParametersAffected++;
                        }
                    }
                }
            }
        }

        private async Task ProvisionReferenceRangesAsync(List<string> testCodes, CatalogProvisioningResultDto result)
        {
            var paramIds = await _context.Parameters
                .Where(p => testCodes.Contains(p.Test.TestCode))
                .Select(p => new { p.ParameterId, p.ParameterCode, p.Test.TestCode })
                .ToListAsync();

            var catalogParams = await _context.CatalogParameters
                .Where(p => testCodes.Contains(p.TestCode))
                .ToListAsync();

            var existingRanges = await _context.ReferenceRanges
                .Where(r => paramIds.Select(p => p.ParameterId).Contains(r.ParameterId))
                .ToListAsync();

            foreach (var pInfo in paramIds)
            {
                var catalog = catalogParams.FirstOrDefault(cp => cp.TestCode == pInfo.TestCode && cp.ParameterCode == pInfo.ParameterCode);
                if (catalog == null || string.IsNullOrWhiteSpace(catalog.ReferenceRange)) continue;

                var ranges = existingRanges.Where(r => r.ParameterId == pInfo.ParameterId).ToList();
                var defaultRange = ranges.FirstOrDefault(r => r.AgeGroup == "ALL" && r.Sex == "ALL");

                if (defaultRange == null)
                {
                    _context.ReferenceRanges.Add(new ReferenceRange
                    {
                        ReferenceRangeId = Guid.NewGuid(),
                        ParameterId = pInfo.ParameterId,
                        AgeGroup = "ALL",
                        Sex = "ALL",
                        TextRange = catalog.ReferenceRange,
                        EffectiveFrom = DateTime.UtcNow.Date,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    if (defaultRange.TextRange != catalog.ReferenceRange)
                    {
                        defaultRange.TextRange = catalog.ReferenceRange;
                        defaultRange.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
                // Note: Other ranges (pediatric, gender specific) are left untouched.
            }
        }

        private async Task ProvisionPanelMappingsAsync(List<string> testCodes, CatalogProvisioningResultDto result)
        {
            var testIds = await _context.Tests
                .Where(t => testCodes.Contains(t.TestCode))
                .ToDictionaryAsync(t => t.TestCode, t => t.TestId);

            var catalogMappings = await _context.CatalogPanelMappings
                .Where(m => testCodes.Contains(m.PanelTestCode))
                .ToListAsync();

            var existingMappings = await _context.ProfileMaps
                .Where(m => testIds.Values.Contains(m.ParentTestId))
                .ToListAsync();

            foreach (var panelCode in testCodes)
            {
                if (!testIds.TryGetValue(panelCode, out var parentId)) continue;

                var catalogs = catalogMappings.Where(m => m.PanelTestCode == panelCode).ToList();
                var existings = existingMappings.Where(m => m.ParentTestId == parentId).ToList();

                foreach (var catalog in catalogs)
                {
                    if (!testIds.TryGetValue(catalog.ChildTestCode, out var childId))
                    {
                        // Fallback: Check DB if child isn't in current delta set
                        childId = await _context.Tests
                            .Where(t => t.TestCode == catalog.ChildTestCode)
                            .Select(t => t.TestId)
                            .FirstOrDefaultAsync();
                        
                        if (childId == Guid.Empty) continue;
                    }

                    var mapping = existings.FirstOrDefault(m => m.ChildTestId == childId);
                    if (mapping == null)
                    {
                        _context.ProfileMaps.Add(new ProfileMap
                        {
                            ProfileMapId = Guid.NewGuid(),
                            ParentTestId = parentId,
                            ChildTestId = childId,
                            Sequence = catalog.SortOrder
                        });
                        result.MappingsAffected++;
                    }
                    else if (mapping.Sequence != catalog.SortOrder)
                    {
                        mapping.Sequence = catalog.SortOrder;
                        result.MappingsAffected++;
                    }
                }
                // Note: Existing manual mappings are NEVER deleted (Add/Update Only rule).
            }
        }

        private async Task ProvisionPricingAsync(List<string> testCodes, CatalogProvisioningResultDto result)
        {
            var testInfos = await _context.Tests
                .Where(t => testCodes.Contains(t.TestCode))
                .Include(t => t.TestPricings)
                .ToListAsync();

            var catalogTests = await _context.CatalogTests
                .Where(c => testCodes.Contains(c.TestCode))
                .ToListAsync();

            foreach (var testCode in testCodes)
            {
                var catalog = catalogTests.FirstOrDefault(c => c.TestCode == testCode);
                var test = testInfos.FirstOrDefault(t => t.TestCode == testCode);

                if (catalog == null || test == null) continue;

                // Find currently active price
                var activePrice = test.TestPricings
                    .Where(p => p.EffectiveFrom <= DateTime.UtcNow && (p.EffectiveTo == null || p.EffectiveTo >= DateTime.UtcNow))
                    .OrderByDescending(p => p.EffectiveFrom)
                    .FirstOrDefault();

                if (activePrice != null && activePrice.BasePrice == catalog.Price)
                {
                    continue; // No change
                }

                // Close out old price rules (Single Active Price policy)
                var now = DateTimeOffset.UtcNow;
                foreach (var oldPrice in test.TestPricings.Where(p => p.EffectiveTo == null || p.EffectiveTo > now.DateTime))
                {
                    oldPrice.EffectiveTo = now.DateTime;
                }

                _context.TestPricings.Add(new TestPricing
                {
                    PricingId = Guid.NewGuid(),
                    TestId = test.TestId,
                    BasePrice = catalog.Price,
                    EffectiveFrom = now.DateTime,
                    CreatedAt = now
                });
                result.PricingChanges++;
            }
        }
    }
}
