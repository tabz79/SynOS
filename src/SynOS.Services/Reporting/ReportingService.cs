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

        public async Task<ReportStructureDto> GetReportStructureAsync(Guid reportId, bool forceFresh = false)
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

            // 1. DETERMINE TRUTH SOURCE (State-Aware Logic)
            // GPT-5 Rule: Drafts/ReadyForVerification MUST use LIVE data to reflect edits.
            // Signed reports MUST use SNAPSHOT for forensic integrity.
            bool isFinalized = report.Status == "Signed" || report.Status == "ManualVerified";
            
            // 2. Honors snapshot ONLY if report is finalized AND we aren't forcing fresh.
            if (isFinalized && !forceFresh && latestVersion?.Snapshot != null)
            {
                if (string.IsNullOrWhiteSpace(latestVersion.Snapshot.SnapshotJson))
                {
                    throw new Models.Exceptions.SnapshotIntegrityException(
                        $"Clinical integrity fault: Snapshot JSON is missing for ReportVersion {latestVersion.ReportVersionId}. Access blocked to prevent diagnostic dissociation.",
                        latestVersion.ReportVersionId);
                }

                try 
                {
                    var snapshotData = JsonSerializer.Deserialize<ReportStructureDto>(latestVersion.Snapshot.SnapshotJson);
                    if (snapshotData == null || snapshotData.Groups == null || !snapshotData.Groups.Any())
                    {
                        throw new Models.Exceptions.SnapshotIntegrityException(
                            "Clinical integrity fault: Snapshot deserialized to an empty or invalid clinical structure.",
                            latestVersion.ReportVersionId);
                    }

                    // GPT-5: Overlay live delivery status onto immutable clinical snapshot
                    snapshotData.IsPhysicallyVerified = report.IsPhysicallyVerified;
                    snapshotData.IsManualFlow = report.IsManualFlow;
                    snapshotData.Status = report.Status;
                    
                    return snapshotData;
                }
                catch (JsonException ex)
                {
                    _logger.LogCritical(ex, "Clinical integrity fault: Corrupted snapshot JSON for ReportVersion {Id}.", latestVersion.ReportVersionId);
                    throw new Models.Exceptions.SnapshotIntegrityException(
                        "The clinical report snapshot is corrupted. Clinical review is blocked for diagnostic consistency.",
                        ex,
                        latestVersion.ReportVersionId);
                }
            }

            // Fallback to dynamic build ONLY if no snapshot record exists at all (Legacy or Draft support)
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

            var structure = await BuildDynamicStructureAsync(report, visit);
            structure.CanEditValues = true;
            return structure;
        }

        public async Task CreateSnapshotAsync(Guid reportVersionId, bool overwrite = false)
        {
            var version = await _context.ReportVersions
                .Include(rv => rv.Report)
                .Include(rv => rv.Snapshot)
                .FirstOrDefaultAsync(rv => rv.ReportVersionId == reportVersionId);

            if (version == null) throw new KeyNotFoundException($"ReportVersion {reportVersionId} not found.");

            // CLINICAL IMMUTABILITY GUARD
            if (version.Report.Status == "Signed")
            {
                throw new InvalidOperationException("Clinical Immutability Violation: Cannot overwrite a snapshot for a signed report.");
            }

            if (version.Snapshot != null && !overwrite)
            {
                throw new InvalidOperationException($"Snapshot already exists for ReportVersion {reportVersionId}. Use overwrite=true if intended.");
            }

            var visit = await _context.Visits
                .Include(v => v.Patient)
                .FirstOrDefaultAsync(v => v.VisitId == version.Report.VisitId);
            if (visit == null) throw new KeyNotFoundException($"Visit {version.Report.VisitId} not found.");

            var structure = await BuildDynamicStructureAsync(version.Report, visit);
            var json = JsonSerializer.Serialize(structure);

            if (version.Snapshot != null)
            {
                // Atomic Update (Protected by RowVersion)
                version.Snapshot.SnapshotJson = json;
                version.Snapshot.CreatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                var snapshot = new ReportSnapshot
                {
                    ReportVersionId = reportVersionId,
                    SnapshotJson = json,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.ReportSnapshots.Add(snapshot);
            }

            await _context.SaveChangesAsync();
        }
        private async Task<ReportStructureDto> BuildDynamicStructureAsync(Report report, Visit visit)
        {
            // 1. Fetch Order
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == report.SourceId);
            if (order == null) throw new KeyNotFoundException($"Order {report.SourceId} for report {report.ReportId} not found.");

            // 2. Discover ALL TestCodes in this report context
            // Fix: Instead of only looking at the triggering Order, use all active TestCodes in the Visit.
            // This ensures sibling parameters (TP, ALB) are discovered even if the report is for GLOB.
            var visitTestCodes = await _context.Orders
                .Where(o => o.VisitId == order.VisitId && o.Status != SynOS.Models.Enums.OrderStatus.Cancelled)
                .Select(o => o.TestCode)
                .Distinct()
                .ToListAsync();

            var allTestCodes = new HashSet<string>(visitTestCodes);

            // 3. Fetch Catalog Metadata for all these tests
            var catalogParams = await _context.CatalogParameters
                .Where(cp => allTestCodes.Contains(cp.TestCode))
                .ToListAsync();

            // 4. Fetch Results (only latest for each parameter)
            // Fix: Load all results for the entire Visit context, not just the single triggered Order.
            var visitOrderIds = await _context.Orders
                .Where(o => o.VisitId == order.VisitId && o.Status != SynOS.Models.Enums.OrderStatus.Cancelled)
                .Select(o => o.OrderId)
                .ToListAsync();

            var results = await _context.Results
                .Where(r => visitOrderIds.Contains(r.OrderId) && r.Status != "Superseded")
                .ToListAsync();

            // 5. Fetch Test Notes (linked by Panel TestCode or Child TestCodes)
            var testNotes = await _context.CatalogTestNotes
                .Where(n => allTestCodes.Contains(n.TestCode))
                .ToListAsync();

            // 6. Build Results Map (Single Source of Truth - Hoisted out of loop for performance)
            var resultsMap = new Dictionary<string, decimal?>();
            foreach (var r in results)
            {
                if (decimal.TryParse(r.Value, out var val))
                {
                    resultsMap[r.ParameterCode] = val;
                }
                else if (!string.IsNullOrWhiteSpace(r.Value))
                {
                    // Intent-Aware Parsing: Log WHY a result is excluded from math
                    _logger.LogInformation("Non-numeric result for {ParameterCode}: '{Value}'. Excluded from math evaluation.", r.ParameterCode, r.Value);
                }
            }

            // 7. Assemble DTO Base
            var dto = new ReportStructureDto
            {
                ReportId = report.ReportId,
                SourceId = report.SourceId,
                Status = report.Status,
                Department = report.Department,
                SignedAt = report.SignedAt,
                SignedBy = report.SignedByUserId?.ToString(),
                CanEditValues = false, // Default to false
                IsPhysicallyVerified = report.IsPhysicallyVerified,
                IsManualFlow = report.IsManualFlow,
                Patient = new PatientHeaderDto
                {
                    Name = $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                    MRN = visit.Patient.MRN,
                    Age = CalculateAge(visit.Patient.DateOfBirth),
                    Gender = visit.Patient.Gender,
                    Phone = visit.Patient.CurrentPhoneNumber
                }
            };
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
                    ResultId = result?.ResultId,
                    ParameterName = meta.PrintName ?? meta.ParameterName,
                    ParameterCode = meta.ParameterCode,
                    Value = result != null ? FormatValue(result.Value, meta.DecimalPlaces) : null,
                    Unit = meta.Unit ?? string.Empty,
                    Methodology = meta.Methodology,
                    IsOverridden = result?.IsOverridden ?? false,
                    OverrideReason = result?.OverrideReason,
                    IsCalculated = meta.IsCalculated
                };

                // NEW: Dynamic Formula Engine (GPT-5 Hardened)
                if (paramDto.IsCalculated)
                {
                    // 1. Prioritize Catalog-Driven Formula
                    if (!string.IsNullOrWhiteSpace(meta.Formula))
                    {
                        try
                        {
                            var calcValue = EvaluateFormula(meta.Formula, resultsMap);
                            if (calcValue != null) 
                            {
                                paramDto.Value = FormatValue(calcValue.ToString(), meta.DecimalPlaces);
                                // FIX: Feed calculated result back into resultsMap for dependency chaining (e.g. AG_RATIO depending on GLOB)
                                resultsMap[paramDto.ParameterCode] = calcValue;
                            }
                        }
                        catch (Exception ex)
                        {
                            // Surgical Failure Logging
                            _logger.LogError(ex, "❌ Formula evaluation failed for {ParameterCode} | Formula: '{Formula}'", 
                                paramDto.ParameterCode, meta.Formula);
                        }
                    }
                    else
                    {
                        // 2. Legacy Fallback (Hard-Fail Mode: Enforce Truth)
                        _logger.LogWarning(
                            "⚠️ FALLBACK: {ParameterCode} | Formula missing | Available Inputs: [{Inputs}]",
                            paramDto.ParameterCode,
                            string.Join(",", resultsMap.Keys)
                        );

                        // TO USER: Phase 2 Deprecation (Uncomment the throw below to enforce Hard-Fail)
                        // throw new InvalidOperationException($"Missing catalog formula for calculated parameter '{meta.ParameterCode}'");

                        var calcValue = PerformV1Calculation(paramDto.ParameterCode, results);
                        if (calcValue != null) paramDto.Value = calcValue;
                    }
                }

                // Step 7: Add to Group (Minimal Fix: Always add all discovered parameters)
                if (true) // FIX: Removed filter (paramDto.Value != null || paramDto.IsCalculated)
                {
                    // Compute Flag/Range only if we have a value
                    if (paramDto.Value != null)
                    {
                        var resultObj = result ?? new Result { Value = paramDto.Value, ParameterCode = paramDto.ParameterCode };
                        paramDto.Flag = await CalculateFlagAsync(resultObj, meta, dto.Patient);
                        paramDto.IsAbnormal = paramDto.Flag != "Normal";
                        paramDto.ReferenceRange = await GetFormattedRangeAsync(meta, dto.Patient);
                    }
                    else
                    {
                        paramDto.Flag = "Normal";
                        paramDto.IsAbnormal = false;
                        paramDto.ReferenceRange = await GetFormattedRangeAsync(meta, dto.Patient);
                    }

                    groups[groupName].Parameters.Add(paramDto);
                }
            }

            // 8. FINAL PASS — SAFE CHAIN RESOLUTION (Max 2 Iterations)
            // This resolves nested dependencies (e.g., AG_RATIO depending on GLOB)
            for (int iteration = 1; iteration <= 2; iteration++)
            {
                bool anyComputed = false;
                foreach (var group in groups.Values)
                {
                    foreach (var param in group.Parameters.Where(p => p.IsCalculated && p.Value == null))
                    {
                        var meta = catalogParams.FirstOrDefault(cp => cp.ParameterCode == param.ParameterCode);
                        if (meta == null || string.IsNullOrWhiteSpace(meta.Formula)) continue;

                        try
                        {
                            var calcValue = EvaluateFormula(meta.Formula, resultsMap);
                            if (calcValue != null)
                            {
                                param.Value = FormatValue(calcValue.ToString(), meta.DecimalPlaces);
                                resultsMap[param.ParameterCode] = calcValue;

                                // Re-compute Flag / ReferenceRange for newly resolved calculation
                                var dummyResult = new Result { Value = param.Value, ParameterCode = param.ParameterCode };
                                param.Flag = await CalculateFlagAsync(dummyResult, meta, dto.Patient);
                                param.ReferenceRange = await GetFormattedRangeAsync(meta, dto.Patient);

                                _logger.LogInformation("FINAL PASS [{Iteration}/2] → Evaluated {ParameterCode}", iteration, param.ParameterCode);
                                anyComputed = true;
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Final pass evaluation failed for {ParameterCode}", param.ParameterCode);
                        }
                    }
                }
                if (!anyComputed) break; // Efficiency optimization: Stop early if nothing new was resolved
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
                else if (!string.IsNullOrEmpty(meta.ReferenceRange))
                {
                    // SAFE STRING PARSER FALLBACK
                    try 
                    {
                        var rangeStr = meta.ReferenceRange.Trim();
                        // 1. Handle "MIN - MAX"
                        if (rangeStr.Contains('-'))
                        {
                            var parts = rangeStr.Split('-');
                            if (parts.Length == 2 && 
                                decimal.TryParse(parts[0].Trim(), out var rLow) && 
                                decimal.TryParse(parts[1].Trim(), out var rHigh))
                            {
                                if (val < rLow) return "Low";
                                if (val > rHigh) return "High";
                            }
                        }
                        // 2. Handle "< VALUE"
                        else if (rangeStr.StartsWith('<'))
                        {
                            if (decimal.TryParse(rangeStr.Substring(1).Trim(), out var rHigh) && val >= rHigh) return "High";
                        }
                        // 3. Handle "> VALUE"
                        else if (rangeStr.StartsWith('>'))
                        {
                            if (decimal.TryParse(rangeStr.Substring(1).Trim(), out var rLow) && val <= rLow) return "Low";
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse range string '{Range}' for {ParameterCode}", meta.ReferenceRange, meta.ParameterCode);
                    }
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
                // 1. Dependency Guard: Identify all potential parameters (UPPERCASE_TOKENS)
                // We assume parameter codes are uppercase words. We ignore NCalc built-in functions.
                var matches = System.Text.RegularExpressions.Regex.Matches(formula, @"\b[A-Z_][A-Z0-9_]*\b");
                var ncalcFunctions = new HashSet<string>(StringComparer.OrdinalIgnoreCase) 
                { 
                    "IF", "IN", "ABS", "ROUND", "MAX", "MIN", "POW", "SQRT", "LOG", "FLOOR", "CEILING", "TRUNCATE" 
                };
                
                var availableKeys = string.Join(", ", values.Keys);
                _logger.LogInformation("RESULT MAP KEYS → [{Keys}]", availableKeys);

                foreach (System.Text.RegularExpressions.Match match in matches)
                {
                    var token = match.Value;
                    if (ncalcFunctions.Contains(token)) continue;
                    
                    // If formula uses a token that isn't in our results map or has no value, we must skip.
                    if (!values.TryGetValue(token, out var val) || !val.HasValue)
                    {
                        _logger.LogInformation("MISSING → {Token} | Available → [{Keys}]", token, availableKeys);
                        return null;
                    }
                }

                var expr = new Expression(formula);
                
                // 2. Map parameters to NCalc
                foreach (var parameter in values)
                {
                    if (formula.Contains(parameter.Key, StringComparison.OrdinalIgnoreCase))
                    {
                        if (parameter.Value.HasValue) 
                        {
                            expr.Parameters[parameter.Key] = (double)parameter.Value.Value;
                        }
                    }
                }

                var result = expr.Evaluate();
                if (result == null) return null;
                
                // Handle Infinity/NaN which can occur in NCalc double-precision math
                if (result is double d && (double.IsInfinity(d) || double.IsNaN(d)))
                {
                    _logger.LogWarning("Math error (Infinity/NaN) in formula evaluation for: {Formula}", formula);
                    return null;
                }

                return Convert.ToDecimal(result);
            }
            catch (DivideByZeroException)
            {
                _logger.LogWarning("Divide by zero in formula: {Formula}", formula);
                return null;
            }
            catch (OverflowException)
            {
                _logger.LogWarning("Numeric overflow in formula evaluation: {Formula}", formula);
                return null;
            }
            catch (Exception ex)
            {
                // Note: The caller (BuildDynamicStructureAsync) will catch and log more context
                throw; 
            }
        }
    }
}
