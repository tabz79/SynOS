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
using SynOS.Models.Domain;
using SynOS.Models.Helpers;

namespace SynOS.Services.Reporting
{
    public class ReportingService : IReportingService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ReportingService> _logger;

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, ReportTemplate?> TemplateCache = new();

        public static void ClearTemplateCache()
        {
            TemplateCache.Clear();
        }

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
                    ClinicalReportState? domainState = null;
                    try
                    {
                        using var doc = JsonDocument.Parse(latestVersion.Snapshot.SnapshotJson);
                        if (doc.RootElement.TryGetProperty("columnDefinitions", out _) || doc.RootElement.TryGetProperty("ColumnDefinitions", out _))
                        {
                            domainState = JsonSerializer.Deserialize<ClinicalReportState>(latestVersion.Snapshot.SnapshotJson);
                        }
                    }
                    catch { }

                    ReportStructureDto? snapshotData = null;
                    if (domainState != null)
                    {
                        snapshotData = ReportStructureDto.FromDomain(domainState);
                    }
                    else
                    {
                        snapshotData = JsonSerializer.Deserialize<ReportStructureDto>(latestVersion.Snapshot.SnapshotJson);
                    }

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
                    
                    if (string.IsNullOrEmpty(snapshotData.PatientName) && snapshotData.Patient != null)
                    {
                        snapshotData.PatientName = snapshotData.Patient.Name;
                        snapshotData.PatientAgeGender = $"{snapshotData.Patient.Age} / {snapshotData.Patient.Gender}";
                        snapshotData.Token = snapshotData.Patient.MRN;
                    }
                    
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
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var version = await _context.ReportVersions
                .Include(rv => rv.Report)
                .Include(rv => rv.Snapshot)
                .FirstOrDefaultAsync(rv => rv.ReportVersionId == reportVersionId);
            _logger.LogInformation("CS: Fetch version: {Elapsed} ms", sw.ElapsedMilliseconds); sw.Restart();

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
            _logger.LogInformation("CS: Fetch visit: {Elapsed} ms", sw.ElapsedMilliseconds); sw.Restart();

            if (visit == null) throw new KeyNotFoundException($"Visit {version.Report.VisitId} not found.");

            var buildSw = System.Diagnostics.Stopwatch.StartNew();
            var structure = await BuildDynamicStructureAsync(version.Report, visit);
            _logger.LogInformation("BuildDynamicStructure ...... {Elapsed} ms", buildSw.ElapsedMilliseconds);
            var domainState = structure.ToDomain();
            sw.Restart();

