using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Enums.Referral;

namespace SynOS.Services.Referral
{
    public class ReferralFinancialService : IReferralFinancialService
    {
        private readonly SynOSDbContext _context;
        private readonly IReferralCommissionGoverningEngine _governingEngine;
        private readonly ILogger<ReferralFinancialService> _logger;

        public ReferralFinancialService(
            SynOSDbContext context,
            IReferralCommissionGoverningEngine governingEngine,
            ILogger<ReferralFinancialService> logger)
        {
            _context = context;
            _governingEngine = governingEngine;
            _logger = logger;
        }

        public async Task ProcessCommissionRecognitionAsync(Visit visit)
        {
            // IDEMPOTENCY GUARD (Layer 1: App Check)
            if (await _context.ReferralPayableFacts.AnyAsync(f => f.SourceVisitId == visit.VisitId))
            {
                _logger.LogInformation("Commission already recognized for Visit {VisitId}. Skipping.", visit.VisitId);
                return;
            }

            if (!visit.IsReferred || visit.ReferralPartnerId == null)
            {
                return;
            }

            // Central Governing Authority: evaluate and recognize strictly through Governing Engine
            await _governingEngine.ProcessBillingRecognitionAsync(visit.VisitId);
        }

        public async Task ProcessRetroactiveCommissionsAsync(Guid partnerId, decimal commissionPercentage, Guid userId)
        {
            var partner = await _context.ReferralPartners.FindAsync(partnerId);
            if (partner == null) return;

            partner.DefaultCommissionPercentage = commissionPercentage;
            partner.ApprovedByUserId = userId;
            partner.ApprovedAt = DateTimeOffset.UtcNow;
            partner.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            // Authoritative calculation via Central Self-Learning Governing Engine
            var recalculatedCount = await _governingEngine.RecalculatePartnerPendingVisitsAsync(partnerId);

            var approvalLog = new ReferralApprovalLog
            {
                LogId = Guid.NewGuid(),
                PartnerId = partnerId,
                ApprovedByUserId = userId,
                CommissionPercentageAssigned = commissionPercentage,
                BackfilledVisitCount = recalculatedCount,
                Timestamp = DateTimeOffset.UtcNow,
                Note = "Governing Engine Recalculation"
            };
            _context.ReferralApprovalLogs.Add(approvalLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Governing Engine recalculated {Count} visits for Partner {PartnerId} with default rate {Rate}%.", 
                recalculatedCount, partnerId, commissionPercentage);
        }


        public async Task BackfillUnrecognizedCommissionsAsync()
        {
            var unreconVisits = await _context.Visits
                .Include(v => v.Orders)
                .Include(v => v.Invoices)
                .Include(v => v.ReferralPartner)
                .Where(v => v.IsReferred 
                         && v.ReferralPartnerId != null 
                         && !_context.ReferralPayableFacts.Any(f => f.SourceVisitId == v.VisitId)
                         && !_context.ReceivableFacts.Any(f => f.SourceVisitId == v.VisitId))
                .ToListAsync();

            if (!unreconVisits.Any()) return;

            _logger.LogInformation("Backfilling {Count} referred visits missing financial recognition...", unreconVisits.Count);

            foreach (var visit in unreconVisits)
            {
                try
                {
                    await ProcessCommissionRecognitionAsync(visit);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Backfill error for Visit {VisitId}", visit.VisitId);
                }
            }
        }
    }
}
