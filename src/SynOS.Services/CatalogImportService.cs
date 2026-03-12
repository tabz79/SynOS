using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities.Catalog;
using Microsoft.EntityFrameworkCore.Storage;

namespace SynOS.Services
{
    public class CatalogImportService : ICatalogImportService
    {
        private readonly SynOSDbContext _context;

        public CatalogImportService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<CatalogImportResultDto> ImportCatalogAsync(IFormFile file, Guid actorUserId, bool validateOnly, CancellationToken cancellationToken)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File is empty");

            using var stream = file.OpenReadStream();
            return await ImportCatalogAsync(stream, actorUserId, validateOnly, cancellationToken);
        }

        public async Task<CatalogImportResultDto> ImportCatalogAsync(Stream fileStream, Guid actorUserId, bool validateOnly, CancellationToken cancellationToken)
        {
            var result = new CatalogImportResultDto { Success = true };

            using var workbook = new XLWorkbook(fileStream);

            // 1. Setup Transaction
            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 2. Pre-cache existing entities
                var serviceCategories = await _context.CatalogServiceCategories.ToDictionaryAsync(x => x.ServiceCategoryCode.Trim().ToUpperInvariant(), x => x, cancellationToken);
                var departments = await _context.CatalogProcessingDepartments.ToDictionaryAsync(x => x.DepartmentCode.Trim().ToUpperInvariant(), x => x, cancellationToken);
                var specimenTypes = await _context.CatalogSpecimenTypes.ToDictionaryAsync(x => x.SpecimenCode.Trim().ToUpperInvariant(), x => x, cancellationToken);
                var tubeTypes = await _context.CatalogTubeTypes.ToDictionaryAsync(x => x.TubeCode.Trim().ToUpperInvariant(), x => x, cancellationToken);
                var tests = await _context.CatalogTests.ToDictionaryAsync(x => x.TestCode.Trim().ToUpperInvariant(), x => x, cancellationToken);
                var parameters = await _context.CatalogParameters.ToDictionaryAsync(x => (x.TestCode.Trim().ToUpperInvariant(), x.ParameterCode.Trim().ToUpperInvariant()), x => x, cancellationToken);

                // 3. Process Sheets in Order
                ProcessServiceCategories(workbook, serviceCategories, result);
                ProcessProcessingDepartments(workbook, departments, serviceCategories, result);
                ProcessSpecimenTypes(workbook, specimenTypes, result);
                ProcessTubeTypes(workbook, tubeTypes, result);
                ProcessTests(workbook, tests, departments, specimenTypes, tubeTypes, result);
                ProcessPanelMappings(workbook, tests, result);
                ProcessParameters(workbook, parameters, tests, result);

                if (result.RowLevelErrors.Any())
                {
                    result.Success = false;
                    result.ErrorCount = result.RowLevelErrors.Count;
                    await transaction.RollbackAsync(cancellationToken);
                    return result;
                }

                // 4. Commit or Rollback
                if (validateOnly)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    result.Success = true; // Validation was successful
                }
                else
                {
                    await _context.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                    result.Success = true;
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                result.Success = false;
                result.GlobalErrors.Add($"Critical error during import: {ex.Message}");
            }

