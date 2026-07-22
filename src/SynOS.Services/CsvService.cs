using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities;
using SynOS.Models.Entities.IMS;
using ClosedXML.Excel; // Added
using System.Text.RegularExpressions;

namespace SynOS.Services
{
    public class CsvService : ICsvService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditService _auditService;
        private readonly ITestsCacheService _testsCacheService;

        public CsvService(
            SynOSDbContext context,
            IMapper mapper,
            IAuditService auditService,
            ITestsCacheService testsCacheService)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
            _testsCacheService = testsCacheService;
        }

        public Task<byte[]> GetTemplateCsvBytesAsync()
        {
            var headers = "TestCode,TestName,Department,Category,BasePrice,TAT_Hours,ParameterCode,ParameterName,Unit,DataType,SortOrder,RefLow,RefHigh,CriticalLow,CriticalHigh,AgeGroup,Sex,Price_DiscountPercent,Price_ReferrerRatePercent,Price_EffectiveFrom,Price_EffectiveTo,Price_IsActive";
            var sampleRow = "LIPID,Lipid Profile,Pathology,Biochemistry,600,24,CHOL,Cholesterol,mg/dL,Numeric,1,120,200,0,0,ADULT,ALL,0,100,2025-12-11,,1";
            var content = $"{headers}{Environment.NewLine}{sampleRow}";
            return Task.FromResult(Encoding.UTF8.GetBytes(content));
        }

        public async Task<byte[]> ExportTestsToCsvAsync()
        {
            var tests = await _context.Tests
                .Include(t => t.Parameters)
                .ThenInclude(p => p.ReferenceRanges)
                .Include(t => t.PriceConfigs)
                .Include(t => t.DepartmentMaster)
                .Include(t => t.TestPricings)
                .AsNoTracking()
                .ToListAsync();

            using var memoryStream = new MemoryStream();
            using (var writer = new StreamWriter(memoryStream, Encoding.UTF8, 1024, leaveOpen: true))
            using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
            {
                csv.WriteHeader<CsvTestRecord>();
                csv.NextRecord();

                foreach (var test in tests)
                {
                    // Resolve Price
                    var activePrice = test.TestPricings?
                        .Where(tp => tp.EffectiveFrom <= DateTime.UtcNow)
                        .OrderByDescending(tp => tp.EffectiveFrom)
                        .FirstOrDefault()?.BasePrice ?? 0;

                    // Resolve Department
                    var deptName = test.DepartmentMaster?.Name ?? "Unknown";

                    if (test.Parameters != null && test.Parameters.Any())
                    {
                        foreach (var parameter in test.Parameters)
                        {
                            if (parameter.ReferenceRanges != null && parameter.ReferenceRanges.Any())
                            {
                                foreach (var range in parameter.ReferenceRanges)
                                {
                                    var record = new CsvTestRecord
                                    {
                                        TestCode = test.TestCode,
                                        TestName = test.TestName,
                                        Department = deptName,
                                        Category = test.Category,
                                        BasePrice = activePrice, 
                                        TAT_Hours = test.TAT_Hours,
                                        ParameterCode = parameter.ParameterCode,
                                        ParameterName = parameter.ParameterName,
                                        Unit = parameter.Unit,
                                        DataType = parameter.DataType,
                                        SortOrder = parameter.SortOrder,
                                        RefLow = range.RefLow,
                                        RefHigh = range.RefHigh,
                                        CriticalLow = range.CriticalLow,
                                        CriticalHigh = range.CriticalHigh,
                                        AgeGroup = range.AgeGroup,
                                        AgeMin = range.AgeMin,
                                        AgeMax = range.AgeMax,
                                        Sex = range.Sex,
                                        TextRange = range.TextRange,
                                        EffectiveFrom = range.EffectiveFrom.ToString("yyyy-MM-dd")
                                    };
                                    csv.WriteRecord(record);
                                    csv.NextRecord();
                                }
                            }
                            else
                            {
                                var record = new CsvTestRecord
                                {
                                    TestCode = test.TestCode,
                                    TestName = test.TestName,
                                    Department = deptName,
                                    Category = test.Category,
                                    BasePrice = activePrice,
                                    TAT_Hours = test.TAT_Hours,
                                    ParameterCode = parameter.ParameterCode,
                                    ParameterName = parameter.ParameterName,
                                    Unit = parameter.Unit,
                                    DataType = parameter.DataType,
                                    SortOrder = parameter.SortOrder
                                };
                                csv.WriteRecord(record);
                                csv.NextRecord();
                            }
                        }
                    }
                    else
                    {
                        // test without parameters
                        var record = new CsvTestRecord
                        {
                            TestCode = test.TestCode,
                            TestName = test.TestName,
                            Department = deptName,
                            Category = test.Category,
                            BasePrice = activePrice,
                            TAT_Hours = test.TAT_Hours
                        };
                        csv.WriteRecord(record);
                        csv.NextRecord();
                    }
                }

                await writer.FlushAsync();
                memoryStream.Position = 0;
                return memoryStream.ToArray();
            }
        }

        public async Task<CsvImportResultDto> ImportTestsFromCsvAsync(Stream fileStream, Guid actorUserId, CancellationToken cancellationToken)
        {
            var result = new CsvImportResultDto
            {
                RowResults = new List<RowResult>(),
                SuccessCount = 0,
                ErrorCount = 0,
                Errors = new List<string>()
            };

            if (fileStream == null || fileStream.Length == 0)
            {
                result.Errors.Add("Stream is empty.");
                result.ErrorCount++;
                return result;
            }

            using var reader = new StreamReader(fileStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                MissingFieldFound = null,
                HeaderValidated = null,
                BadDataFound = null,
                TrimOptions = TrimOptions.Trim,
                IgnoreBlankLines = true
            };

            using var csv = new CsvReader(reader, config);

            List<CsvTestRecord> records;
            try
            {
                records = csv.GetRecords<CsvTestRecord>().ToList();
            }
            catch (Exception ex)
            {
                result.Errors.Add($"CSV parse error: {ex.Message}");
                result.ErrorCount++;
                return result;
            }

            // Group by TestCode
            var grouped = records
                .Where(r => !string.IsNullOrWhiteSpace(r.TestCode))
                .GroupBy(r => r.TestCode.Trim().ToUpperInvariant());

            using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                // Pre-fetch all DepartmentMasters to avoid repeated queries
                var allDepts = await _context.DepartmentMasters.ToListAsync();
                var pathology = allDepts.FirstOrDefault(d => d.Code == "PATH"); // assume PATH code or name
                // Fallback by name if code fail
                if (pathology == null) pathology = allDepts.FirstOrDefault(d => d.Name == "Pathology");

                foreach (var group in grouped)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var testCode = group.Key;
                    var first = group.First();

                    // Unified Visit Model: Resolve or Upsert DepartmentMaster
                    Guid? deptId = null;
                    var macroDept = first.MacroDepartment?.Trim() ?? "Pathology";
                    var deptCode = first.DepartmentCode?.Trim() ?? first.Department?.Trim(); // Fallback to legacy column

                    if (!string.IsNullOrWhiteSpace(deptCode))
                    {
                        var dept = allDepts.FirstOrDefault(d => d.Code.Equals(deptCode, StringComparison.OrdinalIgnoreCase));
                        if (dept == null)
                        {
                            // NEW: Upsert missing DepartmentMaster
                            dept = new DepartmentMaster
                            {
                                DepartmentId = Guid.NewGuid(),
                                Code = deptCode.ToUpperInvariant(),
                                Name = deptCode, // Use code as name if new
                                MacroDepartment = macroDept,
                                IsActive = true,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _context.DepartmentMasters.Add(dept);
                            allDepts.Add(dept); // Update local cache
                        }
                        else if (dept.MacroDepartment != macroDept)
                        {
                            // Update existing MacroDepartment if it differs
                            dept.MacroDepartment = macroDept;
                        }
                        deptId = dept.DepartmentId;
                    }

                    // Upsert test
                    var test = await _context.Tests
                        .Include(t => t.TestPricings)
                        .Include(t => t.DepartmentMaster)
                        .FirstOrDefaultAsync(t => t.TestCode.ToUpper() == testCode, cancellationToken);

                    if (test == null)
                    {
                        test = new Test
                        {
                            TestId = Guid.NewGuid(),
                            TestCode = testCode,
                            TestName = first.TestName?.Trim(),
                            DepartmentId = deptId, // New field
                            Category = first.Category?.Trim(),
                            TAT_Hours = first.TAT_Hours ?? 24,
                            IsActive = true,
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        _context.Tests.Add(test);

                        // Initial Price
                        if (first.BasePrice.HasValue)
                        {
                            var initialPrice = new TestPricing
                            {
                                PricingId = Guid.NewGuid(),
                                TestId = test.TestId,
                                BasePrice = first.BasePrice.Value,
                                EffectiveFrom = DateTime.Today,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _context.TestPricings.Add(initialPrice);
                        }

                        var auditDto = new { test.TestId, test.TestCode, test.TestName };
                        await _auditService.LogAsync(actorUserId, "CreateTestFromCsv", "Test", test.TestId, auditDto);
                    }
                    else
                    {
                        var changed = false;
                        if (!string.Equals(test.TestName, first.TestName, StringComparison.Ordinal))
                        {
                            test.TestName = first.TestName;
                            changed = true;
                        }
                        
                        // Check Dept
                        if (deptId.HasValue && test.DepartmentId != deptId.Value)
                        {
                            test.DepartmentId = deptId.Value;
                            changed = true;
                        }

                        // Check Price
                         var currentPricing = test.TestPricings
                            .Where(tp => tp.EffectiveFrom <= DateTime.UtcNow)
                            .OrderByDescending(tp => tp.EffectiveFrom)
                            .FirstOrDefault();
                        decimal currentPrice = currentPricing?.BasePrice ?? 0;

                        if (first.BasePrice.HasValue && currentPrice != first.BasePrice.Value)
                        {
                             var newPrice = new TestPricing
                             {
                                 PricingId = Guid.NewGuid(),
                                 TestId = test.TestId,
                                 BasePrice = first.BasePrice.Value,
                                 EffectiveFrom = DateTime.Today, // Effective Today
                                 CreatedAt = DateTimeOffset.UtcNow
                             };
                             _context.TestPricings.Add(newPrice);
                             changed = true;
                        }

                        if (changed)
                        {
                            test.UpdatedAt = DateTimeOffset.UtcNow;
                            await _auditService.LogAsync(actorUserId, "UpdateTestFromCsv", "Test", test.TestId, new { test.TestId, test.TestCode });
                        }
                    }

                    // Process Params and other details (kept identical mostly)
                    foreach (var rec in group)
                    {
                        cancellationToken.ThrowIfCancellationRequested();

                        // Parameter upsert
                        if (string.IsNullOrWhiteSpace(rec.ParameterCode))
                        {
                            result.RowResults.Add(new RowResult { RowNumber = rec.RowNumber, TestCode = testCode, Success = true, Message = "No parameter in row, test-only row processed." });
                            result.SuccessCount++;
                            continue;
                        }

                        var paramCode = rec.ParameterCode.Trim().ToUpperInvariant();
                        var parameter = await _context.Parameters.FirstOrDefaultAsync(p => p.TestId == test.TestId && p.ParameterCode.ToUpper() == paramCode, cancellationToken);
                        if (parameter == null)
                        {
                            parameter = new Parameter
                            {
                                ParameterId = Guid.NewGuid(),
                                TestId = test.TestId,
                                ParameterCode = paramCode,
                                ParameterName = rec.ParameterName,
                                Unit = rec.Unit,
                                DataType = rec.DataType,
                                SortOrder = rec.SortOrder ?? 0,
                                IsActive = true,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _context.Parameters.Add(parameter);
                            
                        }
                        else
                        {
                            // update param
                             var pChanged = false;
                             if (parameter.ParameterName != rec.ParameterName) { parameter.ParameterName = rec.ParameterName; pChanged = true; }
                             if (parameter.Unit != rec.Unit) { parameter.Unit = rec.Unit; pChanged = true; }
                             if (rec.SortOrder.HasValue && parameter.SortOrder != rec.SortOrder) { parameter.SortOrder = rec.SortOrder.Value; pChanged = true; }
                             if (pChanged) parameter.UpdatedAt = DateTimeOffset.UtcNow;
                        }

                        // Reference range upsert 
                        // Simplified for brevity, same logic as before, just ensuring compilation
                         if (rec.RefLow.HasValue || rec.RefHigh.HasValue || !string.IsNullOrWhiteSpace(rec.TextRange))
                        {
                            // naive check
                             var existingRange = await _context.ReferenceRanges.FirstOrDefaultAsync(r =>
                                r.ParameterId == parameter.ParameterId &&
                                r.AgeGroup == rec.AgeGroup &&
                                r.Sex == rec.Sex, cancellationToken);

                             if (existingRange == null)
                             {
                                 _context.ReferenceRanges.Add(new ReferenceRange
                                 {
                                     ReferenceRangeId = Guid.NewGuid(),
                                     ParameterId = parameter.ParameterId,
                                     RefLow = rec.RefLow,
                                     RefHigh = rec.RefHigh,
                                     AgeGroup = rec.AgeGroup,
                                     Sex = rec.Sex,
                                     TextRange = rec.TextRange,
                                     CriticalLow = rec.CriticalLow,
                                     CriticalHigh = rec.CriticalHigh,
                                     AgeMin = (int?)rec.AgeMin,
                                     AgeMax = (int?)rec.AgeMax,
                                     EffectiveFrom = string.IsNullOrWhiteSpace(rec.EffectiveFrom) ? DateTime.MinValue : DateTime.Parse(rec.EffectiveFrom),
                                     IsActive = true,
                                     CreatedAt = DateTimeOffset.UtcNow
                                 });
                             }
                        }

                        result.RowResults.Add(new RowResult { RowNumber = rec.RowNumber, TestCode = testCode, Success = true, Message = "Parameter processed" });
                        result.SuccessCount++;
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);
                await tx.CommitAsync(cancellationToken);
                _testsCacheService?.InvalidateTestsCache();
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync(cancellationToken);
                result.Errors.Add($"Import error: {ex.Message}");
                result.ErrorCount++;
            }

            await _auditService.LogAsync(actorUserId, "CsvImportCompleted", "TestMasterCsv", Guid.Empty, new { result.SuccessCount, result.ErrorCount, Timestamp = DateTimeOffset.UtcNow });
            return result;
        }

        public Task<CsvImportResultDto> ImportTestsFromCsvAsync(IFormFile file)
        {
            if (file == null) throw new ArgumentNullException(nameof(file));
            return ImportTestsFromCsvAsync(file.OpenReadStream(), Guid.Empty, CancellationToken.None);
        }

        public async Task<CsvImportResultDto> ImportTestsFromExcelAsync(Stream fileStream, Guid actorUserId, CancellationToken cancellationToken)
        {
            var result = new CsvImportResultDto
            {
                RowResults = new List<RowResult>(),
                SuccessCount = 0,
                ErrorCount = 0,
                Errors = new List<string>()
            };

            if (fileStream == null || fileStream.Length == 0)
            {
                result.Errors.Add("Stream is empty.");
                result.ErrorCount++;
                return result;
            }

            using var workbook = new XLWorkbook(fileStream);

            // --- STEP 1: READ SHEET 2 (Profile Map) FIRST ---
            // We need to know which tests are profiles BEFORE we process Sheet 1
            var profileMaps = new List<ProfileMapRow>();
            var profileCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (workbook.Worksheets.Count >= 2)
            {
                var sheet2 = workbook.Worksheet(2);
                var rows2 = sheet2.RangeUsed().RowsUsed().Skip(1);
                
                var h2 = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                foreach(var cell in sheet2.Row(1).CellsUsed()) h2[cell.GetValue<string>().Trim()] = cell.Address.ColumnNumber;

                // Expected: ProfileCode, ChildTestCode, Sequence
                if (h2.ContainsKey("ProfileCode") && h2.ContainsKey("ChildTestCode"))
                {
                     foreach(var row in rows2)
                     {
                         Func<string, string> S2 = name => h2.ContainsKey(name) ? row.Cell(h2[name]).GetValue<string>()?.Trim() : null;
                         Func<string, int> I2 = name => h2.ContainsKey(name) && !row.Cell(h2[name]).IsEmpty() ? row.Cell(h2[name]).GetValue<int>() : 0;

                         var pCode = S2("ProfileCode");
                         var cCode = S2("ChildTestCode");
                         if (!string.IsNullOrEmpty(pCode) && !string.IsNullOrEmpty(cCode))
                         {
                             profileMaps.Add(new ProfileMapRow 
                             {
                                 RowNumber = row.RowNumber(),
                                 ProfileCode = pCode,
                                 ChildTestCode = cCode,
                                 Sequence = I2("Sequence")
                             });
                             profileCodes.Add(pCode);
                         }
                     }
                }
            }

            // --- PROCESS SHEET 1: Master Data ---
            if (workbook.Worksheets.Count < 1)
            {
                result.Errors.Add("Workbook must have at least one worksheet.");
                result.ErrorCount++;
                return result;
            }

            var sheet1 = workbook.Worksheet(1);
            var rows1 = sheet1.RangeUsed().RowsUsed().Skip(1); // Skip header

            var records = new List<CsvTestRecord>();

            // Let's grab headers first
            var headerRow = sheet1.Row(1);
            var headers = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach(var cell in headerRow.CellsUsed())
            {
                headers[cell.GetValue<string>().Trim()] = cell.Address.ColumnNumber;
            }

            // Validation: minimal headers
            if(!headers.ContainsKey("TestCode")) { result.Errors.Add("Missing TestCode column in Sheet 1"); return result; }

            foreach(var row in rows1)
            {
                Func<string, string> S = name => headers.ContainsKey(name) ? row.Cell(headers[name]).GetValue<string>()?.Trim() : null;
                Func<string, decimal?> D = name => headers.ContainsKey(name) && !row.Cell(headers[name]).IsEmpty() ? (decimal?)row.Cell(headers[name]).GetValue<decimal>() : null;
                Func<string, int?> I = name => headers.ContainsKey(name) && !row.Cell(headers[name]).IsEmpty() ? (int?)row.Cell(headers[name]).GetValue<int>() : null;
                
                // Note: We ignore IsProfile column from CSV/Excel and use auto-detection
                var tCode = S("TestCode");
                var isProfile = !string.IsNullOrEmpty(tCode) && profileCodes.Contains(tCode);

                records.Add(new CsvTestRecord
                {
                    RowNumber = row.RowNumber(),
                    TestCode = tCode,
                    TestName = S("TestName"),
                    DepartmentCode = S("DepartmentCode"),
                    Price = D("Price"),
                    ParameterName = S("ParameterName"),
                    SpecimenType = S("SpecimenType"),
                    TubeType = S("TubeType"),
                    ResultUnits = S("ResultUnits"),
                    ReferenceRange = S("ReferenceRange"),
                    ExtraInfo = S("ExtraInfo"),
                    SpecialInstructions = S("SpecialInstructions"),
                    IsProfile = isProfile // Auto-detected from Sheet 2
                });
            }

            // --- VALIDATION: Check if all ProfileCodes in Sheet 2 exist in Sheet 1 ---
            var sheet1TestCodes = new HashSet<string>(records.Where(r => !string.IsNullOrEmpty(r.TestCode)).Select(r => r.TestCode), StringComparer.OrdinalIgnoreCase);
            foreach(var pCode in profileCodes)
            {
                // We only check against Sheet 1 codes because we are creating/updating them now.
                // If the test exists in DB but not in Sheet 1, we might accept it, but for this import to be self-contained, 
                // it's safer to warn if a profile is defined in Map but not in Master.
                // However, the user req says: "If Sheet-2 references a ProfileCode that does not exist in Sheet-1 -> Throw descriptive validation error"
                if (!sheet1TestCodes.Contains(pCode))
                {
                    // Check if it exists in DB? The requirement implies Sheet-1 strictly.
                    // "If Sheet-2 references a ProfileCode that does not exist in Sheet-1"
                    result.Errors.Add($"ProfileCode '{pCode}' referenced in Sheet-2 not found in Sheet-1.");
                    result.ErrorCount++;
                }
            }


            // --- TRANSACTION EXECUTION (Reuse Logic) ---
             // Group by TestCode
            var grouped = records
                .Where(r => !string.IsNullOrWhiteSpace(r.TestCode))
                .GroupBy(r => r.TestCode.Trim().ToUpperInvariant());

            using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                // Pre-fetch all DepartmentMasters to avoid repeated queries
                var allDepts = await _context.DepartmentMasters.ToListAsync();
                var pathology = allDepts.FirstOrDefault(d => d.Code == "PATH") ?? allDepts.FirstOrDefault(d => d.Name == "Pathology");
                var allSpecimens = await _context.SpecimenTypes.ToListAsync();
                var allTubes = await _context.ImsTubeMasters.ToListAsync();

                // 1. Process Master Records (Atomic + Profile Headers)
                foreach (var group in grouped)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var testCode = group.Key;
                    var first = group.First();

                    // Extract strict first available values for Test entity
                    var specType = group.FirstOrDefault(g => !string.IsNullOrWhiteSpace(g.SpecimenType))?.SpecimenType?.Trim();
                    var tubeType = group.FirstOrDefault(g => !string.IsNullOrWhiteSpace(g.TubeType))?.TubeType?.Trim();
                    var extraInfo = group.FirstOrDefault(g => !string.IsNullOrWhiteSpace(g.ExtraInfo))?.ExtraInfo?.Trim();
                    var specialInst = group.FirstOrDefault(g => !string.IsNullOrWhiteSpace(g.SpecialInstructions))?.SpecialInstructions?.Trim();

                    // VALIDATE SpecimenType exists
                    if (!string.IsNullOrWhiteSpace(specType))
                    {
                        var exists = allSpecimens.Any(s => s.Code.Equals(specType, StringComparison.OrdinalIgnoreCase));
                        if (!exists)
                        {
                            foreach(var r in group) {
                                result.RowResults.Add(new RowResult { RowNumber = r.RowNumber, TestCode = testCode, Success = false, Message = $"Validation Error: SpecimenType '{specType}' does not exist." });
                            }
                            result.ErrorCount += group.Count();
                            continue; // Skip this Test entirely
                        }
                    }

                    // VALIDATE TubeType exists
                    Guid? tubeId = null;
                    if (!string.IsNullOrWhiteSpace(tubeType))
                    {
                        var tube = allTubes.FirstOrDefault(t => t.Code.Equals(tubeType, StringComparison.OrdinalIgnoreCase) || t.Name.Equals(tubeType, StringComparison.OrdinalIgnoreCase));
                        if (tube == null)
                        {
                            foreach(var r in group) {
                                result.RowResults.Add(new RowResult { RowNumber = r.RowNumber, TestCode = testCode, Success = false, Message = $"Validation Error: TubeType '{tubeType}' does not exist in ImsTubeMaster." });
                            }
                            result.ErrorCount += group.Count();
                            continue; // Skip this Test entirely
                        }
                        tubeId = tube.TubeId;
                    }

                    // Resolve Department ID
                    Guid? deptId = null;
                    if (!string.IsNullOrWhiteSpace(first.DepartmentCode))
                    {
                        var matchingDept = allDepts.FirstOrDefault(d => d.Name.ToUpper() == first.DepartmentCode.Trim().ToUpper() || d.Code.ToUpper() == first.DepartmentCode.Trim().ToUpper());
                        deptId = matchingDept?.DepartmentId;
                    }
                    if (deptId == null) deptId = pathology?.DepartmentId;

                    // Upsert test
                    var test = await _context.Tests
                        .Include(t => t.TestPricings)
                        .Include(t => t.DepartmentMaster)
                        .FirstOrDefaultAsync(t => t.TestCode.ToUpper() == testCode, cancellationToken);

                    if (test == null)
                    {
                        test = new Test
                        {
                            TestId = Guid.NewGuid(),
                            TestCode = testCode,
                            TestName = first.TestName?.Trim() ?? testCode,
                            DepartmentId = deptId, 
                            SpecimenTypeCode = specType,
                            ExtraInfo = extraInfo,
                            SpecialInstructions = specialInst,
                            IsActive = true,
                            IsProfile = first.IsProfile, // SET IS PROFILE
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        _context.Tests.Add(test);

                        // Initial Price
                        if (first.Price.HasValue)
                        {
                            var initialPrice = new TestPricing
                            {
                                PricingId = Guid.NewGuid(),
                                TestId = test.TestId,
                                BasePrice = first.Price.Value,
                                EffectiveFrom = DateTime.Today,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _context.TestPricings.Add(initialPrice);
                        }
                    }
                    else
                    {
                        var changed = false;
                        if (!string.Equals(test.TestName, first.TestName, StringComparison.Ordinal) && !string.IsNullOrEmpty(first.TestName))
                        {
                            test.TestName = first.TestName;
                            changed = true;
                        }
                        
                        if (!string.IsNullOrWhiteSpace(specType) && !string.Equals(test.SpecimenTypeCode, specType, StringComparison.OrdinalIgnoreCase))
                        {
                             var sObj = allSpecimens.FirstOrDefault(s => s.Code.Equals(specType, StringComparison.OrdinalIgnoreCase));
                             if (sObj != null) { test.SpecimenTypeCode = sObj.Code; changed = true; }
                        }

                        if (!string.IsNullOrWhiteSpace(extraInfo) && test.ExtraInfo != extraInfo) { test.ExtraInfo = extraInfo; changed = true; }
                        if (!string.IsNullOrWhiteSpace(specialInst) && test.SpecialInstructions != specialInst) { test.SpecialInstructions = specialInst; changed = true; }

                        // Update IsProfile if explicitly provided
                        if (first.IsProfile != test.IsProfile)
                        {
                             test.IsProfile = first.IsProfile;
                             changed = true;
                        }

                        // Check Dept
                        if (deptId.HasValue && test.DepartmentId != deptId.Value)
                        {
                            test.DepartmentId = deptId.Value;
                            changed = true;
                        }

                        // Check Price
                         var currentPricing = test.TestPricings
                            .Where(tp => tp.EffectiveFrom <= DateTime.UtcNow)
                            .OrderByDescending(tp => tp.EffectiveFrom)
                            .FirstOrDefault();
                        decimal currentPrice = currentPricing?.BasePrice ?? 0;

                        if (first.Price.HasValue && currentPrice != first.Price.Value)
                        {
                             var newPrice = new TestPricing
                             {
                                 PricingId = Guid.NewGuid(),
                                 TestId = test.TestId,
                                 BasePrice = first.Price.Value,
                                 EffectiveFrom = DateTime.Today, // Effective Today
                                 CreatedAt = DateTimeOffset.UtcNow
                             };
                             _context.TestPricings.Add(newPrice);
                             changed = true;
                        }

                        if (changed)
                        {
                            test.UpdatedAt = DateTimeOffset.UtcNow;
                        }
                    }

                    // Process Tube Mapping
                    if (tubeId.HasValue)
                    {
                        var existingTubeMap = await _context.ImsTestTubeMaps.FirstOrDefaultAsync(m => m.TestId == test.TestId && m.TubeId == tubeId.Value, cancellationToken);
                        if (existingTubeMap == null)
                        {
                            _context.ImsTestTubeMaps.Add(new ImsTestTubeMap
                            {
                                MapId = Guid.NewGuid(),
                                TestId = test.TestId,
                                TubeId = tubeId.Value,
                                QuantityPerSample = 1
                            });
                        }
                    }

                    // Process Params
                    foreach (var rec in group)
                    {
                        cancellationToken.ThrowIfCancellationRequested();

                        var pName = rec.ParameterName?.Trim();
                        // Parameter upsert
                        if (string.IsNullOrWhiteSpace(pName))
                        {
                            result.RowResults.Add(new RowResult { RowNumber = rec.RowNumber, TestCode = testCode, Success = true, Message = "No parameter name, test-only row processed." });
                            result.SuccessCount++;
                            continue;
                        }

                        var paramCode = rec.ParameterCode?.Trim().ToUpperInvariant();
                        if (string.IsNullOrWhiteSpace(paramCode)) 
                        {
                             var safeName = Regex.Replace(pName, @"[^a-zA-Z0-9\s]", "").Replace(" ", "_").ToUpperInvariant();
                             if (safeName.Length > 20) safeName = safeName.Substring(0, 20);
                             paramCode = $"{testCode}_{safeName}";
                             if (paramCode.Length > 50) paramCode = paramCode.Substring(0, 50);
                        }

                        var parameter = await _context.Parameters.FirstOrDefaultAsync(p => p.TestId == test.TestId && (p.ParameterCode.ToUpper() == paramCode || p.ParameterName.ToUpper() == pName.ToUpper()), cancellationToken);
                        if (parameter == null)
                        {
                            parameter = new Parameter
                            {
                                ParameterId = Guid.NewGuid(),
                                TestId = test.TestId,
                                ParameterCode = paramCode,
                                ParameterName = pName,
                                Unit = rec.ResultUnits ?? rec.Unit,
                                DataType = "Numeric", // Default
                                SortOrder = rec.SortOrder ?? 0,
                                IsActive = true,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _context.Parameters.Add(parameter);
                        }
                        else
                        {
                             var pChanged = false;
                             if (parameter.ParameterName != pName) { parameter.ParameterName = pName; pChanged = true; }
                             var newUnit = rec.ResultUnits ?? rec.Unit;
                             if (!string.IsNullOrWhiteSpace(newUnit) && parameter.Unit != newUnit) { parameter.Unit = newUnit; pChanged = true; }
                             if (pChanged) parameter.UpdatedAt = DateTimeOffset.UtcNow;
                        }

                        // Reference Range mapped safely as TEXT per requirements
                        var refRangeText = rec.ReferenceRange?.Trim();
                        if (!string.IsNullOrWhiteSpace(refRangeText))
                        {
                             var existingRange = await _context.ReferenceRanges.FirstOrDefaultAsync(r =>
                                r.ParameterId == parameter.ParameterId &&
                                r.AgeGroup == "ALL" &&
                                r.Sex == "ALL", cancellationToken);

                             if (existingRange == null)
                             {
                                 _context.ReferenceRanges.Add(new ReferenceRange
                                 {
                                     ReferenceRangeId = Guid.NewGuid(),
                                     ParameterId = parameter.ParameterId,
                                     AgeGroup = "ALL",
                                     Sex = "ALL",
                                     TextRange = refRangeText,
                                     EffectiveFrom = DateTime.UtcNow.Date,
                                     IsActive = true,
                                     CreatedAt = DateTimeOffset.UtcNow
                                 });
                             }
                             else
                             {
                                 if (existingRange.TextRange != refRangeText)
                                 {
                                     existingRange.TextRange = refRangeText;
                                     existingRange.UpdatedAt = DateTimeOffset.UtcNow;
                                 }
                             }
                        }

                        result.RowResults.Add(new RowResult { RowNumber = rec.RowNumber, TestCode = testCode, Success = true, Message = "Parameter processed" });
                        result.SuccessCount++;
                    }
                }
                
                await _context.SaveChangesAsync(cancellationToken); // Save Master Data First

                // 2. Process Profile Maps (Only after tests exist)
                var mapGroups = profileMaps.GroupBy(p => p.ProfileCode.Trim().ToUpperInvariant());
                foreach(var grp in mapGroups)
                {
                    var parentCode = grp.Key;
                    var parentTest = await _context.Tests.Include(t => t.ProfileChildren).FirstOrDefaultAsync(t => t.TestCode.ToUpper() == parentCode);
                    
                    if (parentTest == null)
                    {
                        result.Errors.Add($"Profile Map Error: Parent Profile '{parentCode}' not found.");
                        result.ErrorCount++;
                        continue;
                    }
                    if (!parentTest.IsProfile)
                    {
                        result.Errors.Add($"Profile Map Error: Parent '{parentCode}' is not flagged as a Profile.");
                        result.ErrorCount++;
                        continue;
                    }

                    // Clear existing mapping
                    _context.ProfileMaps.RemoveRange(parentTest.ProfileChildren);

                    foreach(var row in grp)
                    {
                        var childCode = row.ChildTestCode.Trim().ToUpperInvariant();
                        if (childCode == parentCode) { // Self-reference check
                             result.Errors.Add($"Profile Map Error: Self-reference for '{parentCode}'."); continue;
                        }

                        var childTest = await _context.Tests.FirstOrDefaultAsync(t => t.TestCode.ToUpper() == childCode);
                        if (childTest == null)
                        {
                            result.Errors.Add($"Profile Map Error: Child Test '{childCode}' not found for Profile '{parentCode}'.");
                            result.ErrorCount++;
                            continue;
                        }

                        _context.ProfileMaps.Add(new SynOS.Models.Entities.ProfileMap
                        {
                            ProfileMapId = Guid.NewGuid(),
                            ParentTestId = parentTest.TestId,
                            ChildTestId = childTest.TestId,
                            Sequence = row.Sequence
                        });
                        
                        result.SuccessCount++; // Count map actions?
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);
                await tx.CommitAsync(cancellationToken);
                _testsCacheService?.InvalidateTestsCache();
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync(cancellationToken);
                result.Errors.Add($"Import error: {ex.Message}");
                result.ErrorCount++;
            }

            await _auditService.LogAsync(actorUserId, "ExcelImportCompleted", "TestMasterExcel", Guid.Empty, new { result.SuccessCount, result.ErrorCount, Timestamp = DateTimeOffset.UtcNow });
            return result;
        }

        public Task<byte[]> ExportProfitabilityCsvAsync(SynOS.Models.DTOs.Economics.LabProfitabilitySummaryDto summary)
        {
            var sb = new StringBuilder();
            sb.AppendLine("SYN OS FINANCIAL & PROFITABILITY STATEMENT");
            sb.AppendLine($"Reporting Period,{summary.StartDate:yyyy-MM-dd} to {summary.EndDate:yyyy-MM-dd}");
            sb.AppendLine($"Currency,{summary.Currency}");
            sb.AppendLine($"Generated At,{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
            sb.AppendLine();
            sb.AppendLine("METRIC,CATEGORY,AMOUNT (INR),PERCENTAGE / NOTES");

            sb.AppendLine($"Gross Accrual Revenue,Revenue (Billed),{summary.TotalRevenueAccrual:F2},100.00%");
            sb.AppendLine($"Net Cash Collections,Revenue (Collected),{summary.TotalRevenueCash:F2},Realized Collections");
            sb.AppendLine($" - Cash Payments,Revenue (Cash),{summary.CashCollected:F2},Physical Cash");
            sb.AppendLine($" - Digital / UPI / Card,Revenue (Digital),{summary.OnlineCollected:F2},Electronic Settlement");
            sb.AppendLine($"Accounts Receivable (Outstanding Dues),Assets / Dues,{summary.PendingCollections:F2},Uncollected Patient/B2B Dues");
            sb.AppendLine();
            sb.AppendLine("Cost of Goods Sold (COGS),Direct Expenses,,");
            sb.AppendLine($" - Consumables & Reagents,COGS,{summary.ConsumableCashOutflow:F2},Material & Test Kits");
            sb.AppendLine($" - Outsourced / Send-out Tests,COGS,{summary.OutsourcedTestCashOutflow:F2},Reference Lab Charges");
            sb.AppendLine();
            sb.AppendLine("Operating Expenses (OPEX),Indirect Expenses,,");
            sb.AppendLine($" - Workforce Payroll & Statutory Dues,Payroll,{summary.PayrollCashOutflow:F2},Salaries + PF + ESI + TDS");
            sb.AppendLine($" - Referral & Partner Commissions,Commissions,{summary.ReferralCashOutflow:F2},Doctor & B2B Payouts");
            sb.AppendLine($" - Facility Rent & Utility Overhead,Overhead,{summary.OverheadCashOutflow:F2},Rent + Utilities + Maintenance");
            sb.AppendLine($"Total Cash Expenses,Expenses (Total),{summary.TotalExpensesCash:F2},All Outflows");
            sb.AppendLine();
            sb.AppendLine("PROFITABILITY & BOTTOM LINE,SUMMARY,,");
            sb.AppendLine($"Net Cash Flow Position,Net Realized,{summary.NetCashPosition:F2},{summary.CashMarginPercentage:F1}% Net Realized Margin");
            sb.AppendLine($"Net Accrual Operational Position,Net Operational,{summary.NetAccrualPosition:F2},{summary.AccrualMarginPercentage:F1}% Net Operational Margin");

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return Task.FromResult(bytes);
        }

        private class ProfileMapRow
        {
            public int RowNumber { get; set; }
            public string ProfileCode { get; set; }
            public string ChildTestCode { get; set; }
            public int Sequence { get; set; }
        }
    }

    public class CsvTestRecord
    {
        public int RowNumber { get; set; }
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public string Department { get; set; }

        public string Category { get; set; }
        public decimal? BasePrice { get; set; }
        public int? TAT_Hours { get; set; }
        public string ParameterCode { get; set; }
        public string ParameterName { get; set; }
        public string Unit { get; set; }
        public string DataType { get; set; }
        public int? SortOrder { get; set; }
        public decimal? RefLow { get; set; }
        public decimal? RefHigh { get; set; }
        public decimal? CriticalLow { get; set; }
        public decimal? CriticalHigh { get; set; }
        public string AgeGroup { get; set; }
        public decimal? AgeMin { get; set; }
        public decimal? AgeMax { get; set; }
        public string Sex { get; set; }
        public string TextRange { get; set; }
        public string EffectiveFrom { get; set; }
        public decimal? Price_DiscountPercent { get; set; }
        public decimal? Price_ReferrerRatePercent { get; set; }
        public string Price_EffectiveFrom { get; set; }
        public string Price_EffectiveTo { get; set; }
        public bool? Price_IsActive { get; set; }
        public bool IsProfile { get; set; } // Added for Profile Support
        
        // --- 11-Column Template Fields ---
        public string MacroDepartment { get; set; } // e.g. Pathology, Radiology
        public string DepartmentCode { get; set; } // e.g. BIO, HAE
        public string ResultUnits { get; set; }
        public string ReferenceRange { get; set; }
        public string SpecimenType { get; set; }
        public string TubeType { get; set; }
        public string ExtraInfo { get; set; }
        public string SpecialInstructions { get; set; }
        public decimal? Price { get; set; }
    }
}