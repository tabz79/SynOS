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

            var headerMap = GetHeaderMap(sheet);
            Console.WriteLine($"[Import] ServiceCategories Header Map: {string.Join(", ", headerMap.Select(kv => $"{kv.Key}:{kv.Value}"))}");

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, headerMap, "Code")?.ToUpperInvariant();
                var name = GetCellValue(row, headerMap, "Name");

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

            var headerMap = GetHeaderMap(sheet);
            Console.WriteLine($"[Import] ProcessingDepartments Header Map: {string.Join(", ", headerMap.Select(kv => $"{kv.Key}:{kv.Value}"))}");

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, headerMap, "Code")?.ToUpperInvariant();
                var name = GetCellValue(row, headerMap, "Name");
                var categoryCode = GetCellValue(row, headerMap, "CategoryCode")?.ToUpperInvariant();
                var requiresSpecimenString = GetCellValue(row, headerMap, "RequiresSpecimen")?.ToLowerInvariant();

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

            var headerMap = GetHeaderMap(sheet);
            Console.WriteLine($"[Import] SpecimenTypes Header Map: {string.Join(", ", headerMap.Select(kv => $"{kv.Key}:{kv.Value}"))}");

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, headerMap, "Code")?.ToUpperInvariant();
                var name = GetCellValue(row, headerMap, "Name");

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

            var headerMap = GetHeaderMap(sheet);
            Console.WriteLine($"[Import] TubeTypes Header Map: {string.Join(", ", headerMap.Select(kv => $"{kv.Key}:{kv.Value}"))}");

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, headerMap, "Code")?.ToUpperInvariant();
                var name = GetCellValue(row, headerMap, "Name");
                var color = GetCellValue(row, headerMap, "Color");

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

            var headerMap = GetHeaderMap(sheet);
            Console.WriteLine($"[Import] Tests Header Map: {string.Join(", ", headerMap.Select(kv => $"{kv.Key}:{kv.Value}"))}");

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var code = GetCellValue(row, headerMap, "Code")?.ToUpperInvariant();
                var name = GetCellValue(row, headerMap, "Name");
                var deptCode = GetCellValue(row, headerMap, "DepartmentCode")?.ToUpperInvariant();
                var specCode = GetCellValue(row, headerMap, "SpecimenCode")?.ToUpperInvariant();
                var tubeCode = GetCellValue(row, headerMap, "TubeCode")?.ToUpperInvariant();
                var priceString = GetCellValue(row, headerMap, "Price");
                var isPanelString = GetCellValue(row, headerMap, "IsPanel")?.ToLowerInvariant();

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

            var headerMap = GetHeaderMap(sheet);
            Console.WriteLine($"[Import] PanelMappings Header Map: {string.Join(", ", headerMap.Select(kv => $"{kv.Key}:{kv.Value}"))}");

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var panelCode = GetCellValue(row, headerMap, "PanelCode")?.ToUpperInvariant();
                var childCode = GetCellValue(row, headerMap, "ChildCode")?.ToUpperInvariant();
                var sortOrderString = GetCellValue(row, headerMap, "SortOrder");

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

            var headerMap = GetHeaderMap(sheet);
            Console.WriteLine($"[Import] Parameters Header Map: {string.Join(", ", headerMap.Select(kv => $"{kv.Key}:{kv.Value}"))}");

            // Tracking for SortOrder increment
            var testParamSortCounters = new Dictionary<string, int>();

            var rows = sheet.RangeUsed().RowsUsed().Skip(1);
            foreach (IXLRangeRow row in rows)
            {
                var testCode = GetCellValue(row, headerMap, "TestCode")?.ToUpperInvariant();
                var paramCode = GetCellValue(row, headerMap, "ParamCode")?.ToUpperInvariant();
                var paramName = GetCellValue(row, headerMap, "ParamName");
                
                // Fallbacks and specific logic
                var dataType = GetCellValue(row, headerMap, "DataType") ?? "Numeric";
                var unit = GetCellValue(row, headerMap, "Unit");
                var range = GetCellValue(row, headerMap, "Range");
                var sortOrderString = GetCellValue(row, headerMap, "SortOrder");
                var isReqString = GetCellValue(row, headerMap, "IsRequired")?.ToLowerInvariant();
                var enumOptions = GetCellValue(row, headerMap, "EnumOptions");
                
                // Extended Metadata
                var printName = GetCellValue(row, headerMap, "PrintName");
                var methodology = GetCellValue(row, headerMap, "Methodology");
                var displayGroup = GetCellValue(row, headerMap, "DisplayGroup");
                var displayGroupOrderString = GetCellValue(row, headerMap, "DisplayGroupOrder");
                var isCalculatedString = GetCellValue(row, headerMap, "IsCalculated")?.ToLowerInvariant();
                var decimalPlacesString = GetCellValue(row, headerMap, "DecimalPlaces");
                var rawFormula = GetCellValue(row, headerMap, "Formula");
                // Normalize formula: Uppercase and remove all internal whitespace for consistent lookup
                var formula = rawFormula?.ToUpperInvariant()?.Replace(" ", "");

                // Strict Validation for Required Fields
                if (string.IsNullOrWhiteSpace(testCode)) continue;
                if (string.IsNullOrWhiteSpace(paramCode) || string.IsNullOrWhiteSpace(paramName))
                {
                    result.RowLevelErrors.Add(new RowLevelError { SheetName = "Parameters", RowNumber = row.RowNumber(), ErrorMessage = "Missing required fields: ParamCode or ParamName" });
                    continue;
                }

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

                int displayGroupOrder = 0;
                int.TryParse(displayGroupOrderString, out displayGroupOrder);

                int decimalPlaces = 2;
                int.TryParse(decimalPlacesString, out decimalPlaces);

                bool isCalculated = isCalculatedString == "true" || isCalculatedString == "1" || isCalculatedString == "yes";

                int sortOrder;
                if (int.TryParse(sortOrderString, out sortOrder))
                {
                    testParamSortCounters[testCode] = sortOrder;
                }
                else
                {
                    if (!testParamSortCounters.ContainsKey(testCode)) testParamSortCounters[testCode] = 1;
                    else testParamSortCounters[testCode]++;
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
                    existing.Formula = formula;
                    
                    // Meta updates (Defensive: only update if provided in Excel)
                    if (!string.IsNullOrWhiteSpace(printName)) existing.PrintName = printName;
                    
                    // Specific fix: Prevent "TRUE"/"FALSE" leakage into methodology (likely old alignment issue)
                    if (!string.IsNullOrWhiteSpace(methodology) && 
                        !methodology.Equals("true", StringComparison.OrdinalIgnoreCase) && 
                        !methodology.Equals("false", StringComparison.OrdinalIgnoreCase))
                    {
                        existing.Methodology = methodology;
                    }
                    else if (methodology == null && (existing.Methodology == "TRUE" || existing.Methodology == "FALSE"))
                    {
                        // Clean up existing corruption if column is missing
                        existing.Methodology = null;
                    }

                    if (!string.IsNullOrWhiteSpace(displayGroup)) existing.DisplayGroup = displayGroup;
                    if (!string.IsNullOrWhiteSpace(displayGroupOrderString)) existing.DisplayGroupOrder = displayGroupOrder;
                    if (!string.IsNullOrWhiteSpace(isCalculatedString)) existing.IsCalculated = isCalculated;
                    if (!string.IsNullOrWhiteSpace(decimalPlacesString)) existing.DecimalPlaces = decimalPlaces;
                    
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
                        Formula = formula,
                        PrintName = printName,
                        // Specific fix: Prevent "TRUE"/"FALSE" leakage into methodology
                        Methodology = (!string.IsNullOrWhiteSpace(methodology) && 
                                     !methodology.Equals("true", StringComparison.OrdinalIgnoreCase) && 
                                     !methodology.Equals("false", StringComparison.OrdinalIgnoreCase)) 
                                     ? methodology : null,
                        DisplayGroup = displayGroup,
                        DisplayGroupOrder = displayGroupOrder,
                        IsCalculated = isCalculated,
                        DecimalPlaces = decimalPlaces,
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

            // Post-Process Validation for Formulas (Dependency Check)
            var allAvailableParamCodes = new HashSet<string>(cache.Keys.Select(k => k.Item2), StringComparer.OrdinalIgnoreCase);

            foreach (var param in cache.Values.Where(p => p.IsCalculated && !string.IsNullOrWhiteSpace(p.Formula)))
            {
                var tokens = System.Text.RegularExpressions.Regex.Matches(param.Formula.ToUpperInvariant(), @"[A-Z0-9_]+")
                    .Cast<System.Text.RegularExpressions.Match>()
                    .Select(m => m.Value)
                    .Where(val => !decimal.TryParse(val, out _)) // Exclude numeric constants
                    .ToList();

                foreach (var token in tokens)
                {
                    // GPT-5 Safeguard 1: Self-reference check (e.g., GLOB = TP - GLOB)
                    if (token == param.ParameterCode)
                    {
                        result.RowLevelErrors.Add(new RowLevelError 
                        { 
                            SheetName = "Parameters", 
                            RowNumber = 0,
                            ErrorMessage = $"Formula validation failed for '{param.ParameterCode}' in test '{param.TestCode}'. Self-reference is not allowed." 
                        });
                        continue;
                    }

                    // GPT-5 Safeguard 2: Panel existence check (Broadened to include all parameters in batch)
                    if (!allAvailableParamCodes.Contains(token))
                    {
                        result.RowLevelErrors.Add(new RowLevelError 
                        { 
                            SheetName = "Parameters", 
                            RowNumber = 0, 
                            ErrorMessage = $"Formula validation failed for '{param.ParameterCode}' in test '{param.TestCode}'. Referenced parameter '{token}' does not exist in this test panel or catalog." 
                        });
                    }
                }
            }
        }

        private Dictionary<string, int> GetHeaderMap(IXLWorksheet sheet)
        {
            var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var headerRow = sheet.Row(1);
            var lastCol = sheet.LastColumnUsed()?.ColumnNumber() ?? 0;

            for (int i = 1; i <= lastCol; i++)
            {
                var cellValue = headerRow.Cell(i).GetValue<string>()?.Trim();
                if (!string.IsNullOrWhiteSpace(cellValue))
                {
                    // Normalize: remove internal spaces and hidden characters
                    var normalized = System.Text.RegularExpressions.Regex.Replace(cellValue, @"\s+", "");
                    map[normalized] = i;
                }
            }
            return map;
        }

        private string? GetCellValue(IXLRangeRow row, Dictionary<string, int> map, string header)
        {
            if (map.TryGetValue(header, out int colIndex))
            {
                var cell = row.Cell(colIndex);
                if (cell.IsEmpty()) return null;
                return cell.GetValue<string>()?.Trim();
            }
            return null;
        }
    }
}
