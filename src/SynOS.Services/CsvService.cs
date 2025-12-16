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
            _testsCacheService = testsCacheService; // may be null in some test environments
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
                                        Department = test.Department,
                                        Category = test.Category,
                                        BasePrice = test.BasePrice,
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
                                        EffectiveFrom = range.EffectiveFrom.ToString("yyyy-MM-dd") // Corrected to ToString
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
                                    Department = test.Department,
                                    Category = test.Category,
                                    BasePrice = test.BasePrice,
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
                            Department = test.Department,
                            Category = test.Category,
                            BasePrice = test.BasePrice
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

        // ----- New: Stream-based import method expected by ICsvService -----
        // This implements the signature: ImportTestsFromCsvAsync(Stream, Guid, CancellationToken)
        public async Task<CsvImportResultDto> ImportTestsFromCsvAsync(Stream fileStream, Guid actorUserId, CancellationToken cancellationToken)
        {
            var result = new CsvImportResultDto
            {
                RowResults = new List<CsvRowResultDto>(),
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

            // Group by TestCode to upsert tests + parameters in batches
            var grouped = records
                .Where(r => !string.IsNullOrWhiteSpace(r.TestCode))
                .GroupBy(r => r.TestCode.Trim().ToUpperInvariant());

            using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                foreach (var group in grouped)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var testCode = group.Key;
                    var first = group.First();

                    // Upsert test (case-sensitive comparison handled in DB; normalize here)
                    var test = await _context.Tests.FirstOrDefaultAsync(t => t.TestCode.ToUpper() == testCode, cancellationToken);
                    if (test == null)
                    {
                        test = new Test
                        {
                            TestId = Guid.NewGuid(),
                            TestCode = testCode,
                            TestName = first.TestName?.Trim(),
                            Department = string.IsNullOrWhiteSpace(first.Department) ? "Pathology" : first.Department?.Trim(),
                            Category = first.Category?.Trim(),
                            BasePrice = first.BasePrice ?? 0,
                            TAT_Hours = first.TAT_Hours ?? 24,
                            IsActive = true,
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        _context.Tests.Add(test);

                        // audit: log minimal DTO to avoid cycles
                        var auditDto = new { test.TestId, test.TestCode, test.TestName };
                        await _auditService.LogAsync(actorUserId, "CreateTestFromCsv", "Test", test.TestId, auditDto);
                    }
                    else
                    {
                        // update basic fields if CSV provides them
                        var changed = false;
                        if (!string.Equals(test.TestName, first.TestName, StringComparison.Ordinal))
                        {
                            test.TestName = first.TestName;
                            changed = true;
                        }
                        if (!string.IsNullOrWhiteSpace(first.Department) && !string.Equals(test.Department, first.Department, StringComparison.Ordinal))
                        {
                            test.Department = first.Department;
                            changed = true;
                        }
                        if (first.BasePrice.HasValue && test.BasePrice != first.BasePrice.Value)
                        {
                            test.BasePrice = first.BasePrice.Value;
                            changed = true;
                        }
                        if (changed)
                        {
                            test.UpdatedAt = DateTimeOffset.UtcNow;
                            await _auditService.LogAsync(actorUserId, "UpdateTestFromCsv", "Test", test.TestId, new { test.TestId, test.TestCode });
                        }
                    }

                    // For each CSV row in this test group, upsert parameter + ref-range + price config
                    foreach (var rec in group)
                    {
                        cancellationToken.ThrowIfCancellationRequested();

                        // Parameter upsert
                        if (string.IsNullOrWhiteSpace(rec.ParameterCode))
                        {
                            // nothing to do for this row except record it
                            result.RowResults.Add(new CsvRowResultDto { RowNumber = rec.RowNumber, TestCode = testCode, Success = true, Message = "No parameter in row, test-only row processed." });
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
                            await _auditService.LogAsync(actorUserId, "CreateParameterFromCsv", "Parameter", parameter.ParameterId, new { parameter.ParameterId, parameter.ParameterCode });
                        }
                        else
                        {
                            var changed = false;
                            if (!string.Equals(parameter.ParameterName, rec.ParameterName, StringComparison.Ordinal))
                            {
                                parameter.ParameterName = rec.ParameterName;
                                changed = true;
                            }
                            if (!string.Equals(parameter.Unit, rec.Unit, StringComparison.Ordinal))
                            {
                                parameter.Unit = rec.Unit;
                                changed = true;
                            }
                            if (rec.SortOrder.HasValue && parameter.SortOrder != rec.SortOrder.Value)
                            {
                                parameter.SortOrder = rec.SortOrder.Value;
                                changed = true;
                            }
                            if (changed)
                            {
                                parameter.UpdatedAt = DateTimeOffset.UtcNow;
                                await _auditService.LogAsync(actorUserId, "UpdateParameterFromCsv", "Parameter", parameter.ParameterId, new { parameter.ParameterId });
                            }
                        }

                        // Reference range upsert (optional)
                        if (rec.RefLow.HasValue || rec.RefHigh.HasValue || !string.IsNullOrWhiteSpace(rec.TextRange))
                        {
                            // Corrected to use ReferenceRangeId
                            var existingRange = await _context.ReferenceRanges.FirstOrDefaultAsync(r =>
                                r.ParameterId == parameter.ParameterId &&
                                r.AgeGroup == rec.AgeGroup &&
                                r.Sex == rec.Sex &&
                                r.RefLow == rec.RefLow &&
                                r.RefHigh == rec.RefHigh &&
                                (r.EffectiveFrom == (string.IsNullOrWhiteSpace(rec.EffectiveFrom) ? default(DateTime) : DateTime.Parse(rec.EffectiveFrom)))
                                , cancellationToken);

                            if (existingRange == null)
                            {
                                var newRange = new ReferenceRange
                                {
                                    ReferenceRangeId = Guid.NewGuid(), // Corrected to ReferenceRangeId
                                    ParameterId = parameter.ParameterId,
                                    RefLow = rec.RefLow,
                                    RefHigh = rec.RefHigh,
                                    CriticalLow = rec.CriticalLow,
                                    CriticalHigh = rec.CriticalHigh,
                                    AgeGroup = rec.AgeGroup,
                                    AgeMin = (int?)rec.AgeMin, // Explicit cast
                                    AgeMax = (int?)rec.AgeMax, // Explicit cast
                                    Sex = rec.Sex,
                                    TextRange = rec.TextRange,
                                    EffectiveFrom = string.IsNullOrWhiteSpace(rec.EffectiveFrom) ? default(DateTime) : DateTime.Parse(rec.EffectiveFrom), // Corrected assignment for non-nullable DateTime
                                    IsActive = true,
                                    CreatedAt = DateTimeOffset.UtcNow
                                };
                                _context.ReferenceRanges.Add(newRange);
                                await _auditService.LogAsync(actorUserId, "CreateReferenceRangeFromCsv", "ReferenceRange", newRange.ReferenceRangeId, new { newRange.ReferenceRangeId }); // Corrected
                            }
                        }

                        // Price config upsert — CSV columns: Price_DiscountPercent, Price_ReferrerRatePercent, Price_EffectiveFrom, Price_EffectiveTo, Price_IsActive
                        if (rec.Price_DiscountPercent.HasValue || rec.Price_ReferrerRatePercent.HasValue || !string.IsNullOrWhiteSpace(rec.Price_EffectiveFrom))
                        {
                            var priceConfig = await _context.PriceConfigs.FirstOrDefaultAsync(p => p.TestId == test.TestId, cancellationToken);
                            if (priceConfig == null)
                            {
                                priceConfig = new PriceConfig
                                {
                                    PriceId = Guid.NewGuid(),
                                    TestId = test.TestId,
                                    DiscountPercent = rec.Price_DiscountPercent ?? 0m,
                                    ReferrerRatePercent = rec.Price_ReferrerRatePercent ?? 100m,
                                    EffectiveFrom = !string.IsNullOrWhiteSpace(rec.Price_EffectiveFrom) ? DateTime.Parse(rec.Price_EffectiveFrom) : DateTimeOffset.UtcNow.DateTime,
                                    EffectiveTo = !string.IsNullOrWhiteSpace(rec.Price_EffectiveTo) ? DateTime.Parse(rec.Price_EffectiveTo) : (DateTime?)null,
                                    IsActive = rec.Price_IsActive ?? true,
                                    CreatedAt = DateTimeOffset.UtcNow
                                };
                                _context.PriceConfigs.Add(priceConfig);
                                await _auditService.LogAsync(actorUserId, "CreatePriceConfigFromCsv", "PriceConfig", priceConfig.PriceId, new { priceConfig.PriceId, test.TestCode });
                            }
                            else
                            {
                                priceConfig.DiscountPercent = rec.Price_DiscountPercent ?? priceConfig.DiscountPercent;
                                priceConfig.ReferrerRatePercent = rec.Price_ReferrerRatePercent ?? priceConfig.ReferrerRatePercent;
                                priceConfig.EffectiveFrom = !string.IsNullOrWhiteSpace(rec.Price_EffectiveFrom) ? DateTime.Parse(rec.Price_EffectiveFrom) : priceConfig.EffectiveFrom;
                                priceConfig.EffectiveTo = !string.IsNullOrWhiteSpace(rec.Price_EffectiveTo) ? DateTime.Parse(rec.Price_EffectiveTo) : priceConfig.EffectiveTo;
                                priceConfig.IsActive = rec.Price_IsActive ?? priceConfig.IsActive;
                                priceConfig.UpdatedAt = DateTimeOffset.UtcNow; // Corrected to UpdatedAt
                                await _auditService.LogAsync(actorUserId, "UpdatePriceConfigFromCsv", "PriceConfig", priceConfig.PriceId, new { priceConfig.PriceId, test.TestCode });
                            }
                        }

                        result.RowResults.Add(new CsvRowResultDto { RowNumber = rec.RowNumber, TestCode = testCode, Success = true, Message = "Parameter processed" });
                        result.SuccessCount++;
                    } // foreach row in group
                } // foreach group

                // persist all changes
                await _context.SaveChangesAsync(cancellationToken);
                await tx.CommitAsync(cancellationToken);

                // Invalidate tests cache so reception/visit flow sees new/updated tests immediately
                _testsCacheService?.InvalidateTestsCache();
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync(cancellationToken);
                result.Errors.Add($"Import error: {ex.Message}");
                result.ErrorCount++;
            }

            // audit summary
            await _auditService.LogAsync(actorUserId, "CsvImportCompleted", "TestMasterCsv", Guid.Empty, new { result.SuccessCount, result.ErrorCount, Timestamp = DateTimeOffset.UtcNow });

            return result;
        }

        // Wrapper used by your Swagger UI action (IFormFile)
        public Task<CsvImportResultDto> ImportTestsFromCsvAsync(IFormFile file)
        {
            if (file == null) throw new ArgumentNullException(nameof(file));
            return ImportTestsFromCsvAsync(file.OpenReadStream(), Guid.Empty, CancellationToken.None);
        }
    }

    // DTOs used only inside CsvService (simplified)
    public class CsvTestRecord
    {
        // optional: the row number can be filled by a custom parser if desired; CsvHelper doesn't populate it by default
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
        public decimal? AgeMin { get; set; } // Changed to decimal?
        public decimal? AgeMax { get; set; } // Changed to decimal?
        public string Sex { get; set; }
        public string TextRange { get; set; }
        public string EffectiveFrom { get; set; }

        // price config fields
        public decimal? Price_DiscountPercent { get; set; }
        public decimal? Price_ReferrerRatePercent { get; set; }
        public string Price_EffectiveFrom { get; set; }
        public string Price_EffectiveTo { get; set; }
        public bool? Price_IsActive { get; set; }
    }

    public class CsvImportResultDto
    {
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; }
        public List<CsvRowResultDto> RowResults { get; set; }
    }

    public class CsvRowResultDto
    {
        public int RowNumber { get; set; }
        public string TestCode { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; }
    }
}