using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.Activity;
using SynOS.Models.Enums;
using SynOS.Models.ReadModels;

namespace SynOS.Services.Operational
{
    /// <summary>
    /// READ-ONLY PROJECTION SERVICE
    /// This service strictly transforms operational events into BFF (Backend-for-Frontend) models.
    /// It MUST NOT perform any writes or emit any events.
    /// </summary>
    public class ActivityStreamService : IActivityStreamService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ActivityStreamService> _logger;

        public ActivityStreamService(SynOSDbContext context, ILogger<ActivityStreamService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<ActivityItemDto>> GetActivityForRoleAsync(Guid branchId, string role)
        {
            var branchIdStr = branchId.ToString();
            var utcToday = DateTime.UtcNow.Date;
            var utcTomorrow = utcToday.AddDays(1);

            // Filter by whitelisted event types for the requested role
            var allowedTypes = GetAllowedEventTypes(role);
            var allowedTypeStrings = allowedTypes.Select(t => t.ToString()).ToList();

            var events = await _context.BranchOperationalEvents
                .AsNoTracking()
                .Where(e => e.BranchId == branchIdStr && 
                            e.OccurredAt >= utcToday && 
                            e.OccurredAt < utcTomorrow &&
                            allowedTypeStrings.Contains(e.EventType))
                .OrderByDescending(e => e.OccurredAt)
                .Take(50)
                .ToListAsync();

            return events.Select(MapToDto).ToList();
        }

        private List<BranchEventType> GetAllowedEventTypes(string role)
        {
            return role.ToLowerInvariant() switch
            {
                "reception" => new List<BranchEventType>
                {
                    BranchEventType.VISIT_STARTED,
                    BranchEventType.VISIT_FINALIZED,
                    BranchEventType.BILL_GENERATED,
                    BranchEventType.PAYMENT_RECEIVED,
                    BranchEventType.REPORT_DELIVERED
                },
                "lab" => new List<BranchEventType>
                {
                    BranchEventType.SAMPLE_COLLECTED,
                    BranchEventType.SAMPLE_REJECTED,
                    BranchEventType.VISIT_FINALIZED,
                    BranchEventType.REPORT_VERIFIED
                },
                "doctor" => new List<BranchEventType>
                {
                    BranchEventType.REPORT_VERIFIED,
                    BranchEventType.REPORT_SIGNED,
                    BranchEventType.SAMPLE_REJECTED
                },
                _ => new List<BranchEventType>()
            };
        }

        private ActivityItemDto MapToDto(BranchOperationalEvent evt)
        {
            // Correction 1: Canonical Enforcement (Throw on drift)
            if (!Enum.TryParse<BranchEventType>(evt.EventType, out var type))
            {
                throw new InvalidOperationException($"Data Corruption: Unknown BranchEventType '{evt.EventType}' found in Event {evt.EventId}.");
            }

            var (icon, color) = GetVisuals(type);

            return new ActivityItemDto
            {
                EventId = evt.EventId,
                OccurredAt = evt.OccurredAt,
                ActorName = evt.ActorName ?? "System",
                Message = evt.SummaryText,
                Icon = icon,
                Color = color,
                Token = evt.TokenId
            };
        }

        private (string Icon, string Color) GetVisuals(BranchEventType type)
        {
            return type switch
            {
                BranchEventType.VISIT_STARTED => ("user-plus", "blue"),
                BranchEventType.VISIT_FINALIZED => ("check-circle", "green"),
                BranchEventType.BILL_GENERATED => ("file-text", "blue"),
                BranchEventType.PAYMENT_RECEIVED => ("dollar-sign", "green"),
                BranchEventType.SAMPLE_COLLECTED => ("aperture", "purple"),
                BranchEventType.SAMPLE_REJECTED => ("alert-triangle", "red"),
                BranchEventType.REPORT_VERIFIED => ("clipboard", "orange"),
                BranchEventType.REPORT_SIGNED => ("pen-tool", "green"),
                BranchEventType.REPORT_DELIVERED => ("send", "green"),
                _ => ("activity", "gray")
            };
        }
    }
}