            Order order = null;
            try
            {
                var resolveOrderSw = System.Diagnostics.Stopwatch.StartNew();
                if (version.Report.SourceType == "RadiologyStudy")
                {
                    var study = await _context.RadiologyStudies
                        .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == version.Report.SourceId);
                    if (study != null)
                    {
                        order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == study.VisitTestId);
                    }
                }
                else
                {
                    order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == version.Report.SourceId);
                }
                _logger.LogInformation("CS: Resolve template - Order lookup took {Elapsed} ms", resolveOrderSw.ElapsedMilliseconds);

                var modalitySw = System.Diagnostics.Stopwatch.StartNew();
                var modality = order?.Department ?? "General";
                _logger.LogInformation("CS Resolve: Modality resolve took {Elapsed} ms. Resolved modality value: {Modality}", modalitySw.ElapsedMilliseconds, modality);

                var connection = _context.Database.GetDbConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                {
                    var connSw = System.Diagnostics.Stopwatch.StartNew();
                    await connection.OpenAsync();
                    connSw.Stop();
                    _logger.LogInformation("[FINE INSTRUMENTATION] Connection Open took {Elapsed} ms", connSw.ElapsedMilliseconds);
                }

                var debugSw = System.Diagnostics.Stopwatch.StartNew();
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = "SELECT Name, Modality, IsDefault, IsDeleted FROM ReportTemplates";
                    var debugExecSw = System.Diagnostics.Stopwatch.StartNew();
                    using (var reader = await cmd.ExecuteReaderAsync(System.Data.CommandBehavior.SequentialAccess))
                    {
                        debugExecSw.Stop();
                        _logger.LogInformation("[FINE INSTRUMENTATION] Debug List ExecuteReaderAsync took {Elapsed} ms", debugExecSw.ElapsedMilliseconds);
                        var debugReadSw = System.Diagnostics.Stopwatch.StartNew();
                        while (await reader.ReadAsync())
                        {
                            _logger.LogInformation("CS Resolve Template Row: Name={Name}, Modality={Modality}, IsDefault={IsDefault}, IsDeleted={IsDeleted}",
                                reader.GetString(0), reader.GetString(1), reader.GetBoolean(2), reader.GetBoolean(3));
                        }
                        debugReadSw.Stop();
                        _logger.LogInformation("[FINE INSTRUMENTATION] Debug List Read Loop took {Elapsed} ms", debugReadSw.ElapsedMilliseconds);
                    }
                }
                debugSw.Stop();
                _logger.LogInformation("[FINE INSTRUMENTATION] Total Debug List Query took {Elapsed} ms", debugSw.ElapsedMilliseconds);

                // STEP 1: Query SnapshotMetadataJson FIRST (Two-Query Rule)
                string? snapshotMetadataJson = null;
                var metadataQuerySw = System.Diagnostics.Stopwatch.StartNew();
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = "SELECT TOP(1) SnapshotMetadataJson FROM ReportTemplates WHERE Modality = @Modality AND IsDefault = 1 AND IsDeleted = 0";
                    var param = cmd.CreateParameter();
                    param.ParameterName = "@Modality";
                    param.Value = modality;
                    cmd.Parameters.Add(param);

                    var q1ExecSw = System.Diagnostics.Stopwatch.StartNew();
                    using (var reader = await cmd.ExecuteReaderAsync(System.Data.CommandBehavior.SequentialAccess))
                    {
                        q1ExecSw.Stop();
                        _logger.LogInformation("[FINE INSTRUMENTATION] Metadata Query 1 ExecuteReaderAsync took {Elapsed} ms", q1ExecSw.ElapsedMilliseconds);
                        var q1ReadSw = System.Diagnostics.Stopwatch.StartNew();
                        var hasRow = await reader.ReadAsync();
                        q1ReadSw.Stop();
                        _logger.LogInformation("[FINE INSTRUMENTATION] Metadata Query 1 ReadAsync took {Elapsed} ms (HasRow={HasRow})", q1ReadSw.ElapsedMilliseconds, hasRow);

                        if (hasRow && !reader.IsDBNull(0))
                        {
                            var q1GetSw = System.Diagnostics.Stopwatch.StartNew();
                            snapshotMetadataJson = reader.GetString(0);
                            q1GetSw.Stop();
                            _logger.LogInformation("[FINE INSTRUMENTATION] Metadata Query 1 GetString(0) took {Elapsed} ms (Length={Length})", q1GetSw.ElapsedMilliseconds, snapshotMetadataJson?.Length ?? 0);
                        }
                    }
                }

                // Fallback Metadata Query 1b (Default template) if modality didn't match
                if (string.IsNullOrWhiteSpace(snapshotMetadataJson))
                {
                    using (var cmd = connection.CreateCommand())
                    {
                        cmd.CommandText = "SELECT TOP(1) SnapshotMetadataJson FROM ReportTemplates WHERE IsDefault = 1 AND IsDeleted = 0";
                        var q2ExecSw = System.Diagnostics.Stopwatch.StartNew();
                        using (var reader = await cmd.ExecuteReaderAsync(System.Data.CommandBehavior.SequentialAccess))
                        {
                            q2ExecSw.Stop();
                            _logger.LogInformation("[FINE INSTRUMENTATION] Metadata Query 2 ExecuteReaderAsync took {Elapsed} ms", q2ExecSw.ElapsedMilliseconds);
                            var q2ReadSw = System.Diagnostics.Stopwatch.StartNew();
                            var hasRow = await reader.ReadAsync();
                            q2ReadSw.Stop();
                            _logger.LogInformation("[FINE INSTRUMENTATION] Metadata Query 2 ReadAsync took {Elapsed} ms (HasRow={HasRow})", q2ReadSw.ElapsedMilliseconds, hasRow);

                            if (hasRow && !reader.IsDBNull(0))
                            {
                                var q2GetSw = System.Diagnostics.Stopwatch.StartNew();
                                snapshotMetadataJson = reader.GetString(0);
                                q2GetSw.Stop();
                                _logger.LogInformation("[FINE INSTRUMENTATION] Metadata Query 2 GetString(0) took {Elapsed} ms (Length={Length})", q2GetSw.ElapsedMilliseconds, snapshotMetadataJson?.Length ?? 0);
                            }
                        }
                    }
                }
                metadataQuerySw.Stop();
                _logger.LogInformation("CS Resolve: SnapshotMetadataJson query took {Elapsed} ms. Metadata Length: {Length}", metadataQuerySw.ElapsedMilliseconds, snapshotMetadataJson?.Length ?? 0);

                // STEP 2: Process Metadata if present
                bool metadataResolved = false;
                if (!string.IsNullOrWhiteSpace(snapshotMetadataJson))
                {
                    try
                    {
                        var metadataDto = JsonSerializer.Deserialize<SnapshotMetadataDto>(snapshotMetadataJson);
                        if (metadataDto?.VisibleColumns != null && metadataDto.VisibleColumns.Any())
                        {
                            var mapColumnsSw = System.Diagnostics.Stopwatch.StartNew();
                            domainState.ColumnDefinitions = metadataDto.VisibleColumns.Select((col, idx) => new ColumnDefinitionState
                            {
                                Code = col,
                                Title = col == "Parameter" ? "Test Name" :
                                        col == "Value" ? "Results" :
                                        col == "Unit" ? "Unit" :
                                        col == "ReferenceRange" ? "Normal Range" : col,
                                Weight = metadataDto.ColumnWeights != null && idx < metadataDto.ColumnWeights.Count ? metadataDto.ColumnWeights[idx] : 1,
                                Align = col == "Parameter" ? "Left" :
                                        col == "Value" ? "Center" :
                                        col == "Unit" ? "Center" : "Right",
                                HighlightRule = "None"
                            }).ToList();
                            mapColumnsSw.Stop();
                            metadataResolved = true;
                            _logger.LogInformation("CS Resolve: Map columns from SnapshotMetadataJson took {Elapsed} ms", mapColumnsSw.ElapsedMilliseconds);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse SnapshotMetadataJson. Will attempt fallback to TemplateJson.");
                    }
                }

                // STEP 3: SECONDARY FALLBACK (Only if SnapshotMetadataJson was NULL / missing)
                if (!metadataResolved)
                {
                    _logger.LogInformation("CS Resolve: SnapshotMetadataJson is NULL/empty. Executing Secondary Fallback Query for TemplateJson...");
                    string templateJson = null;
                    using (var cmd = connection.CreateCommand())
                    {
                        cmd.CommandText = "SELECT TOP(1) TemplateJson FROM ReportTemplates WHERE IsDefault = 1 AND IsDeleted = 0";
                        using (var reader = await cmd.ExecuteReaderAsync(System.Data.CommandBehavior.SequentialAccess))
                        {
                            if (await reader.ReadAsync() && !reader.IsDBNull(0))
                            {
                                templateJson = reader.GetString(0);
                            }
                        }
                    }

                    if (templateJson != null)
                    {
                        var templateModel = JsonSerializer.Deserialize<SynOS.Models.DTOs.ReportTemplateDsl.TemplateModel>(templateJson);
                        var parameterTableSection = templateModel?.Sections?.FirstOrDefault(s => s.Type == "ParameterTable");
                        if (parameterTableSection != null)
                        {
                            var tableConfig = JsonSerializer.Deserialize<SynOS.Models.DTOs.ReportTemplateDsl.ParameterTableConfig>(parameterTableSection.Config.GetRawText());
                            if (tableConfig != null && tableConfig.VisibleColumns != null)
                            {
                                domainState.ColumnDefinitions = tableConfig.VisibleColumns.Select((col, idx) => new ColumnDefinitionState
                                {
                                    Code = col,
                                    Title = col == "Parameter" ? "Test Name" :
                                            col == "Value" ? "Results" :
                                            col == "Unit" ? "Unit" :
                                            col == "ReferenceRange" ? "Normal Range" : col,
                                    Weight = tableConfig.ColumnWeights != null && idx < tableConfig.ColumnWeights.Count ? tableConfig.ColumnWeights[idx] : 1,
                                    Align = col == "Parameter" ? "Left" :
                                            col == "Value" ? "Center" :
                                            col == "Unit" ? "Center" : "Right",
                                    HighlightRule = "None"
                                }).ToList();
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load default report template for table config.");
            }
            _logger.LogInformation("CS: Resolve template: {Elapsed} ms", sw.ElapsedMilliseconds); sw.Restart();

            if (domainState.ColumnDefinitions == null || !domainState.ColumnDefinitions.Any())
            {
                domainState.ColumnDefinitions = new List<ColumnDefinitionState>
                {
                    new() { Code = "Parameter", Title = "Test Name", Weight = 3, Align = "Left" },
                    new() { Code = "Value", Title = "Results", Weight = 2, Align = "Center" },
                    new() { Code = "Unit", Title = "Unit", Weight = 1, Align = "Center" },
                    new() { Code = "ReferenceRange", Title = "Normal Range", Weight = 3, Align = "Right" }
                };
            }

            var interpretationData = await _context.ReportInterpretations.AsNoTracking().FirstOrDefaultAsync(ri => ri.ReportId == version.ReportId);
            if (interpretationData != null)
            {
                domainState.Comments = interpretationData.Notes ?? string.Empty;
                domainState.Interpretation = interpretationData.Summary ?? string.Empty;
            }
            else if (order != null)
            {
                var test = await _context.Tests.AsNoTracking().FirstOrDefaultAsync(t => t.TestId == order.TestId);
                if (test != null && !string.IsNullOrWhiteSpace(test.DefaultInterpretation))
                {
                    domainState.Interpretation = test.DefaultInterpretation;
                }
            }
            _logger.LogInformation("CS: Fetch interpretation/tests: {Elapsed} ms", sw.ElapsedMilliseconds); sw.Restart();

            var json = JsonSerializer.Serialize(domainState);

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
            _logger.LogInformation("CS: Prepare snapshot: {Elapsed} ms", sw.ElapsedMilliseconds); sw.Restart();

            await _context.SaveChangesAsync();
            _logger.LogInformation("CS: SaveChangesAsync: {Elapsed} ms", sw.ElapsedMilliseconds);
        }
        private async Task<ReportStructureDto> BuildDynamicStructureAsync(Report report, Visit visit)
        {
            // 1. Fetch Order
            Order order = null;
            if (report.SourceType == "RadiologyStudy")
            {
                var study = await _context.RadiologyStudies
                    .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == report.SourceId);
                if (study != null)
                {
                    order = await _context.Orders
                        .Include(o => o.Test)
                        .FirstOrDefaultAsync(o => o.OrderId == study.VisitTestId);
                }
            }
            else
            {
                order = await _context.Orders
                    .Include(o => o.Test)
                    .FirstOrDefaultAsync(o => o.OrderId == report.SourceId);
            }

            if (order == null) throw new KeyNotFoundException($"Order for report {report.ReportId} not found.");

            // 2. Discover TestCodes in this report context (root order + child orders)
            var reportOrders = await _context.Orders
                .Where(o => (o.OrderId == order.OrderId || o.ParentOrderId == order.OrderId) && o.Status != SynOS.Models.Enums.OrderStatus.Cancelled)
                .ToListAsync();

            var reportTestCodes = reportOrders.Select(o => o.TestCode).Distinct().ToList();
            var allTestCodes = new HashSet<string>(reportTestCodes);

            // 3. Fetch Catalog Metadata for all these tests
            var catalogParams = await _context.CatalogParameters
                .Where(cp => allTestCodes.Contains(cp.TestCode) && cp.IsActive)
                .ToListAsync();

            // 4. Fetch Results (only latest for each parameter) matching this report's orders
            var reportOrderIds = reportOrders.Select(o => o.OrderId).ToList();

            var results = await _context.Results
                .Where(r => reportOrderIds.Contains(r.OrderId) && r.Status != "Superseded")
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
                ReportTemplateId = report.ReportTemplateId ?? order.Test?.ReportTemplateId,
                Status = report.Status,
                PatientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                PatientAgeGender = $"{Utils.ReferenceRangeResolver.CalculateAge(visit.Patient.DateOfBirth, visit.TokenDate)} / {visit.Patient.Gender}",
                Token = visit.Token,
                Department = report.Department,
                SignedAt = report.SignedAt,
                SignedBy = report.SignedByUserId?.ToString(),
                CanEditValues = report.Status == "Draft" || report.Status == "ReadyForVerification",
                IsPhysicallyVerified = report.IsPhysicallyVerified,
                IsManualFlow = report.IsManualFlow,
                Patient = new PatientHeaderDto
                {
                    Name = $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                    MRN = visit.Patient.MRN,
                    Age = Utils.ReferenceRangeResolver.CalculateAge(visit.Patient.DateOfBirth, visit.TokenDate),
                    Gender = visit.Patient.Gender,
                    Phone = visit.Patient.CurrentPhoneNumber,
                    DateOfBirth = visit.Patient.DateOfBirth.ToString("yyyy-MM-dd")
                }
            };
            var groups = new Dictionary<string, ReportGroupDto>();

            // Retrieve sequence mapping for the root test if it is a profile
            var childTestSequences = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            if (order.Test != null && order.Test.IsProfile)
            {
                var childMappings = await _context.ProfileMaps
                    .Where(pm => pm.ParentTestId == order.Test.TestId)
                    .OrderBy(pm => pm.Sequence)
                    .ToListAsync();
                
                int seq = 1;
                foreach (var mapping in childMappings)
                {
                    var childTest = await _context.Tests.FindAsync(mapping.ChildTestId);
                    if (childTest != null)
                    {
                        childTestSequences[childTest.TestCode] = seq++;
                    }
                }
            }

            int GetTestSequence(string testCode)
            {
                if (string.Equals(testCode, order.TestCode, StringComparison.OrdinalIgnoreCase))
                {
                    return childTestSequences.Count + 1; // Profile native parameters come last
                }
                if (childTestSequences.TryGetValue(testCode, out var seq))
                {
                    return seq;
                }
                return 0; // Standalone or default
            }

            // Iterate through catalog structure instead of flat results to support panels/placeholders
            var sortedCatalogParams = catalogParams
                .OrderBy(cp => cp.DisplayGroupOrder)
                .ThenBy(cp => GetTestSequence(cp.TestCode))
                .ThenBy(cp => cp.SortOrder)
                .ToList();

            foreach (var meta in sortedCatalogParams)
            {
                var groupName = meta.DisplayGroup ?? "General";
                if (string.IsNullOrWhiteSpace(groupName) || string.Equals(groupName, "General", StringComparison.OrdinalIgnoreCase))
                {
                    groupName = string.Empty;
                }
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
                    IsCalculated = meta.IsCalculated || !string.IsNullOrWhiteSpace(meta.Formula),
                    HasFormula = meta.IsCalculated || !string.IsNullOrWhiteSpace(meta.Formula),
                    Formula = meta.Formula,
                    NarrativeTemplate = meta.NarrativeTemplate,
                    ShowNarrative = meta.ShowNarrative
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
                        paramDto.Flag = await CalculateFlagAsync(resultObj, meta, dto.Patient, visit.TokenDate);
                        paramDto.IsAbnormal = paramDto.Flag != "Normal";
                        paramDto.ReferenceRange = await GetFormattedRangeAsync(meta, dto.Patient, visit.TokenDate);
                    }
                    else
                    {
                        paramDto.Flag = "Normal";
                        paramDto.IsAbnormal = false;
                        paramDto.ReferenceRange = await GetFormattedRangeAsync(meta, dto.Patient, visit.TokenDate);
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
                                param.Flag = await CalculateFlagAsync(dummyResult, meta, dto.Patient, visit.TokenDate);
                                param.ReferenceRange = await GetFormattedRangeAsync(meta, dto.Patient, visit.TokenDate);

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

        private async Task<string> CalculateFlagAsync(Result result, CatalogParameter meta, PatientHeaderDto patient, DateTime referenceDate)
        {
            if (decimal.TryParse(result.Value, out var val) && meta != null)
            {
                // Parse patient DOB to calculate age category
                DateTime dob;
                if (!DateTime.TryParse(patient.DateOfBirth, out dob))
                {
                    dob = referenceDate.AddYears(-patient.Age);
                }

                // Find matching demographic range in ReferenceRanges table using centralized resolver
                var range = await Utils.ReferenceRangeResolver.ResolveRangeEntityAsync(_context, result.ParameterCode, patient.Gender, dob, referenceDate);

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

        private async Task<string> GetFormattedRangeAsync(CatalogParameter meta, PatientHeaderDto patient, DateTime referenceDate)
        {
            if (meta == null) return string.Empty;

            DateTime dob;
            if (!DateTime.TryParse(patient.DateOfBirth, out dob))
            {
                dob = referenceDate.AddYears(-patient.Age);
            }

            return await Utils.ReferenceRangeResolver.ResolveRangeAsync(_context, meta.ParameterCode, patient.Gender, dob, referenceDate);
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

                // Globulin (GLOB) = Total Protein (TP/T_P) - Albumin (ALB)
                if (code == "GLOB" || code == "GLOBULIN")
                {
                    var tp = GetValue(allResults, "TP") ?? GetValue(allResults, "T_P") ?? GetValue(allResults, "TOTAL_PROTEIN");
                    var alb = GetValue(allResults, "ALB") ?? GetValue(allResults, "ALBUMIN");
                    if (tp.HasValue && alb.HasValue) return (tp.Value - alb.Value).ToString("F2");
                }

                // A/G Ratio = Albumin / Globulin
                if (code == "AG_RATIO" || code == "ALB : GLOB")
                {
                    var alb = GetValue(allResults, "ALB") ?? GetValue(allResults, "ALBUMIN");
                    var tp = GetValue(allResults, "TP") ?? GetValue(allResults, "T_P") ?? GetValue(allResults, "TOTAL_PROTEIN");
                    if (alb.HasValue && tp.HasValue) 
                    {
                        var glob = tp.Value - alb.Value;
                        if (glob != 0)
                        {
                            return (alb.Value / glob).ToString("F2");
                        }
                        else
                        {
                            return "-";
                        }
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

    public static class TemplateQueryDiagnostics
    {
        public static string SqlQueryText = "";
        public static long SqlStartTimestamp = 0;
        public static long SqlDurationMs = 0;
        public static int RowsReturned = 0;
        public static long BytesReturned = 0;
        public static readonly object Lock = new();

        public static void Reset()
        {
            lock (Lock)
            {
                SqlQueryText = "";
                SqlStartTimestamp = 0;
                SqlDurationMs = 0;
                RowsReturned = 0;
                BytesReturned = 0;
            }
        }
    }

    public class TemplateQueryInterceptor : Microsoft.EntityFrameworkCore.Diagnostics.DbCommandInterceptor
    {
        public override Microsoft.EntityFrameworkCore.Diagnostics.InterceptionResult<System.Data.Common.DbDataReader> ReaderExecuting(
            System.Data.Common.DbCommand command, 
            Microsoft.EntityFrameworkCore.Diagnostics.CommandEventData eventData, 
            Microsoft.EntityFrameworkCore.Diagnostics.InterceptionResult<System.Data.Common.DbDataReader> result)
        {
            if (command.CommandText.Contains("ReportTemplates"))
            {
                lock (TemplateQueryDiagnostics.Lock)
                {
                    TemplateQueryDiagnostics.SqlQueryText = command.CommandText;
                    TemplateQueryDiagnostics.SqlStartTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                }
                // Console.WriteLine("[TemplateQueryInterceptor] SQL starts");
            }
            return base.ReaderExecuting(command, eventData, result);
        }

        public override System.Threading.Tasks.ValueTask<Microsoft.EntityFrameworkCore.Diagnostics.InterceptionResult<System.Data.Common.DbDataReader>> ReaderExecutingAsync(
            System.Data.Common.DbCommand command, 
            Microsoft.EntityFrameworkCore.Diagnostics.CommandEventData eventData, 
            Microsoft.EntityFrameworkCore.Diagnostics.InterceptionResult<System.Data.Common.DbDataReader> result, 
            System.Threading.CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("ReportTemplates"))
            {
                lock (TemplateQueryDiagnostics.Lock)
                {
                    TemplateQueryDiagnostics.SqlQueryText = command.CommandText;
                    TemplateQueryDiagnostics.SqlStartTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                }
                // Console.WriteLine("[TemplateQueryInterceptor] SQL starts");
            }
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }

        public override System.Data.Common.DbDataReader ReaderExecuted(
            System.Data.Common.DbCommand command, 
            Microsoft.EntityFrameworkCore.Diagnostics.CommandExecutedEventData eventData, 
            System.Data.Common.DbDataReader result)
        {
            if (command.CommandText.Contains("ReportTemplates"))
            {
                lock (TemplateQueryDiagnostics.Lock)
                {
                    TemplateQueryDiagnostics.SqlDurationMs = (long)eventData.Duration.TotalMilliseconds;
                }
                // Console.WriteLine($"[TemplateQueryInterceptor] SQL finishes. Duration: {eventData.Duration.TotalMilliseconds} ms");
                return new DiagnosticDataReader(result);
            }
            return base.ReaderExecuted(command, eventData, result);
        }

        public override System.Threading.Tasks.ValueTask<System.Data.Common.DbDataReader> ReaderExecutedAsync(
            System.Data.Common.DbCommand command, 
            Microsoft.EntityFrameworkCore.Diagnostics.CommandExecutedEventData eventData, 
            System.Data.Common.DbDataReader result, 
            System.Threading.CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("ReportTemplates"))
            {
                lock (TemplateQueryDiagnostics.Lock)
                {
                    TemplateQueryDiagnostics.SqlDurationMs = (long)eventData.Duration.TotalMilliseconds;
                }
                // Console.WriteLine($"[TemplateQueryInterceptor] SQL finishes. Duration: {eventData.Duration.TotalMilliseconds} ms");
                return new System.Threading.Tasks.ValueTask<System.Data.Common.DbDataReader>(new DiagnosticDataReader(result));
            }
            return base.ReaderExecutedAsync(command, eventData, result, cancellationToken);
        }

        private class DiagnosticDataReader : System.Data.Common.DbDataReader
        {
            private readonly System.Data.Common.DbDataReader _inner;

            public DiagnosticDataReader(System.Data.Common.DbDataReader inner)
            {
                _inner = inner;
            }

            public override bool Read()
            {
                var hasRow = _inner.Read();
                if (hasRow)
                {
                    lock (TemplateQueryDiagnostics.Lock)
                    {
                        TemplateQueryDiagnostics.RowsReturned++;
                        UpdateBytes();
                    }
                }
                else
                {
                    // Console.WriteLine($"[TemplateQueryInterceptor] End of Read. Rows: {TemplateQueryDiagnostics.RowsReturned}, Bytes: {TemplateQueryDiagnostics.BytesReturned}");
                }
                return hasRow;
            }

            public override async System.Threading.Tasks.Task<bool> ReadAsync(System.Threading.CancellationToken cancellationToken)
            {
                var hasRow = await _inner.ReadAsync(cancellationToken);
                if (hasRow)
                {
                    lock (TemplateQueryDiagnostics.Lock)
                    {
                        TemplateQueryDiagnostics.RowsReturned++;
                        UpdateBytes();
                    }
                }
                else
                {
                    // Console.WriteLine($"[TemplateQueryInterceptor] End of Read. Rows: {TemplateQueryDiagnostics.RowsReturned}, Bytes: {TemplateQueryDiagnostics.BytesReturned}");
                }
                return hasRow;
            }

            private void UpdateBytes()
            {
                for (int i = 0; i < _inner.FieldCount; i++)
                {
                    if (!_inner.IsDBNull(i))
                    {
                        var val = _inner.GetValue(i);
                        if (val is string s)
                        {
                            TemplateQueryDiagnostics.BytesReturned += s.Length * 2; // UTF-16
                        }
                        else if (val is byte[] b)
                        {
                            TemplateQueryDiagnostics.BytesReturned += b.Length;
                        }
                        else if (val is Guid)
                        {
                            TemplateQueryDiagnostics.BytesReturned += 16;
                        }
                        else if (val is DateTime || val is DateTimeOffset)
                        {
                            TemplateQueryDiagnostics.BytesReturned += 8;
                        }
                        else if (val is int)
                        {
                            TemplateQueryDiagnostics.BytesReturned += 4;
                        }
                        else if (val is bool)
                        {
                            TemplateQueryDiagnostics.BytesReturned += 1;
                        }
                        else
                        {
                            TemplateQueryDiagnostics.BytesReturned += 8;
                        }
                    }
                }
            }

            public override object this[int ordinal] => _inner[ordinal];
            public override object this[string name] => _inner[name];
            public override int Depth => _inner.Depth;
            public override int FieldCount => _inner.FieldCount;
            public override bool HasRows => _inner.HasRows;
            public override bool IsClosed => _inner.IsClosed;
            public override int RecordsAffected => _inner.RecordsAffected;

            public override bool GetBoolean(int ordinal) => _inner.GetBoolean(ordinal);
            public override byte GetByte(int ordinal) => _inner.GetByte(ordinal);
            public override long GetBytes(int ordinal, long dataOffset, byte[]? buffer, int bufferOffset, int length) => _inner.GetBytes(ordinal, dataOffset, buffer, bufferOffset, length);
            public override char GetChar(int ordinal) => _inner.GetChar(ordinal);
            public override long GetChars(int ordinal, long dataOffset, char[]? buffer, int bufferOffset, int length) => _inner.GetChars(ordinal, dataOffset, buffer, bufferOffset, length);
            public override string GetDataTypeName(int ordinal) => _inner.GetDataTypeName(ordinal);
            public override DateTime GetDateTime(int ordinal) => _inner.GetDateTime(ordinal);
            public override decimal GetDecimal(int ordinal) => _inner.GetDecimal(ordinal);
            public override double GetDouble(int ordinal) => _inner.GetDouble(ordinal);
            public override Type GetFieldType(int ordinal) => _inner.GetFieldType(ordinal);
            public override float GetFloat(int ordinal) => _inner.GetFloat(ordinal);
            public override Guid GetGuid(int ordinal) => _inner.GetGuid(ordinal);
            public override short GetInt16(int ordinal) => _inner.GetInt16(ordinal);
            public override int GetInt32(int ordinal) => _inner.GetInt32(ordinal);
            public override long GetInt64(int ordinal) => _inner.GetInt64(ordinal);
            public override string GetName(int ordinal) => _inner.GetName(ordinal);
            public override int GetOrdinal(string name) => _inner.GetOrdinal(name);
            public override string GetString(int ordinal) => _inner.GetString(ordinal);
            public override object GetValue(int ordinal) => _inner.GetValue(ordinal);
            public override int GetValues(object[] values) => _inner.GetValues(values);
            public override bool IsDBNull(int ordinal) => _inner.IsDBNull(ordinal);
            public override bool NextResult() => _inner.NextResult();
            public override async System.Threading.Tasks.Task<bool> NextResultAsync(System.Threading.CancellationToken cancellationToken) => await _inner.NextResultAsync(cancellationToken);
            public override void Close() => _inner.Close();
            public override System.Collections.IEnumerator GetEnumerator() => ((System.Collections.IEnumerable)_inner).GetEnumerator();
        }
    }
}
