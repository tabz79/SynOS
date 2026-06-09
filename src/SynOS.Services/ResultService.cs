// ResultService.cs - cleaned up to match the current DTOs and still trigger critical alerts

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection; // Added for IServiceProvider
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

using SynOS.Services.Operations; // ADDED

namespace SynOS.Services
{
    public class ResultService : IResultService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ResultService> _logger;
        private readonly ICriticalValueService _criticalValueService;
        private readonly IServiceProvider _serviceProvider;
        private readonly IOperationsEngine _operationsEngine; // ADDED

        public ResultService(
            SynOSDbContext context,
            ILogger<ResultService> logger,
            ICriticalValueService criticalValueService,
            IServiceProvider serviceProvider,
            IOperationsEngine operationsEngine) // ADDED
        {
            _context = context;
            _logger = logger;
            _criticalValueService = criticalValueService;
            _serviceProvider = serviceProvider;
            _operationsEngine = operationsEngine ?? throw new ArgumentNullException(nameof(operationsEngine)); // ADDED
        }

        public async Task<IEnumerable<ResultDto>> GetResultsForOrderAsync(Guid orderId)
        {
            return await _context.Results
                .Where(r => r.OrderId == orderId)
                .Select(r => new ResultDto
                {
                    ResultId = r.ResultId,
                    ParameterCode = r.ParameterCode,
                    Value = r.Value,
                    Flag = r.Flag,
                    Status = r.Status
                })
                .ToListAsync();
        }

