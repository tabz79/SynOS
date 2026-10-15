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

            // 1. Find all pending visits for this partner that were created AFTER onboarding
            // and do NOT have a payout fact yet.
            var pendingVisits = await _context.Visits
                .Include(v => v.Orders)
                .Include(v => v.Invoices)
                .Where(v => v.ReferralPartnerId == partnerId 
                         && v.IsReferred 
                         && v.CreatedAt >= partner.CreatedAt)
                .ToListAsync();

            var backfilledCount = 0;
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var visit in pendingVisits)
                {
                    // Skip if already has a payout fact (Idempotency)
                    if (await _context.ReferralPayableFacts.AnyAsync(f => f.SourceVisitId == visit.VisitId)) continue;

                    // Skip if it was a Prepaid bill (PartnerCollects) - these already handled in receivables
                    if (visit.PaymentCollectionModel == "PartnerCollects") continue;

                    var totalCommission = 0m;
                    foreach (var order in visit.Orders)
                    {
                        // Calculate using the new approved percentage
                        decimal baseAmount = (partner.CalculationBase == CommissionCalculationBase.BeforeDiscounts)
                            ? order.Price 
                            : (order.Price - order.Discount);
                        
                        totalCommission += baseAmount * (commissionPercentage / 100m);
                    }

                    if (totalCommission > 0)
                    {
                        var payableFact = new ReferralPayableFact
                        {
                            ReferralPayableFactId = Guid.NewGuid(),
                            ReferralPartnerId = partnerId,
                            Amount = totalCommission,
                            Currency = "INR",
                            SourceVisitId = visit.VisitId,
                            OccurredAt = visit.CreatedAt,
                            RecordedAt = DateTime.UtcNow,
                            Status = "Pending"
                        };
                        _context.ReferralPayableFacts.Add(payableFact);
                        backfilledCount++;
                    }
                }

                // 2. Log the Approval Event
                var approvalLog = new ReferralApprovalLog
                {
                    LogId = Guid.NewGuid(),
                    PartnerId = partnerId,
                    ApprovedByUserId = userId,
                    CommissionPercentageAssigned = commissionPercentage,
                    BackfilledVisitCount = backfilledCount,
                    Timestamp = DateTimeOffset.UtcNow,
                    Note = "OPX-GPT-5: Atomic Backfill"
                };
                _context.ReferralApprovalLogs.Add(approvalLog);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                _logger.LogInformation("Successfully backfilled {Count} visits for Partner {PartnerId}.", backfilledCount, partnerId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to backfill commissions for Partner {PartnerId}.", partnerId);
                throw;
            }
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
