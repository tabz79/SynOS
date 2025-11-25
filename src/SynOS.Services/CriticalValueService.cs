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

        public CriticalValueService(SynOSDbContext context, INotificationService notificationService, ILogger<CriticalValueService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task CheckAndCreateCriticalAlertAsync(Guid resultId)
        {
            var result = await _context.Results
                .Include(r => r.Order.Visit.Patient)
                .Include(r => r.Order.Visit.Referrer) // Include Referrer
                .Include(r => r.Order.TestDefinition)
                .FirstOrDefaultAsync(r => r.ResultId == resultId);

            if (result == null || !decimal.TryParse(result.Value, out var numericValue)) return;

            var rule = await _context.CriticalRules.FirstOrDefaultAsync(r => r.ParameterCode == result.ParameterCode && r.IsActive);
            if (rule == null) return;

            string? criticalThreshold = null;
            if (rule.CriticalLow.HasValue && numericValue < rule.CriticalLow.Value) criticalThreshold = "CriticalLow";
            if (rule.CriticalHigh.HasValue && numericValue > rule.CriticalHigh.Value) criticalThreshold = "CriticalHigh";

            if (criticalThreshold != null)
            {
                var alert = new CriticalAlert
                {
                    AlertId = Guid.NewGuid(),
                    ResultId = result.ResultId,
                    ParameterCode = result.ParameterCode,
                    ParameterName = result.Order.TestDefinition.Name,
                    Value = numericValue,
                    CriticalThreshold = criticalThreshold,
                    PatientId = result.Order.Visit.PatientId,
                    VisitId = result.Order.VisitId,
                    ReferrerId = result.Order.Visit.ReferrerId,
                    Status = "Pending"
                };

                _context.CriticalAlerts.Add(alert);
                await _context.SaveChangesAsync();

                // Call NotifyReferrer with the created alert's ID and rule
                await NotifyReferrerAsync(alert.AlertId, rule);
            }
        }

        public async Task AcknowledgeAlertAsync(Guid alertId, Guid userId, AcknowledgeAlertRequestDto ackDto)
        {
            var alert = await _context.CriticalAlerts.FindAsync(alertId);
            if (alert == null) throw new KeyNotFoundException("Alert not found.");
            if (alert.Status == "Acknowledged") throw new InvalidOperationException("Alert already acknowledged.");

            alert.Status = "Acknowledged";
            alert.AcknowledgedAt = DateTimeOffset.UtcNow;
            alert.AcknowledgedByUserId = userId;
            alert.AckMethod = ackDto.Method;
            alert.AckNotes = ackDto.Notes;

            _context.CriticalAudits.Add(new CriticalAudit { AlertId = alertId, Action = "Acknowledged", ActedByUserId = userId, Details = ackDto.Notes });

            await _context.SaveChangesAsync();
        }

        public async Task EscalateAlertAsync(Guid alertId)
        {
            var alert = await _context.CriticalAlerts.FindAsync(alertId);
            if (alert == null || alert.Status == "Acknowledged") return;

            alert.Status = "Escalated";
            alert.EscalatedAt = DateTimeOffset.UtcNow;

            _context.CriticalAudits.Add(new CriticalAudit { AlertId = alertId, Action = "Escalated" });
            await _context.SaveChangesAsync();
            
            // In a real system, you would find escalation contacts and notify them here.
            _logger.LogWarning("Critical Alert {AlertId} has been escalated.", alertId);
        }

        public async Task CheckAndEscalatePendingAlertsAsync()
        {
            // Fetch alerts that have been Notified but not Acknowledged or Escalated, and whose escalation time has passed
            var pendingAlerts = await _context.CriticalAlerts
                .Where(a => a.Status == "Notified" && a.NotifiedAt.HasValue)
                .ToListAsync();

            foreach (var alert in pendingAlerts)
            {
                // Load the rule for this alert's parameter code
                var rule = await _context.CriticalRules.FirstOrDefaultAsync(r => r.ParameterCode == alert.ParameterCode);
                if (rule == null)
                {
                    _logger.LogWarning("Critical rule not found for parameter {ParameterCode} of alert {AlertId}. Skipping escalation check.", alert.ParameterCode, alert.AlertId);
                    continue;
                }

                if (alert.NotifiedAt.Value.AddMinutes(rule.EscalationMinutes) < DateTimeOffset.UtcNow)
                {
                    await EscalateAlertAsync(alert.AlertId);
                }
            }
        }

        public async Task<IEnumerable<CriticalAlertSummaryDto>> GetAlertsByStatusAsync(string status, int limit)
        {
            return await _context.CriticalAlerts
                .Include(a => a.Patient)
                .Include(a => a.Referrer)
                .Include(a => a.Result) // Include Result to get Unit
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
                    Unit = a.Result.Unit // Assuming Unit is on Result
                }).ToListAsync();
        }

        public async Task<CriticalAlertDetailDto?> GetAlertDetailsAsync(Guid alertId)
        {
            var alert = await _context.CriticalAlerts
                .Include(a => a.Patient)
                .Include(a => a.Visit)
                .Include(a => a.Referrer)
                .Include(a => a.Result) // Include Result to get Unit
                .FirstOrDefaultAsync(a => a.AlertId == alertId);

            if (alert == null) return null;

            var auditTrail = await _context.CriticalAudits
                .Where(au => au.AlertId == alertId)
                .OrderBy(au => au.ActedAt)
                .Select(au => new AuditDto { ActedAt = au.ActedAt, Action = au.Action, Details = au.Details })
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
                    Unit = alert.Result?.Unit ?? "N/A", // Get unit from Result
                    CriticalThreshold = alert.CriticalThreshold,
                    Patient = new PatientSummaryDto { PatientId = alert.PatientId, Name = $"{alert.Patient.FirstName} {alert.Patient.LastName}", Mrn = alert.Patient.MRN },
                    Visit = new VisitSummaryDto { Id = alert.VisitId, Token = alert.Visit.Token },
                    Referrer = alert.Referrer != null ? new ReferrerSummaryDto { Id = alert.Referrer.ReferrerId, Name = alert.Referrer.ProviderName } : null,
                    TriggeredAt = alert.TriggeredAt,
                    NotifiedAt = alert.NotifiedAt,
                    AcknowledgedAt = alert.AcknowledgedAt,
                    Status = alert.Status
                },
                Audit = auditTrail
            };
        }

        private async Task NotifyReferrerAsync(Guid alertId, CriticalRule rule)
        {
            var alert = await _context.CriticalAlerts
                .Include(a => a.Patient)
                .Include(a => a.Visit)
                .Include(a => a.Referrer) // Include Referrer
                .FirstOrDefaultAsync(a => a.AlertId == alertId);
            
            if (alert == null) return;
            
            var contacts = await _context.CriticalContacts
                .Where(c => c.ReferrerId == alert.ReferrerId && c.IsActive).OrderBy(c => c.Priority).ToListAsync();
            
            if (!contacts.Any())
            {
                _logger.LogWarning("No critical contacts found for referrer {ReferrerId} of alert {AlertId}", alert.ReferrerId, alert.AlertId);
                return;
            }

            var primaryContact = contacts.First();
            var notifiedTo = new List<string>();
            var message = $"CRITICAL: {alert.Patient.FirstName} {alert.Patient.LastName} ({alert.Patient.MRN}) - {alert.ParameterName}: {alert.Value} (Critical: {alert.CriticalThreshold}). Contact lab ASAP. Token: {alert.Visit.Token}";

            if (rule.NotificationChannels.Contains("SMS") && !string.IsNullOrEmpty(primaryContact.Phone))
            {
                await _notificationService.SendSmsAsync(primaryContact.Phone, message);
                notifiedTo.Add($"SMS to {primaryContact.Phone}");
            }
            if (rule.NotificationChannels.Contains("EMAIL") && !string.IsNullOrEmpty(primaryContact.Email))
            {
                await _notificationService.SendEmailAsync(primaryContact.Email, $"CRITICAL LAB RESULT - {alert.Patient.FirstName}", message);
                notifiedTo.Add($"Email to {primaryContact.Email}");
            }
            // ... add other channels like WhatsApp ...

            alert.Status = "Notified";
            alert.NotifiedAt = DateTimeOffset.UtcNow;
            alert.NotifiedTo = string.Join(", ", notifiedTo);
            _context.CriticalAudits.Add(new CriticalAudit { AlertId = alertId, Action = "NotificationSent", Details = alert.NotifiedTo });

            await _context.SaveChangesAsync();
        }
    }
}