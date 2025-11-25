using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class CriticalValueService : ICriticalValueService
    {
        private readonly SynOSDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ILogger<CriticalValueService> _logger;

        public CriticalValueService(
            SynOSDbContext context,
            INotificationService notificationService,
            ILogger<CriticalValueService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        /// <summary>
        /// Checks whether the given result crosses a critical threshold.
        /// If yes:
        ///  - Sets Result.Flag = "CRITICAL" and persists it
        ///  - Creates or updates a single CriticalAlert for this ResultId
        /// If not critical: does nothing (for now we do not clear CRITICAL).
        /// </summary>
        public async Task CheckAndCreateCriticalAlertAsync(Guid resultId)
        {
            // Load the result with all the navigation properties we actually use
            var result = await _context.Results
                .Include(r => r.Order)
                    .ThenInclude(o => o.TestDefinition)
                .Include(r => r.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(r => r.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Referrer)
                .FirstOrDefaultAsync(r => r.ResultId == resultId);

            if (result == null)
            {
                _logger.LogWarning("CheckAndCreateCriticalAlertAsync called with unknown ResultId {ResultId}", resultId);
                return;
            }

            // Value must be numeric for critical-rule evaluation
            if (!decimal.TryParse(result.Value, out var numericValue))
            {
                _logger.LogDebug("Result {ResultId} has non-numeric value '{Value}', skipping critical check.", resultId, result.Value);
                return;
            }

            // Find active rule for this parameter
            var rule = await _context.CriticalRules
                .FirstOrDefaultAsync(r => r.ParameterCode == result.ParameterCode && r.IsActive);

            if (rule == null)
            {
                _logger.LogDebug("No active CriticalRule found for ParameterCode {ParameterCode}", result.ParameterCode);
                return;
            }

            // Determine which side is critical, if any
            string? criticalThreshold = null;

            if (rule.CriticalLow.HasValue && numericValue < rule.CriticalLow.Value)
            {
                criticalThreshold = "CriticalLow";
            }

            if (rule.CriticalHigh.HasValue && numericValue > rule.CriticalHigh.Value)
            {
                // If it is both < low and > high (weird), high wins here, but realistically one side will match.
                criticalThreshold = "CriticalHigh";
            }

            if (criticalThreshold == null)
            {
                // Value is not in the critical range; we leave any existing flag/alert as-is for now.
                _logger.LogDebug("Result {ResultId} with value {Value} is not in critical range.", resultId, numericValue);
                return;
            }

            // ---- At this point, value IS critical ----

            // 1. Flag the result as CRITICAL in the database
            if (!string.Equals(result.Flag, "CRITICAL", StringComparison.OrdinalIgnoreCase))
            {
                result.Flag = "CRITICAL";
            }

            // 2. Ensure there is ONE alert per ResultId: update existing or create new
            var existingAlert = await _context.CriticalAlerts
                .FirstOrDefaultAsync(a => a.ResultId == resultId);

            if (existingAlert != null)
            {
                // Update existing alert with latest value/threshold
                existingAlert.Value = numericValue;
                existingAlert.CriticalThreshold = criticalThreshold;
                existingAlert.TriggeredAt = DateTimeOffset.UtcNow;
                existingAlert.Status = existingAlert.Status == "Acknowledged"
                    ? "Acknowledged"   // do not overwrite an acknowledged status
                    : "Pending";
            }
            else
            {
                // Create a fresh alert
                var alert = new CriticalAlert
                {
                    ResultId = result.ResultId,
                    ParameterCode = result.ParameterCode,
                    ParameterName = result.Order?.TestDefinition?.Name ?? result.ParameterCode,
                    Value = numericValue,
                    CriticalThreshold = criticalThreshold,
                    PatientId = result.Order!.Visit.PatientId,
                    VisitId = result.Order.VisitId,
                    ReferrerId = result.Order.Visit.ReferrerId,
                    Status = "Pending"
                };

                _context.CriticalAlerts.Add(alert);
            }

            // 3. Persist both the Result.Flag and the CriticalAlert changes
            await _context.SaveChangesAsync();
        }

        public async Task AcknowledgeAlertsForOrderAsync(Guid orderId, Guid userId, string notes)
        {
            var alertsToAcknowledge = await _context.CriticalAlerts
                .Where(a => a.Result.OrderId == orderId && a.Status == "Pending")
                .ToListAsync();

            if (!alertsToAcknowledge.Any())
            {
                _logger.LogInformation("No pending critical alerts found for OrderId {OrderId} to acknowledge.", orderId);
                return;
            }

            foreach (var alert in alertsToAcknowledge)
            {
                alert.Status = "Acknowledged";
                alert.AcknowledgedAt = DateTimeOffset.UtcNow;
                alert.AcknowledgedByUserId = userId;
                alert.AckMethod = "REPORT_SIGN";
                alert.AckNotes = notes;

                _context.CriticalAudits.Add(new CriticalAudit
                {
                    AlertId = alert.AlertId,
                    Action = "SpecialistAcknowledged",
                    ActedByUserId = userId,
                    Details = notes
                });
            }

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<CriticalAlertSummaryDto>> GetAlertsByStatusAsync(string status, int limit)
        {
            return await _context.CriticalAlerts
                .Include(a => a.Patient)
                .Include(a => a.Referrer)
                .Include(a => a.Result)
                .Where(a => a.Status == status)
                .OrderByDescending(a => a.TriggeredAt)
                .Take(limit)
                .Select(a => new CriticalAlertSummaryDto
                {
                    AlertId = a.AlertId,
                    PatientName = $"{a.Patient.FirstName} {a.Patient.LastName}",
                    Mrn = a.Patient.MRN,
                    ParameterCode = a.ParameterCode,
                    ParameterName = a.ParameterName,
                    Value = a.Value,
                    CriticalThreshold = a.CriticalThreshold,
                    TriggeredAt = a.TriggeredAt,
                    Status = a.Status,
                    ReferrerName = a.Referrer != null ? a.Referrer.ProviderName : "N/A",
                    Unit = a.Result.Unit
                })
                .ToListAsync();
        }

        public async Task<CriticalAlertDetailDto?> GetAlertDetailsAsync(Guid alertId)
        {
            var alert = await _context.CriticalAlerts
                .Include(a => a.Patient)
                .Include(a => a.Visit)
                .Include(a => a.Referrer)
                .Include(a => a.Result)
                .FirstOrDefaultAsync(a => a.AlertId == alertId);

            if (alert == null) return null;

            var auditTrail = await _context.CriticalAudits
                .Where(au => au.AlertId == alertId)
                .OrderBy(au => au.ActedAt)
                .Select(au => new AuditDto
                {
                    ActedAt = au.ActedAt,
                    Action = au.Action,
                    Details = au.Details
                })
                .ToListAsync();

            return new CriticalAlertDetailDto
            {
                Alert = new AlertDetailsDto
                {
                    AlertId = alert.AlertId,
                    ResultId = alert.ResultId,
                    ParameterCode = alert.ParameterCode,
                    ParameterName = alert.ParameterName,
                    Value = alert.Value,
                    Unit = alert.Result?.Unit ?? "N/A",
                    CriticalThreshold = alert.CriticalThreshold,
                    Patient = new PatientSummaryDto
                    {
                        PatientId = alert.PatientId,
                        Name = $"{alert.Patient.FirstName} {alert.Patient.LastName}",
                        Mrn = alert.Patient.MRN
                    },
                    Visit = new VisitSummaryDto
                    {
                        Id = alert.VisitId,
                        Token = alert.Visit.Token
                    },
                    Referrer = alert.Referrer != null
                        ? new ReferrerSummaryDto
                        {
                            Id = alert.Referrer.ReferrerId,
                            Name = alert.Referrer.ProviderName
                        }
                        : null,
                    TriggeredAt = alert.TriggeredAt,
                    NotifiedAt = alert.NotifiedAt,
                    AcknowledgedAt = alert.AcknowledgedAt,
                    Status = alert.Status
                },
                Audit = auditTrail
            };
        }
    }
}
