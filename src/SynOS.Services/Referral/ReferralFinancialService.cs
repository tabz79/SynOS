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
        private readonly ILogger<ReferralFinancialService> _logger;

        public ReferralFinancialService(
            SynOSDbContext context,
            ILogger<ReferralFinancialService> logger)
        {
            _context = context;
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

            var partner = await _context.ReferralPartners.FindAsync(visit.ReferralPartnerId);
            if (partner == null) return;

            // OPX-GPT-5: Draft partners do NOT trigger payouts immediately.
            // They wait for Admin approval + Backfill.
            if (partner.Status == PartnerStatus.Draft)
            {
                _logger.LogInformation("Partner {PartnerId} is in DRAFT status. Skipping immediate payout for Visit {VisitId}.", partner.ReferralPartnerId, visit.VisitId);
                return;
            }

            var invoice = visit.Invoices.FirstOrDefault();
            if (invoice == null)
            {
                _logger.LogWarning("Cannot process commission for Visit {VisitId}: Invoice not found.", visit.VisitId);
                return; 
            }

            var totalCommissionAmount = 0m;
            foreach (var order in visit.Orders)
            {
                totalCommissionAmount += await CalculateCommissionForOrderAsync(partner, order);
            }

            // OPX-GPT-5: VISIT-LEVEL AUTHORITY
            // Use visit.PaymentCollectionModel instead of partner's default.
            var collectionModel = visit.PaymentCollectionModel ?? partner.PaymentCollectionModel;

            if (collectionModel == "PartnerCollects")
            {
                var totalBill = visit.Orders.Sum(o => o.Price - o.Discount);
                var netPayableByPartner = totalBill - totalCommissionAmount;

                if (netPayableByPartner > 0 && !await _context.ReceivableFacts.AnyAsync(f => f.SourceVisitId == visit.VisitId))
                {
                    var receivableFact = new SynOS.Models.Entities.AR.ReceivableFact
                    {
                        ReceivableFactId = Guid.NewGuid(),
                        SourceVisitId = visit.VisitId,
                        ReferralPartnerId = partner.ReferralPartnerId,
                        Amount = netPayableByPartner,
                        Currency = "INR",
                        OccurredAt = visit.CreatedAt,
                        RecordedAt = DateTimeOffset.UtcNow
                    };
                    _context.ReceivableFacts.Add(receivableFact);
                    _logger.LogInformation("Partner Receivable recognized for Visit {VisitId}: ₹{Amount}", visit.VisitId, netPayableByPartner);
                }
            }
            else // Liability Recognition
            {
                if (totalCommissionAmount > 0)
                {
                    var payableFact = new ReferralPayableFact
                    {
                        ReferralPayableFactId = Guid.NewGuid(),
                        ReferralPartnerId = visit.ReferralPartnerId.Value,
                        Amount = totalCommissionAmount,
                        Currency = "INR", 
                        SourceVisitId = visit.VisitId,
                        OccurredAt = visit.CreatedAt,
                        RecordedAt = DateTime.UtcNow,
                        Status = "Pending"
                    };

                    _context.ReferralPayableFacts.Add(payableFact);
                    _logger.LogInformation("Commission Payable recognized for Visit {VisitId}: ₹{Amount}", visit.VisitId, totalCommissionAmount);
                }
            }

            await _context.SaveChangesAsync();
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

        private async Task<decimal> CalculateCommissionForOrderAsync(ReferralPartner partner, Order order)
        {
            // TIER 1: Test-Specific Override
            var commissionRule = await _context.ReferralCommissionRules
                .AsNoTracking()
                .Where(r => r.ReferralPartnerId == partner.ReferralPartnerId && r.TestId == order.TestId && r.IsActive)
                .OrderByDescending(r => r.EffectiveFrom)
                .FirstOrDefaultAsync();

            decimal rate = 0;
            CommissionType? type = null;

            if (commissionRule != null)
            {
                // Margin Protection: Skip commission on outsourced tests unless explicitly allowed
                if (order.IsOutsourced && !commissionRule.AllowCommissionOnOutsourcedTests)
                {
                    _logger.LogInformation("Skipping commission for outsourced Order {OrderId} per protection rule.", order.OrderId);
                    return 0;
                }
                rate = commissionRule.CommissionValue;
                type = commissionRule.CommissionType;
            }
            else if (partner.DefaultCommissionPercentage > 0)
            {
                // TIER 3: Partner Default Cut (Fallback)
                rate = partner.DefaultCommissionPercentage;
                type = CommissionType.Percentage;
            }
            else
            {
                // TIER 4: No Payout + Warning
                _logger.LogWarning("No commission rule or partner default found for Partner {PartnerId} on Test {TestId}.", partner.ReferralPartnerId, order.TestId);
                return 0;
            }

            // Calculation Base Logic (Before vs After Discounts)
            decimal baseAmount = (partner.CalculationBase == CommissionCalculationBase.BeforeDiscounts)
                ? order.Price 
                : (order.Price - order.Discount);

            decimal commission = 0;
            if (type == CommissionType.Percentage)
            {
                commission = baseAmount * (rate / 100m);
            }
            else if (type == CommissionType.Flat)
            {
                commission = rate;
            }

            return commission;
        }
    }
}
