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

namespace SynOS.Services
{
    public class ResultService : IResultService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ResultService> _logger;
        private readonly ICriticalValueService _criticalValueService;
        private readonly IServiceProvider _serviceProvider;

        public ResultService(
            SynOSDbContext context,
            ILogger<ResultService> logger,
            ICriticalValueService criticalValueService,
            IServiceProvider serviceProvider)
        {
            _context = context;
            _logger = logger;
            _criticalValueService = criticalValueService;
            _serviceProvider = serviceProvider;
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

        public async Task<IEnumerable<ResultDto>> EnterResultsAsync(Guid userId, ResultEntryRequestDto request)
        {
            var resultsToUpsert = new List<Result>();

            foreach (var resultDto in request.Results)
            {
                // DTO only has Value + TechComments, so we stick to that
                var existingResult = await _context.Results
                    .FirstOrDefaultAsync(r =>
                        r.OrderId == request.OrderId &&
                        r.ParameterCode == resultDto.ParameterCode);

                if (existingResult != null)
                {
                    existingResult.Value = resultDto.Value;
                    existingResult.TechComments = resultDto.TechComments;
                    existingResult.EnteredAt = DateTime.UtcNow;

                    resultsToUpsert.Add(existingResult);
                }
                else
                {
                    var newResult = new Result
                    {
                        ResultId = Guid.NewGuid(),
                        OrderId = request.OrderId,
                        ParameterCode = resultDto.ParameterCode,
                        Value = resultDto.Value,
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

            // After saving, check each new/updated result for critical values
            foreach (var result in resultsToUpsert)
            {
                try
                {
                    await _criticalValueService.CheckAndCreateCriticalAlertAsync(result.ResultId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Error while checking critical value for ResultId {ResultId}",
                        result.ResultId);
                    // We deliberately do NOT fail the whole operation because of critical check
                }
            }

            return resultsToUpsert.Select(r => new ResultDto
            {
                ResultId = r.ResultId,
                ParameterCode = r.ParameterCode,
                Value = r.Value,
                Status = r.Status,
                Flag = r.Flag
            });
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

            // If a report for this order doesn't exist, create one.
            var reportExists = await _context.Reports.AnyAsync(r => r.SourceId == orderId && r.SourceType == "Order");
            if (!reportExists)
            {
                var order = await _context.Orders
                    .Include(o => o.Visit)
                        .ThenInclude(v => v.Patient)
                    .FirstOrDefaultAsync(o => o.OrderId == orderId);

                if (order == null)
                {
                    throw new KeyNotFoundException($"Order with ID {orderId} not found when trying to create report.");
                }

                var newReport = new Report
                {
                    ReportId = Guid.NewGuid(),
                    SourceId = orderId,
                    SourceType = "Order",
                    VisitId = order.VisitId,
                    PatientId = order.Visit.Patient.PatientId,
                    Department = order.Department,
                    Status = "ReadyForSignature", // Set initial status for the pathologist
                    CreatedAt = DateTimeOffset.UtcNow
                };
                await _context.Reports.AddAsync(newReport);
            }

            await _context.SaveChangesAsync();

            // --- BEGIN COST ATTRIBUTION WIRING (16.6 I-5 REFACTOR) ---
            try
            {
                await OrchestrateCostAttributionForOrderAsync(orderId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cost attribution failed for OrderId {OrderId}", orderId);
                // Do not block the primary workflow if cost attribution fails.
            }
            // --- END COST ATTRIBUTION WIRING ---
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
    }
}