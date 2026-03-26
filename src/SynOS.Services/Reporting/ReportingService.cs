using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NCalc;
using SynOS.Data;
using SynOS.Models.DTOs.Reporting;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;

namespace SynOS.Services.Reporting
{
    public class ReportingService : IReportingService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ReportingService> _logger;

        public ReportingService(SynOSDbContext context, ILogger<ReportingService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ReportStructureDto> GetReportStructureAsync(Guid reportId)
        {
            var report = await _context.Reports
                .Include(r => r.ReportVersions)
                    .ThenInclude(rv => rv.Snapshot)
                .FirstOrDefaultAsync(r => r.ReportId == reportId);

            if (report == null) throw new KeyNotFoundException($"Report {reportId} not found.");

            // Get Patient/Visit manually since navigation is missing in Report entity
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .FirstOrDefaultAsync(v => v.VisitId == report.VisitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {report.VisitId} for report {reportId} not found.");

            // Get the latest version
            var latestVersion = report.ReportVersions.OrderByDescending(v => v.VersionNumber).FirstOrDefault();
            
            // If signed and has snapshot, use snapshot
            if (report.Status == "Signed" && latestVersion?.Snapshot != null)
            {
                try 
                {
                    var snapshotData = JsonSerializer.Deserialize<ReportStructureDto>(latestVersion.Snapshot.SnapshotJson);
                    if (snapshotData != null) return snapshotData;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to deserialize snapshot for Report {ReportId}", reportId);
                }
            }

            // Otherwise, build dynamically (Draft or Recovery mode)
            return await BuildDynamicStructureAsync(report, visit);
        }

        public async Task<ReportStructureDto> PreviewReportStructureAsync(Guid reportId)
        {
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.ReportId == reportId);
            if (report == null) throw new KeyNotFoundException($"Report {reportId} not found.");

            var visit = await _context.Visits
                .Include(v => v.Patient)
                .FirstOrDefaultAsync(v => v.VisitId == report.VisitId);
            if (visit == null) throw new KeyNotFoundException($"Visit {report.VisitId} not found.");

            return await BuildDynamicStructureAsync(report, visit);
        }

        public async Task CreateSnapshotAsync(Guid reportVersionId)
        {
            var version = await _context.ReportVersions
                .Include(rv => rv.Report)
                .FirstOrDefaultAsync(rv => rv.ReportVersionId == reportVersionId);

            if (version == null) throw new KeyNotFoundException($"ReportVersion {reportVersionId} not found.");

            var visit = await _context.Visits
                .Include(v => v.Patient)
                .FirstOrDefaultAsync(v => v.VisitId == version.Report.VisitId);
            if (visit == null) throw new KeyNotFoundException($"Visit {version.Report.VisitId} not found.");

            var structure = await BuildDynamicStructureAsync(version.Report, visit);
            var json = JsonSerializer.Serialize(structure);

            var snapshot = new ReportSnapshot
            {
                ReportVersionId = reportVersionId,
                SnapshotJson = json,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.ReportSnapshots.Add(snapshot);
            await _context.SaveChangesAsync();
        }
        private async Task<ReportStructureDto> BuildDynamicStructureAsync(Report report, Visit visit)
        {
            // 1. Fetch Order
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == report.SourceId);
            if (order == null) throw new KeyNotFoundException($"Order {report.SourceId} for report {report.ReportId} not found.");

            // 2. Discover ALL TestCodes in this report (Panel + Children)
            var allTestCodes = new HashSet<string> { order.TestCode };
            var mappings = await _context.CatalogPanelMappings
                .Where(m => m.PanelTestCode == order.TestCode)
                .Select(m => m.ChildTestCode)
                .ToListAsync();
            foreach (var code in mappings) allTestCodes.Add(code);

            // 3. Fetch Catalog Metadata for all these tests
            var catalogParams = await _context.CatalogParameters
                .Where(cp => allTestCodes.Contains(cp.TestCode))
                .ToListAsync();

            // 4. Fetch Results (only latest for each parameter)
            var results = await _context.Results
                .Where(r => r.OrderId == report.SourceId && r.Status != "Superseded")
                .ToListAsync();

            // 5. Fetch Test Notes (linked by Panel TestCode or Child TestCodes)
            var testNotes = await _context.CatalogTestNotes
                .Where(n => allTestCodes.Contains(n.TestCode))
                .ToListAsync();

            // 6. Assemble DTO Base
            var dto = new ReportStructureDto
            {
                ReportId = report.ReportId,
                Status = report.Status,
                Department = report.Department,
                SignedAt = report.SignedAt,
                SignedBy = report.SignedByUserId?.ToString(),
                Patient = new PatientHeaderDto
                {
                    Name = $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                    MRN = visit.Patient.MRN,
                    Age = CalculateAge(visit.Patient.DateOfBirth),
                    Gender = visit.Patient.Gender
                }
            };

            // 7. Grouping & Parameter Assembly
            var groups = new Dictionary<string, ReportGroupDto>();

            // Iterate through catalog structure instead of flat results to support panels/placeholders
            foreach (var meta in catalogParams.OrderBy(cp => cp.DisplayGroupOrder).ThenBy(cp => cp.SortOrder))
            {
                var groupName = meta.DisplayGroup ?? "General";
                var groupOrder = meta.DisplayGroupOrder;

                if (!groups.ContainsKey(groupName))
                {
                    groups[groupName] = new ReportGroupDto 
                    { 
                        GroupName = groupName, 
                        Order = groupOrder,
                        Parameters = new List<ReportParameterDto>()
                    };
                }

                var result = results.FirstOrDefault(r => r.ParameterCode == meta.ParameterCode);

                var paramDto = new ReportParameterDto
                {
                    ParameterName = meta.PrintName ?? meta.ParameterName,
                    ParameterCode = meta.ParameterCode,
                    Value = result != null ? FormatValue(result.Value, meta.DecimalPlaces) : null,
                    Unit = meta.Unit ?? string.Empty,
                    Methodology = meta.Methodology,
                    IsOverridden = result?.IsOverridden ?? false,
                    OverrideReason = result?.OverrideReason,
                    IsCalculated = meta.IsCalculated
                };

                // NEW: Dynamic Formula Engine (GPT-5 Approved)
                if (paramDto.IsCalculated)
                {
                    // 1. Prioritize Catalog-Driven Formula
                    if (!string.IsNullOrWhiteSpace(meta.Formula))
                    {
                        var resultsMap = results.ToDictionary(r => r.ParameterCode, r => (decimal?)decimal.Parse(r.Value));
                        var calcValue = EvaluateFormula(meta.Formula, resultsMap);
                        if (calcValue != null) paramDto.Value = FormatValue(calcValue.ToString(), meta.DecimalPlaces);
                    }
                    else
                    {
                        // 2. Legacy Fallback (Per V1 hardcoding)
                        var calcValue = PerformV1Calculation(paramDto.ParameterCode, results);
                        if (calcValue != null) paramDto.Value = calcValue;
                    }
                }

                // Skip if no value and not calculated? (Usually we show all parameters in a report panel)
                // For now, only show if we have a value OR it's a calculated field
                if (paramDto.Value != null)
                {
                    paramDto.Flag = result != null ? await CalculateFlagAsync(result, meta, dto.Patient) : "Normal";
                    // If calculated, we might need a dummy result for flag calculation
                    if (result == null && paramDto.IsCalculated)
                    {
                        var dummyResult = new Result { Value = paramDto.Value, ParameterCode = paramDto.ParameterCode };
                        paramDto.Flag = await CalculateFlagAsync(dummyResult, meta, dto.Patient);
                    }
                    
                    paramDto.ReferenceRange = await GetFormattedRangeAsync(meta, dto.Patient);
                    groups[groupName].Parameters.Add(paramDto);
                }
            }

            dto.Groups = groups.Values.OrderBy(g => g.Order).ToList();

            dto.Notes = testNotes.Select(n => new ReportNoteDto 
            { 
                Type = n.NoteType, 
                Content = n.NoteText 
            }).ToList();

            return dto;
        }

        private async Task<string> CalculateFlagAsync(Result result, CatalogParameter meta, PatientHeaderDto patient)
        {
            if (decimal.TryParse(result.Value, out var val) && meta != null)
            {
                // Find matching demographic range in ReferenceRanges table
                // Note: We need to find the ParameterId for CatalogParameter or link them
                // For V1, we search by ParameterCode (assuming match)
                var range = await _context.ReferenceRanges
                    .FirstOrDefaultAsync(r => r.Parameter.ParameterCode == result.ParameterCode && 
                                             (r.Sex == "ALL" || r.Sex == patient.Gender) &&
                                             (!r.AgeMin.HasValue || patient.Age >= r.AgeMin) &&
                                             (!r.AgeMax.HasValue || patient.Age <= r.AgeMax));

                if (range != null)
                {
                    if (range.CriticalLow.HasValue && val <= range.CriticalLow.Value) return "CriticalLow";
                    if (range.CriticalHigh.HasValue && val >= range.CriticalHigh.Value) return "CriticalHigh";
                    if (range.RefLow.HasValue && val < range.RefLow.Value) return "Low";
                    if (range.RefHigh.HasValue && val > range.RefHigh.Value) return "High";
                }
            }
            return "Normal";
        }

        private async Task<string> GetFormattedRangeAsync(CatalogParameter meta, PatientHeaderDto patient)
        {
            if (meta == null) return string.Empty;

            var range = await _context.ReferenceRanges
                .FirstOrDefaultAsync(r => r.Parameter.ParameterCode == meta.ParameterCode && 
                                         (r.Sex == "ALL" || r.Sex == patient.Gender) &&
                                         (!r.AgeMin.HasValue || patient.Age >= r.AgeMin) &&
                                         (!r.AgeMax.HasValue || patient.Age <= r.AgeMax));

            if (range != null)
            {
                if (!string.IsNullOrEmpty(range.TextRange)) return range.TextRange;
                if (range.RefLow.HasValue && range.RefHigh.HasValue) 
                    return $"{range.RefLow.Value:#.##} - {range.RefHigh.Value:#.##}";
            }

            return string.Empty;
        }

        private int CalculateAge(DateTime dob)
        {
            var age = DateTime.Today.Year - dob.Year;
            if (dob.Date > DateTime.Today.AddYears(-age)) age--;
            return age;
        }

        private string FormatValue(string value, int? decimalPlaces)
        {
            if (decimal.TryParse(value, out var v) && decimalPlaces.HasValue)
            {
                return v.ToString($"F{decimalPlaces.Value}");
            }
            return value;
        }

        private string? PerformV1Calculation(string code, List<Result> allResults)
        {
            try
            {
                // Hematocrit (HCT) = RBC * MCV / 10
                if (code == "HCT" || code == "HEMATOCRIT")
                {
                    var rbc = GetValue(allResults, "RBC");
                    var mcv = GetValue(allResults, "MCV");
                    if (rbc.HasValue && mcv.HasValue) return (rbc.Value * mcv.Value / 10).ToString("F1");
                }
                
                // Indirect Bilirubin (BIL_I) = Total (BIL_T) - Direct (BIL_D)
                if (code == "BIL_I" || code == "BILIRUBIN_INDIRECT")
                {
                    var total = GetValue(allResults, "BIL_T") ?? GetValue(allResults, "BILIRUBIN_TOTAL");
                    var direct = GetValue(allResults, "BIL_D") ?? GetValue(allResults, "BILIRUBIN_DIRECT");
                    if (total.HasValue && direct.HasValue) return (total.Value - direct.Value).ToString("F2");
                }

                // Globulin (GLOB) = Total Protein (TP) - Albumin (ALB)
                if (code == "GLOB" || code == "GLOBULIN")
                {
                    var tp = GetValue(allResults, "TP") ?? GetValue(allResults, "TOTAL_PROTEIN");
                    var alb = GetValue(allResults, "ALB") ?? GetValue(allResults, "ALBUMIN");
                    if (tp.HasValue && alb.HasValue) return (tp.Value - alb.Value).ToString("F2");
                }

                // A/G Ratio = Albumin / Globulin
                if (code == "AG_RATIO")
                {
                    var alb = GetValue(allResults, "ALB") ?? GetValue(allResults, "ALBUMIN");
                    var tp = GetValue(allResults, "TP") ?? GetValue(allResults, "TOTAL_PROTEIN");
                    if (alb.HasValue && tp.HasValue && tp.Value > alb.Value) 
                    {
                        var glob = tp.Value - alb.Value;
                        return (alb.Value / glob).ToString("F2");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Calculation failed for {ParameterCode}", code);
                return "ERR";
            }
            return null;
        }

        private decimal? GetValue(List<Result> results, string code)
        {
            var r = results.FirstOrDefault(r => r.ParameterCode == code);
            if (r != null && decimal.TryParse(r.Value, out var val)) return val;
            return null;
        }

        private decimal? EvaluateFormula(string formula, Dictionary<string, decimal?> values)
        {
            try
            {
                var expr = new Expression(formula);
                
                // Identify tokens and map parameters
                foreach (var parameter in values)
                {
                    if (formula.Contains(parameter.Key, StringComparison.OrdinalIgnoreCase))
                    {
                        if (!parameter.Value.HasValue) 
                        {
                            _logger.LogTrace("Skipping formula {Formula} because {Token} is null", formula, parameter.Key);
                            return null;
                        }
                        expr.Parameters[parameter.Key] = (double)parameter.Value.Value;
                    }
                }

                var result = expr.Evaluate();
                if (result == null) return null;
                
                return Convert.ToDecimal(result);
            }
            catch (DivideByZeroException)
            {
                _logger.LogWarning("Divide by zero in formula: {Formula}", formula);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to evaluate formula: {Formula}", formula);
                return null;
            }
        }
    }
}