        public async Task<SynOS.Models.DTOs.ResultEntryResponseDto> EnterResultsAsync(Guid userId, ResultEntryRequestDto request)
        {
            _logger.LogInformation("EnterResultsAsync START → userId={UserId}, request.OrderId={OrderId}", userId, request.OrderId);
            
            // --- STEP 5 CORRECTION: GATE FIRST ---
            _logger.LogInformation("Before HandleProcessingGatingAsync");
            var gatingResult = await HandleProcessingGatingAsync(userId, request);
            _logger.LogInformation("After HandleProcessingGatingAsync. Status={Status}", gatingResult.Status);

            if (gatingResult.Status != SynOS.Models.DTOs.ResultEntryStatus.Success)
            {
                return gatingResult;
            }

            var resultsToUpsert = new List<Result>();

            foreach (var resultDto in request.Results)
            {
                var existingResult = await _context.Results
                    .FirstOrDefaultAsync(r =>
                        r.OrderId == request.OrderId &&
                        r.ParameterCode == resultDto.ParameterCode);

                if (existingResult != null)
                {
                    // GPT-5: Clinical Flag Update
                    var catalogParam = await _context.CatalogParameters.FirstOrDefaultAsync(p => p.ParameterCode == resultDto.ParameterCode && p.IsActive);
                    existingResult.Flag = CalculateFlag(resultDto.Value, catalogParam?.ReferenceRange);
                    existingResult.ReferenceRange = catalogParam?.ReferenceRange;
                    existingResult.Unit = catalogParam?.Unit;

                    existingResult.Value = resultDto.Value;
                    existingResult.TechComments = resultDto.TechComments;
                    existingResult.EnteredAt = DateTime.UtcNow;

                    resultsToUpsert.Add(existingResult);
                }
                else
                {
                    // GPT-5: Clinical Flag Calculation
                    var catalogParam = await _context.CatalogParameters.FirstOrDefaultAsync(p => p.ParameterCode == resultDto.ParameterCode && p.IsActive);
                    var flag = CalculateFlag(resultDto.Value, catalogParam?.ReferenceRange);

                    var newResult = new Result
                    {
                        ResultId = Guid.NewGuid(),
                        OrderId = request.OrderId,
                        ParameterCode = resultDto.ParameterCode,
                        Value = resultDto.Value,
                        Flag = flag,
                        ReferenceRange = catalogParam?.ReferenceRange,
                        Unit = catalogParam?.Unit,
                        TechComments = resultDto.TechComments,
                        EnteredByUserId = userId,
                        EnteredAt = DateTime.UtcNow,
                        Status = "Draft"
                    };

                    _context.Results.Add(newResult);
                    resultsToUpsert.Add(newResult);
                }
            }

            await _context.SaveChangesAsync();

            // Notify Operations Engine
            var firstResult = resultsToUpsert.FirstOrDefault();
            if (firstResult != null)
            {
                var visitId = await _context.Orders
                    .Where(o => o.OrderId == request.OrderId)
                    .Select(o => o.VisitId)
                    .FirstOrDefaultAsync();

                if (visitId != Guid.Empty)
                {
                    await _operationsEngine.RecordResultDraftStartedAsync(visitId, firstResult.ResultId, userId);
                }
            }

            // After saving, check critical values
            foreach (var result in resultsToUpsert)
            {
                try
                {
                    await _criticalValueService.CheckAndCreateCriticalAlertAsync(result.ResultId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while checking critical value for ResultId {ResultId}", result.ResultId);
                }
            }

            return new SynOS.Models.DTOs.ResultEntryResponseDto
            {
                Status = SynOS.Models.DTOs.ResultEntryStatus.Success,
                Results = resultsToUpsert.Select(r => new ResultDto
                {
                    ResultId = r.ResultId,
                    ParameterCode = r.ParameterCode,
                    Value = r.Value,
                    Status = r.Status,
                    Flag = r.Flag
                })
            };
        }

        public async Task AutosaveResultsAsync(Guid userId, AutosaveRequestDto request)
        {
            var buffer = await _context.AutosaveBuffers
                .FirstOrDefaultAsync(b =>
                    b.UserId == userId &&
                    b.EntityType == "OrderResults" &&
                    b.EntityId == request.OrderId);

            if (buffer == null)
            {
                buffer = new AutosaveBuffer
                {
                    UserId = userId,
                    EntityType = "OrderResults",
                    EntityId = request.OrderId
                };
                _context.AutosaveBuffers.Add(buffer);
            }

            buffer.DraftJson = request.DraftJson;
            buffer.SavedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<string?> RecoverAutosaveAsync(Guid userId, Guid orderId)
        {
            var buffer = await _context.AutosaveBuffers
                .AsNoTracking()
                .FirstOrDefaultAsync(b =>
                    b.UserId == userId &&
                    b.EntityType == "OrderResults" &&
                    b.EntityId == orderId);

            return buffer?.DraftJson;
        }

        public async Task SubmitForVerificationAsync(Guid orderId)
        {
            var results = await _context.Results
                .Where(r => r.OrderId == orderId)
                .ToListAsync();

            if (!results.Any())
            {
                _logger.LogWarning("SubmitForVerification called for OrderId {OrderId} with no results", orderId);
                return;
            }

            foreach (var r in results)
            {
                if (string.Equals(r.Status, "Draft", StringComparison.OrdinalIgnoreCase))
                {
                    r.Status = "PendingVerification";
                }
            }

            // 1. Resolve Root Order (Climb the hierarchy)
            var currentOrder = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (currentOrder == null)
            {
                throw new KeyNotFoundException($"Order with ID {orderId} not found when trying to create report.");
            }

            var rootOrder = currentOrder;
            while (rootOrder.ParentOrderId != null)
            {
                var parent = await _context.Orders.FindAsync(rootOrder.ParentOrderId);
                if (parent == null) break;
                rootOrder = parent;
            }

            // 2. Visit-Scoped Lookup for existing report
            var report = await _context.Reports
                .Include(r => r.ReportVersions)
                .FirstOrDefaultAsync(r => 
                    r.SourceId == rootOrder.OrderId && 
                    r.VisitId == currentOrder.VisitId && 
                    r.SourceType == "Order");

            // SURGICAL FIX: Status Shield (GPT-5 Rule)
            if (report != null && (report.Status == "Signed" || report.Status == "ManualVerified"))
            {
                _logger.LogWarning("Blocking lab update for RootOrderId {RootOrderId} because report {ReportId} is already FINALIZED ({Status}).", 
                    rootOrder.OrderId, report.ReportId, report.Status);
                throw new InvalidOperationException($"Cannot update results for a finalized report ({report.Status}). Please contact a supervisor to reopen the case.");
            }

            if (report == null)
            {
                var finalRootOrder = rootOrder.OrderId == currentOrder.OrderId 
                    ? currentOrder 
                    : await _context.Orders
                        .Include(o => o.Visit)
                            .ThenInclude(v => v.Patient)
                        .Include(o => o.Test)
                        .FirstOrDefaultAsync(o => o.OrderId == rootOrder.OrderId);

                if (finalRootOrder == null) throw new KeyNotFoundException("Root order context lost.");

                // If finalRootOrder was currentOrder, make sure Test is loaded
                if (finalRootOrder.Test == null)
                {
                    await _context.Entry(finalRootOrder).Reference(o => o.Test).LoadAsync();
                }

                report = new Report
                {
                    ReportId = Guid.NewGuid(),
                    SourceId = finalRootOrder.OrderId,
                    SourceType = "Order",
                    VisitId = finalRootOrder.VisitId,
                    PatientId = finalRootOrder.Visit.Patient.PatientId,
                    Department = finalRootOrder.Department,
                    ReportTemplateId = finalRootOrder.Test?.ReportTemplateId,
                    Status = "Draft", // Corrected per GPT-5: Lab submits to Draft, Typist pushes to Ready
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                await _context.Reports.AddAsync(report);
            }
            else
            {
                // MAINTAIN STATUS: If already Draft or NULL, keep Draft. If already ReadyForVerification, keep it.
                if (string.IsNullOrEmpty(report.Status) || report.Status == "Draft")
                {
                    report.Status = "Draft";
                }
                // Do not downgrade status if it's e.g. ReadyForVerification
                report.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await _context.SaveChangesAsync();

            // 3. Snapshot Management (Idempotent & Scoped)
            using (var scope = _serviceProvider.CreateScope())
            {
                var reportingService = scope.ServiceProvider.GetRequiredService<Reporting.IReportingService>();
                
                // For "Draft" visibility before signing, we ensure a version exists and has a snapshot
                if (report.CurrentVersion == 0)
                {
                    await CreateNewVersionAndSnapshotAsync(report, reportingService);
                }
                else
                {
                    // Update the existing latest snapshot (since it's not signed yet)
                    var latestVersion = await _context.ReportVersions
                        .Where(rv => rv.ReportId == report.ReportId && rv.VersionNumber == report.CurrentVersion)
                        .FirstOrDefaultAsync();
                    
                    if (latestVersion != null)
                    {
                        await reportingService.CreateSnapshotAsync(latestVersion.ReportVersionId, overwrite: true);
                    }
                }
            }

            // Notify Operations Engine
            await _operationsEngine.RecordReportReadyAsync(report.VisitId, report.ReportId, Guid.Empty);

            // --- BEGIN COST ATTRIBUTION WIRING ---
            try
            {
                await OrchestrateCostAttributionForOrderAsync(orderId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cost attribution failed for OrderId {OrderId}", orderId);
            }
            // --- END COST ATTRIBUTION WIRING ---
        }

        private async Task CreateNewVersionAndSnapshotAsync(Report report, Reporting.IReportingService reportingService)
        {
            var newVersionNumber = report.CurrentVersion + 1;
            var reportVersion = new ReportVersion
            {
                ReportVersionId = Guid.NewGuid(),
                ReportId = report.ReportId,
                VersionNumber = newVersionNumber,
                CreatedAt = DateTimeOffset.UtcNow
            };

            report.CurrentVersion = newVersionNumber;
            _context.ReportVersions.Add(reportVersion);
            await _context.SaveChangesAsync();

            await reportingService.CreateSnapshotAsync(reportVersion.ReportVersionId, overwrite: false);
        }

        private async Task OrchestrateCostAttributionForOrderAsync(Guid orderId)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var policyResolver = scope.ServiceProvider.GetRequiredService<CostAttribution.ICostAttributionPolicyResolver>();
                var factWriter = scope.ServiceProvider.GetRequiredService<CostAttribution.ICostAttributionUsageFactWriter>();
                
                var order = await _context.Orders
                    .Include(o => o.Visit)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(o => o.OrderId == orderId);

                if (order?.Visit == null)
                {
                    _logger.LogWarning("Cost attribution skipped: Order or Visit not found for OrderId {OrderId}", orderId);
                    return;
                }

                var policies = await _context.CostAttribution_UsagePolicies
                    .AsNoTracking()
                    .Where(p => p.TestId == order.TestId && p.IsActive)
                    .ToListAsync();

                if (!policies.Any())
                {
                    return; // No policies for this test
                }

                var triggerEvent = new Models.Events.CostAttribution.CostingTriggerEvent
                {
                    SourceEventId = orderId,
                    SourceEventType = Models.Entities.CostAttribution.CostAttribution_SourceEventType.TestExecution,
                    TestId = order.TestId,
                    BranchId = order.Visit.BranchId ?? Guid.Empty,
                    OccurredAt = DateTimeOffset.UtcNow
                };

                foreach (var policy in policies)
                {
                    var policyVersion = await policyResolver.ResolvePolicyVersionAsync(
                        order.TestId,
                        policy.InventoryItemId,
                        triggerEvent.BranchId,
                        triggerEvent.OccurredAt);

                    if (policyVersion != null)
                    {
                        policyVersion.UsagePolicy = policy;
                        await factWriter.WriteUsageFactAsync(policyVersion, triggerEvent);
                    }
                }
            }
        }

        public async Task<IEnumerable<ResultDto>> GetPatientHistoryForParameterAsync(
            Guid patientId,
            string parameterCode,
            int limit = 3)
        {
            // Join Results -> Orders -> Visits to filter by patient
            var query =
                from r in _context.Results
                join o in _context.Orders on r.OrderId equals o.OrderId
                join v in _context.Visits on o.VisitId equals v.VisitId
                where v.PatientId == patientId && r.ParameterCode == parameterCode
                orderby r.EnteredAt descending
                select new ResultDto
                {
                    ResultId = r.ResultId,
                    ParameterCode = r.ParameterCode,
                    Value = r.Value,
                    Flag = r.Flag,
                    Status = r.Status
                };

            return await query.Take(limit).ToListAsync();
        }

        public async Task<ResultDto> ReplaceResultAsync(Guid oldResultId, Guid userId, string newValue, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Reason for replacing result is required.", nameof(reason));
            }

            var oldResult = await _context.Results
                .Include(r => r.Order) // To potentially access order details for audit
                .FirstOrDefaultAsync(r => r.ResultId == oldResultId);

            if (oldResult == null)
            {
                throw new InvalidOperationException($"Result {oldResultId} not found.");
            }

            var newResult = new Result
            {
                ResultId = Guid.NewGuid(),
                OrderId = oldResult.OrderId,
                ParameterCode = oldResult.ParameterCode,
                Value = newValue,
                TechComments = oldResult.TechComments,
                EnteredByUserId = userId,
                EnteredAt = DateTime.UtcNow, // Use DateTime.UtcNow for consistency with Result.EnteredAt
                Status = "Draft" // New results start as Draft
            };

            // Create audit entry
            var audit = new ResultChangeAudit
            {
                AuditId = Guid.NewGuid(),
                ResultId = oldResult.ResultId,
                OldValue = oldResult.Value ?? string.Empty,
                NewValue = newValue,
                ChangedByUserId = userId,
                ChangedAt = DateTimeOffset.UtcNow,
                Reason = reason,
                Source = "Replace"
            };

            oldResult.Status = "Superseded";
            oldResult.SupersededByResultId = newResult.ResultId;

            _context.Results.Add(newResult);
            _context.ResultChangeAudits.Add(audit); // Add audit entry

            await _context.SaveChangesAsync(); // Save changes in a single transaction

            // Re-run critical alert on the new value
            try
            {
                await _criticalValueService.CheckAndCreateCriticalAlertAsync(newResult.ResultId);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error while checking critical value for superseded ResultId {ResultId}",
                    newResult.ResultId);
            }

            return new ResultDto
            {
                ResultId = newResult.ResultId,
                ParameterCode = newResult.ParameterCode,
                Value = newResult.Value,
                Status = newResult.Status,
                Flag = newResult.Flag
            };
        }

        public async Task<ResultDto> ModifyResultAsync(Guid resultId, Guid userId, string newValue, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Reason for modifying result is required.", nameof(reason));
            }

            var result = await _context.Results.FirstOrDefaultAsync(r => r.ResultId == resultId);

            if (result == null)
            {
                throw new InvalidOperationException($"Result {resultId} not found.");
            }

            var oldValue = result.Value;

            // Create audit entry before change
            var audit = new ResultChangeAudit
            {
                AuditId = Guid.NewGuid(),
                ResultId = result.ResultId,
                OldValue = oldValue ?? string.Empty,
                NewValue = newValue,
                ChangedByUserId = userId,
                ChangedAt = DateTimeOffset.UtcNow,
                Reason = reason,
                Source = "Modify"
            };

            _context.ResultChangeAudits.Add(audit);

            // Update existing result
            result.Value = newValue;
            result.EnteredByUserId = userId; // Keep track of who last touched it
            result.EnteredAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Re-run critical alert on the modified value
            try
            {
                await _criticalValueService.CheckAndCreateCriticalAlertAsync(result.ResultId);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error while checking critical value for modified ResultId {ResultId}",
                    result.ResultId);
            }

