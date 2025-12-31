using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Enums.Referral;
using SynOS.Services.Payables;

namespace SynOS.Services.Referral
{
    public class ReferralFinancialService : IReferralFinancialService
    {
        private readonly SynOSDbContext _context;
        private readonly IPayableFactWriter _payableFactWriter;
        private readonly ILogger<ReferralFinancialService> _logger;

        public ReferralFinancialService(
            SynOSDbContext context,
            IPayableFactWriter payableFactWriter,
            ILogger<ReferralFinancialService> logger)
        {
            _context = context;
            _payableFactWriter = payableFactWriter;
            _logger = logger;
        }

        public async Task ProcessCommissionRecognitionAsync(Visit visit)
        {
            if (!visit.IsReferred || visit.ReferralPartnerId == null)
            {
                // This case should ideally not be hit if called correctly
                return;
            }

            var invoice = visit.Invoices.FirstOrDefault();
            if (invoice == null)
            {
                _logger.LogError("Cannot process commission for Visit {VisitId}: Invoice not found.", visit.VisitId);
                throw new InvalidOperationException($"Invoice not found for visit {visit.VisitId}.");
            }

            var totalCommissionAmount = 0m;
            var spendLineItems = new List<SpendLineItemFact>();
            var spendFactId = Guid.NewGuid(); // Generate ID once for the SpendFact

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

                    if (commission > 0)
                    {
                        var lineItem = new SpendLineItemFact
                        {
                            SpendLineItemFactId = Guid.NewGuid(),
                            SpendFactId = spendFactId, // Assign SpendFactId here during initialization
                            PurchaseOrderItemId = Guid.Empty, // Not applicable
                            // TODO: Link SpendLineItemFact to OrderId once schema supports it.
                            Quantity = 1,
                            UnitPrice = commission,
                            Currency = "INR", // TODO: Use actual currency from Invoice once available.
                            OccurredAt = visit.CreatedAt, // Tie to visit creation time
                            RecordedAt = DateTimeOffset.UtcNow
                        };
                        spendLineItems.Add(lineItem);
                        totalCommissionAmount += commission;
                    }
                }
            }
            if (totalCommissionAmount > 0)
            {
                var spendFact = new SpendFact(
                    spendFactId: spendFactId,
                    amount: totalCommissionAmount,
                    currency: "INR", // TODO: Use actual currency from Invoice once available.
                    occurredAt: visit.CreatedAt,
                    recordedAt: DateTimeOffset.UtcNow,
                    account: "ReferralCommissions",
                    channel: "ReferralCommissionPayable",
                    externalReference: visit.VisitId.ToString() // Use ExternalReference for VisitId as per SpendFact design
                );

                _context.SpendFacts.Add(spendFact);
                _context.SpendLineItemFacts.AddRange(spendLineItems);

                var payableFact = new PayableFact
                {
                    PayableFactId = Guid.NewGuid(),
                    ReferralPartnerId = visit.ReferralPartnerId.Value,
                    AmountOwed = totalCommissionAmount,
                    Currency = "INR", // TODO: Use actual currency from Invoice once available.
                    SourceSpendFactId = spendFactId,
                    DueDate = DateOnly.FromDateTime(DateTime.Today.AddDays(30)), // Example due date
                    Status = "Due",
                    OccurredAt = spendFact.OccurredAt,
                    RecordedAt = spendFact.RecordedAt
                };

                _payableFactWriter.AddPayableFactToContext(payableFact);

                await _context.SaveChangesAsync();

                _logger.LogInformation("Atomic Commission Recognition complete for Visit {VisitId}. Wrote {SpendFactId} and {PayableFactId}.", visit.VisitId, spendFactId, payableFact.PayableFactId);
            }
        }
    }
}
