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

            var totalCommissionAmount = 0m;

            foreach (var order in visit.Orders)
            {
                var commissionRule = await _context.ReferralCommissionRules
                    .AsNoTracking()
                    .Where(r => r.ReferralPartnerId == visit.ReferralPartnerId && r.TestId == order.TestId && r.IsActive)
                    .OrderByDescending(r => r.EffectiveFrom)
                    .FirstOrDefaultAsync();

                if (commissionRule != null)
                {
                    decimal commission = 0m;
                    if (commissionRule.CommissionType == CommissionType.Percentage)
                    {
                        commission = order.Price * (commissionRule.CommissionValue / 100m);
                    }
                    else if (commissionRule.CommissionType == CommissionType.Flat)
                    {
                        commission = commissionRule.CommissionValue;
                    }

                    totalCommissionAmount += commission;
                }
            }

            if (totalCommissionAmount > 0)
            {
                var payableFact = new ReferralPayableFact
                {
                    ReferralPayableFactId = Guid.NewGuid(),
                    ReferralPartnerId = visit.ReferralPartnerId.Value,
                    Amount = totalCommissionAmount,
                    Currency = "INR", // TODO: Use actual currency from Invoice once available.
                    SourceVisitId = visit.VisitId,
                    OccurredAt = visit.CreatedAt,
                    RecordedAt = DateTime.UtcNow
                };

                _context.ReferralPayableFacts.Add(payableFact);
                _logger.LogInformation("Commission Recognition (Liability pending save) for Visit {VisitId}.", visit.VisitId);
            }
        }
    }
}
