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
            // Fast fail if already processed.
            if (await _context.ReferralPayableFacts.AnyAsync(f => f.SourceVisitId == visit.VisitId))
            {
                _logger.LogInformation("Commission already recognized for Visit {VisitId}. Skipping.", visit.VisitId);
                return;
            }

            if (!visit.IsReferred || visit.ReferralPartnerId == null)
            {
                return;
            }

            var invoice = visit.Invoices.FirstOrDefault();
            if (invoice == null)
            {
                _logger.LogError("Cannot process commission for Visit {VisitId}: Invoice not found.", visit.VisitId);
                throw new InvalidOperationException($"Invoice not found for visit {visit.VisitId}.");
            }
            var partner = await _context.ReferralPartners.FindAsync(visit.ReferralPartnerId);
            if (partner == null) return;

            var totalCommissionAmount = 0m;
            foreach (var order in visit.Orders)
            {
                totalCommissionAmount += await CalculateCommissionForOrderAsync(partner, order);
            }

            // --- REVENUE RECOGNITION (Partner owes Lab) ---
            if (partner.PaymentCollectionModel == "PartnerCollects")
            {
                var totalBill = visit.Orders.Sum(o => o.Price - o.Discount);
                var netPayableByPartner = totalBill - totalCommissionAmount;

                if (netPayableByPartner > 0)
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
            else // --- LIABILITY RECOGNITION (Lab owes Doctor) ---
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