            return new ResultDto
            {
                ResultId = result.ResultId,
                ParameterCode = result.ParameterCode,
                Value = result.Value,
                Status = result.Status,
                Flag = result.Flag
            };
        }

        public async Task<IReadOnlyList<ResultChangeAudit>> GetResultAuditHistoryAsync(Guid resultId)
        {
            return await _context.ResultChangeAudits
                .Include(a => a.ChangedByUser)
                .Where(a => a.ResultId == resultId)
                .OrderByDescending(a => a.ChangedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task DeliverReportAsync(Guid orderId)
        {
            // Before delivering a report (e.g., printing, sending via email),
            // this method should check for unacknowledged critical alerts.
            
            // 1. Check if the order has any associated critical alerts:
            var hasCriticals = await _context.CriticalAlerts.AnyAsync(a => a.Result.OrderId == orderId);
            
            // 2. If it does, check if all of them are acknowledged:
            if (hasCriticals)
            {
                var allAcknowledged = !await _context.CriticalAlerts
                    .AnyAsync(a => a.Result.OrderId == orderId && a.Status != "Acknowledged");
            
                if (!allAcknowledged)
                {
                    throw new InvalidOperationException("Cannot deliver report. Critical alerts for this order have not been acknowledged by a specialist.");
                }
            }
            
            // 3. Proceed with report delivery logic...
            _logger.LogInformation("Report for order {OrderId} is cleared for delivery.", orderId);
        }

        private async Task<SynOS.Models.DTOs.ResultEntryResponseDto> HandleProcessingGatingAsync(Guid userId, ResultEntryRequestDto request)
        {
            _logger.LogInformation("GATING CHECK HIT for Order {OrderId}", request.OrderId);
            
            // SURGICAL FIX: If caller already resolved specimen, bypass redundant lookups and re-computation
            if (request.SpecimenId.HasValue && request.SpecimenId != Guid.Empty)
            {
                _logger.LogInformation("GATING BYPASSED → specimenId={SpecimenId} provided by caller", request.SpecimenId);
                return new SynOS.Models.DTOs.ResultEntryResponseDto { Status = SynOS.Models.DTOs.ResultEntryStatus.Success };
            }

            // 1. Fetch SpecimenId associated with this Order
            var specimenId = await _context.Orders
                .Where(o => o.OrderId == request.OrderId)
                .Select(o => (Guid?)o.SpecimenId) // Cast to nullable Guid for safety
                .FirstOrDefaultAsync();

            if (specimenId == null) return new SynOS.Models.DTOs.ResultEntryResponseDto { Status = SynOS.Models.DTOs.ResultEntryStatus.Success }; // Compatibility

            // 2. Fetch Incomplete Assignments (Including Assignee Context)
            var incompleteAssignments = await _context.ProcessingAssignments
                .Where(a => a.SpecimenId == specimenId && a.Status != SynOS.Models.Enums.ProcessingAssignmentStatus.Completed)
                .Select(a => new { 
                    a.ProcessingAssignmentId, 
                    a.BranchId, 
                    a.Status, 
                    AssignedUserId = a.AssignedResource != null ? (Guid?)a.AssignedResource.UserId : null 
                })
                .ToListAsync();

            // LOG ATTEMPT
            var firstAssignment = incompleteAssignments.FirstOrDefault();
            _logger.LogInformation("SaveDraft attempt → userId={UserId}, specimenId={SpecimenId}, status={Status}, assignedTo={AssignedTo}", 
                userId, specimenId, firstAssignment?.Status, firstAssignment?.AssignedUserId);

            if (!incompleteAssignments.Any()) return new SynOS.Models.DTOs.ResultEntryResponseDto { Status = SynOS.Models.DTOs.ResultEntryStatus.Success }; // Goal met

            // 3. Gating Logic
            var userRole = _serviceProvider.GetRequiredService<SynOS.Services.Security.IUserContext>().CurrentRole;
            bool isSupervisor = userRole == "Supervisor" || userRole == "Pathologist" || userRole == "Admin";
            
            // FIX: Allow entry if user is the assigned technician for an active (Claimed) assignment for this specimen
            bool isAssignee = incompleteAssignments.Any(a => a.AssignedUserId == userId && a.Status == SynOS.Models.Enums.ProcessingAssignmentStatus.Claimed);

            if (!isSupervisor && !isAssignee)
            {
                _logger.LogWarning("GATING REJECTED → reason=GateViolation, userId={UserId}, isSupervisor={IsSupervisor}, isAssignee={IsAssignee}, incompleteCount={Count}",
                    userId, isSupervisor, isAssignee, incompleteAssignments.Count);
                
                return new SynOS.Models.DTOs.ResultEntryResponseDto 
                { 
                    Status = SynOS.Models.DTOs.ResultEntryStatus.Forbidden, 
                    Message = "Results cannot be entered because departmental processing is not yet complete. Only the assigned technician or a supervisor can override this gate." 
                };
            }

            // 4. Override Logic (for Supervisors/Pathologists)
            if (!isAssignee && string.IsNullOrWhiteSpace(request.OverrideReason))
            {
                return new SynOS.Models.DTOs.ResultEntryResponseDto 
                { 
                    Status = SynOS.Models.DTOs.ResultEntryStatus.BadRequest, 
                    Message = "A reason is required to override the departmental processing gate." 
                };
            }

            _logger.LogInformation("Audited Override: User {UserId} is bypassing processing gate for Specimen {SpecimenId}. Reason: {Reason}", userId, specimenId, request.OverrideReason);

            // 5. BULK ATOMIC UPDATE
            var utcNow = DateTimeOffset.UtcNow;
            var branchId = incompleteAssignments.First().BranchId;

            var affectedRows = await _context.ProcessingAssignments
                .Where(a => a.SpecimenId == specimenId && a.Status != SynOS.Models.Enums.ProcessingAssignmentStatus.Completed)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Status, SynOS.Models.Enums.ProcessingAssignmentStatus.Completed)
                    .SetProperty(a => a.CompletedAt, utcNow)
                    .SetProperty(a => a.IsOverridden, true)
                    .SetProperty(a => a.OverriddenByUserId, userId)
                    .SetProperty(a => a.OverrideReason, request.OverrideReason));

            if (affectedRows > 0)
            {
                // 6. Multi-Queue SignalR Refresh
                var notifier = _serviceProvider.GetRequiredService<SynOS.Services.Operational.INotifier>();
                var visitId = await _context.Orders.Where(o => o.OrderId == request.OrderId).Select(o => o.VisitId).FirstOrDefaultAsync();
                await notifier.NotifyActionQueueDeltaAsync(branchId.ToString(), visitId.ToString());
                await notifier.NotifyRealitySummaryUpdateAsync(branchId.ToString());
            }

            return new SynOS.Models.DTOs.ResultEntryResponseDto { Status = SynOS.Models.DTOs.ResultEntryStatus.Success };
        }

        private string? CalculateFlag(string value, string? referenceRange)
        {
            if (string.IsNullOrEmpty(value) || string.IsNullOrEmpty(referenceRange)) return null;

            // Simple range parser: "0.1-1.2" or "0.1 - 1.2"
            var parts = referenceRange.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length != 2) return null;

            if (decimal.TryParse(value, out decimal val) &&
                decimal.TryParse(parts[0], out decimal min) &&
                decimal.TryParse(parts[1], out decimal max))
            {
                if (val < min) return "L";
                if (val > max) return "H";
            }

            return null;
        }

    }
}