            return result;
        }

        private void ProcessServiceCategories(XLWorkbook workbook, Dictionary<string, CatalogServiceCategory> cache, CatalogImportResultDto result)
        {
            var sheet = workbook.Worksheets.FirstOrDefault(ws => ws.Name == "ServiceCategories");
            if (sheet == null) return;

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, 1)?.Trim().ToUpperInvariant();
                var name = GetCellValue(row, 2)?.Trim();

                if (string.IsNullOrWhiteSpace(code)) continue;

                if (cache.TryGetValue(code, out var existing))
                {
                    if (existing.ServiceCategoryName != name)
                    {
                        existing.ServiceCategoryName = name ?? existing.ServiceCategoryName;
                        existing.UpdatedAt = DateTimeOffset.UtcNow;
                        result.UpdatedCount++;
                    }
                }
                else
                {
                    var entity = new CatalogServiceCategory
                    {
                        ServiceCategoryCode = code,
                        ServiceCategoryName = name ?? code,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogServiceCategories.Add(entity);
                    cache[code] = entity;
                    result.NewInsertedCount++;
                }
                result.SuccessCount++;
            }
        }

        private void ProcessProcessingDepartments(XLWorkbook workbook, Dictionary<string, CatalogProcessingDepartment> cache, Dictionary<string, CatalogServiceCategory> categoryCache, CatalogImportResultDto result)
        {
            var sheet = workbook.Worksheets.FirstOrDefault(ws => ws.Name == "ProcessingDepartments");
            if (sheet == null) return;

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, 1)?.Trim().ToUpperInvariant();
                var name = GetCellValue(row, 2)?.Trim();
                var categoryCode = GetCellValue(row, 3)?.Trim().ToUpperInvariant();
                var requiresSpecimenString = GetCellValue(row, 4)?.Trim().ToLowerInvariant();

                if (string.IsNullOrWhiteSpace(code)) continue;

                if (!string.IsNullOrWhiteSpace(categoryCode) && !categoryCache.ContainsKey(categoryCode))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "ProcessingDepartments", RowNumber = row.RowNumber(), ErrorMessage = $"Unknown ServiceCategoryCode: {categoryCode}" });
                    continue;
                }

                bool requiresSpecimen = requiresSpecimenString == "true" || requiresSpecimenString == "1" || string.IsNullOrWhiteSpace(requiresSpecimenString);

                if (cache.TryGetValue(code, out var existing))
                {
                    existing.DepartmentName = name ?? existing.DepartmentName;
                    existing.ServiceCategoryCode = categoryCode ?? existing.ServiceCategoryCode;
                    existing.RequiresSpecimen = requiresSpecimen;
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                    result.UpdatedCount++;
                }
                else
                {
                    var entity = new CatalogProcessingDepartment
                    {
                        DepartmentCode = code,
                        DepartmentName = name ?? code,
                        ServiceCategoryCode = categoryCode ?? "LAB",
                        RequiresSpecimen = requiresSpecimen,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogProcessingDepartments.Add(entity);
                    cache[code] = entity;
                    result.NewInsertedCount++;
                }
                result.SuccessCount++;
            }
        }

        private void ProcessSpecimenTypes(XLWorkbook workbook, Dictionary<string, CatalogSpecimenType> cache, CatalogImportResultDto result)
        {
            var sheet = workbook.Worksheets.FirstOrDefault(ws => ws.Name == "SpecimenTypes");
            if (sheet == null) return;

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, 1)?.Trim().ToUpperInvariant();
                var name = GetCellValue(row, 2)?.Trim();

                if (string.IsNullOrWhiteSpace(code)) continue;

                if (cache.TryGetValue(code, out var existing))
                {
                    existing.SpecimenName = name ?? existing.SpecimenName;
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                    result.UpdatedCount++;
                }
                else
                {
                    var entity = new CatalogSpecimenType
                    {
                        SpecimenCode = code,
                        SpecimenName = name ?? code,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogSpecimenTypes.Add(entity);
                    cache[code] = entity;
                    result.NewInsertedCount++;
                }
                result.SuccessCount++;
            }
        }

        private void ProcessTubeTypes(XLWorkbook workbook, Dictionary<string, CatalogTubeType> cache, CatalogImportResultDto result)
        {
            var sheet = workbook.Worksheets.FirstOrDefault(ws => ws.Name == "TubeTypes");
            if (sheet == null) return;

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, 1)?.Trim().ToUpperInvariant();
                var name = GetCellValue(row, 2)?.Trim();
                var color = GetCellValue(row, 3)?.Trim();

                if (string.IsNullOrWhiteSpace(code)) continue;

                if (cache.TryGetValue(code, out var existing))
                {
                    existing.TubeName = name ?? existing.TubeName;
                    existing.Color = color ?? existing.Color;
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                    result.UpdatedCount++;
                }
                else
                {
                    var entity = new CatalogTubeType
                    {
                        TubeCode = code,
                        TubeName = name ?? code,
                        Color = color,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogTubeTypes.Add(entity);
                    cache[code] = entity;
                    result.NewInsertedCount++;
                }
                result.SuccessCount++;
            }
        }

        private void ProcessTests(XLWorkbook workbook, Dictionary<string, CatalogTest> cache, Dictionary<string, CatalogProcessingDepartment> deptCache, Dictionary<string, CatalogSpecimenType> specCache, Dictionary<string, CatalogTubeType> tubeCache, CatalogImportResultDto result)
        {
            var sheet = workbook.Worksheets.FirstOrDefault(ws => ws.Name == "Tests");
            if (sheet == null) return;

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, 1)?.Trim().ToUpperInvariant();
                var name = GetCellValue(row, 2)?.Trim();
                var deptCode = GetCellValue(row, 3)?.Trim().ToUpperInvariant();
                var specCode = GetCellValue(row, 4)?.Trim().ToUpperInvariant();
                var tubeCode = GetCellValue(row, 5)?.Trim().ToUpperInvariant();
                var priceString = GetCellValue(row, 6)?.Trim();
                var isPanelString = GetCellValue(row, 7)?.Trim().ToLowerInvariant();

                if (string.IsNullOrWhiteSpace(code)) continue;

                // Validation
                if (string.IsNullOrWhiteSpace(deptCode) || !deptCache.ContainsKey(deptCode))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "Tests", RowNumber = row.RowNumber(), ErrorMessage = $"Unknown or missing DepartmentCode: {deptCode}" });
                    continue;
                }
                if (!string.IsNullOrWhiteSpace(specCode) && !specCache.ContainsKey(specCode))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "Tests", RowNumber = row.RowNumber(), ErrorMessage = $"Unknown SpecimenCode: {specCode}" });
                    continue;
                }
                if (!string.IsNullOrWhiteSpace(tubeCode) && !tubeCache.ContainsKey(tubeCode))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "Tests", RowNumber = row.RowNumber(), ErrorMessage = $"Unknown TubeCode: {tubeCode}" });
                    continue;
                }

                decimal price = 0;
                decimal.TryParse(priceString, out price);
                bool isPanel = isPanelString == "true" || isPanelString == "1";

                if (cache.TryGetValue(code, out var existing))
                {
                    existing.TestName = name ?? existing.TestName;
                    existing.DepartmentCode = deptCode;
                    existing.SpecimenCode = specCode;
                    existing.TubeCode = tubeCode;
                    existing.Price = price;
                    existing.IsPanel = isPanel;
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                    result.UpdatedCount++;
                }
                else
                {
                    var entity = new CatalogTest
                    {
                        TestCode = code,
                        TestName = name ?? code,
                        DepartmentCode = deptCode,
                        SpecimenCode = specCode,
                        TubeCode = tubeCode,
                        Price = price,
                        IsPanel = isPanel,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogTests.Add(entity);
                    cache[code] = entity;
                    result.NewInsertedCount++;
                }
                result.SuccessCount++;
            }
        }

        private void ProcessPanelMappings(XLWorkbook workbook, Dictionary<string, CatalogTest> testCache, CatalogImportResultDto result)
        {
            var sheet = workbook.Worksheets.FirstOrDefault(ws => ws.Name == "PanelMappings");
            if (sheet == null) return;

            // Clear existing mappings in memory (since we are using a transaction and starting from scratch for this sheet)
            // Note: In a production scenario, you might want to only delete what changed, but for catalog import, we often overwrite.
            // As per instructions, "Do not delete existing rows." - wait, that's for other tables. 
            // For PanelMappings, if they are uniquely defined in Excel, we might want to ensure they exist.
            
            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var panelCode = GetCellValue(row, 1)?.Trim().ToUpperInvariant();
                var childCode = GetCellValue(row, 2)?.Trim().ToUpperInvariant();
                var sortOrderString = GetCellValue(row, 3)?.Trim();

                if (string.IsNullOrWhiteSpace(panelCode) || string.IsNullOrWhiteSpace(childCode)) continue;

                // Validation
                if (!testCache.TryGetValue(panelCode, out var panelTest))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "PanelMappings", RowNumber = row.RowNumber(), ErrorMessage = $"Unknown PanelCode: {panelCode}" });
                    continue;
                }
                if (!panelTest.IsPanel)
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "PanelMappings", RowNumber = row.RowNumber(), ErrorMessage = $"Test {panelCode} is NOT marked as IsPanel." });
                    continue;
                }
                if (!testCache.ContainsKey(childCode))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "PanelMappings", RowNumber = row.RowNumber(), ErrorMessage = $"Unknown ChildTestCode: {childCode}" });
                    continue;
                }

                int sortOrder = 1;
                int.TryParse(sortOrderString, out sortOrder);

                // For simplicity, we Check if mapping exists in DB or was added in this batch.
                // Since PanelMappings don't have a unique natural key other than (Panel, Child), we check for existence.
                var existing = _context.CatalogPanelMappings.Local.FirstOrDefault(m => m.PanelTestCode == panelCode && m.ChildTestCode == childCode)
                               ?? _context.CatalogPanelMappings.FirstOrDefault(m => m.PanelTestCode == panelCode && m.ChildTestCode == childCode);

                if (existing == null)
                {
                    var entity = new CatalogPanelMapping
                    {
                        Id = Guid.NewGuid(),
                        PanelTestCode = panelCode,
                        ChildTestCode = childCode,
                        SortOrder = sortOrder,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogPanelMappings.Add(entity);
                    result.NewInsertedCount++;
                }
                else
                {
                    existing.SortOrder = sortOrder;
                    result.UpdatedCount++;
                }
                result.SuccessCount++;
            }
        }

        private void ProcessParameters(XLWorkbook workbook, Dictionary<(string, string), CatalogParameter> cache, Dictionary<string, CatalogTest> testCache, CatalogImportResultDto result)
        {
            var sheet = workbook.Worksheets.FirstOrDefault(ws => ws.Name == "Parameters");
            if (sheet == null) return;

            // Tracking for SortOrder increment
            var testParamSortCounters = new Dictionary<string, int>();

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var testCode = GetCellValue(row, 1)?.Trim().ToUpperInvariant();
                var paramCode = GetCellValue(row, 2)?.Trim().ToUpperInvariant();
                var paramName = GetCellValue(row, 3)?.Trim();
                var dataType = GetCellValue(row, 4)?.Trim() ?? "Numeric";
                var unit = GetCellValue(row, 5)?.Trim();
                var range = GetCellValue(row, 6)?.Trim();
                var sortOrderString = GetCellValue(row, 7)?.Trim();
                var isReqString = GetCellValue(row, 8)?.Trim().ToLowerInvariant();
                var enumOptions = GetCellValue(row, 9)?.Trim();

                if (string.IsNullOrWhiteSpace(testCode) || string.IsNullOrWhiteSpace(paramCode)) continue;

                // Validation
                if (!testCache.ContainsKey(testCode))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "Parameters", RowNumber = row.RowNumber(), ErrorMessage = $"Unknown TestCode: {testCode}" });
                    continue;
                }

                if (dataType.Equals("Enum", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(enumOptions))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "Parameters", RowNumber = row.RowNumber(), ErrorMessage = $"Parameter '{paramCode}' in test '{testCode}' is of type Enum but EnumOptions is empty." });
                    continue;
                }

                int sortOrder;
                if (int.TryParse(sortOrderString, out sortOrder))
                {
                    testParamSortCounters[testCode] = sortOrder;
                }
                else
                {
                    // Incremental SortOrder
                    if (!testParamSortCounters.ContainsKey(testCode))
                    {
                        // Get max sort order for this test from cache or DB? 
                        // For simplicity, we manage it in this import session.
                        testParamSortCounters[testCode] = 1;
                    }
                    else
                    {
                        testParamSortCounters[testCode]++;
                    }
                    sortOrder = testParamSortCounters[testCode];
                }

                bool isRequired = isReqString != "false" && isReqString != "0";

                if (cache.TryGetValue((testCode!, paramCode!), out var existing))
                {
                    existing.ParameterName = paramName ?? existing.ParameterName;
                    existing.DataType = dataType;
                    existing.Unit = unit;
                    existing.ReferenceRange = range;
                    existing.SortOrder = sortOrder;
                    existing.IsRequired = isRequired;
                    existing.EnumOptions = enumOptions;
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                    result.UpdatedCount++;
                }
                else
                {
                    var entity = new CatalogParameter
                    {
                        Id = Guid.NewGuid(),
                        TestCode = testCode,
                        ParameterCode = paramCode,
                        ParameterName = paramName ?? paramCode,
                        DataType = dataType,
                        Unit = unit,
                        ReferenceRange = range,
                        SortOrder = sortOrder,
                        IsRequired = isRequired,
                        EnumOptions = enumOptions,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.CatalogParameters.Add(entity);
                    cache[(testCode!, paramCode!)] = entity;
                    result.NewInsertedCount++;
                }
                result.SuccessCount++;
            }
        }

        private string? GetCellValue(IXLRangeRow row, int column)
        {
            var cell = row.Cell(column);
            if (cell.IsEmpty()) return null;
            return cell.GetValue<string>();
        }
    }
}
