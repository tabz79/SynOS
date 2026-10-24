using System;
using System.Collections.Generic;
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
    public class ReferralCommissionGoverningEngine : IReferralCommissionGoverningEngine
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ReferralCommissionGoverningEngine> _logger;

        public ReferralCommissionGoverningEngine(
            SynOSDbContext context,
            ILogger<ReferralCommissionGoverningEngine> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<CommissionVisitEvaluationResult> EvaluateVisitAsync(Guid visitId)
        {
            var visit = await _context.Visits
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.ReferralPartner)
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            var result = new CommissionVisitEvaluationResult
            {
                VisitId = visitId,
                IsFullyResolved = true,
                TotalCommissionRecognized = 0,
                TotalGrossBilling = 0
            };

            var targetPartnerId = visit?.SecondaryReferralPartnerId ?? visit?.ReferralPartnerId;

            if (visit == null || !visit.IsReferred || targetPartnerId == null)
            {
                return result;
            }

            var partner = await _context.ReferralPartners.AsNoTracking().FirstOrDefaultAsync(p => p.ReferralPartnerId == targetPartnerId.Value);

            if (partner == null)
            {
                return result;
            }

            result.ReferralPartnerId = partner.ReferralPartnerId;
            result.DoctorName = partner.Name;

            // Fetch all active learned rules for this doctor across the visit's tests
            var testIds = visit.Orders.Select(o => o.TestId).Distinct().ToList();
            var learnedRules = await _context.ReferralCommissionRules
                .AsNoTracking()
                .Where(r => r.ReferralPartnerId == partner.ReferralPartnerId && testIds.Contains(r.TestId) && r.IsActive)
                .OrderByDescending(r => r.EffectiveFrom)
                .ToListAsync();

            var ruleMap = learnedRules
                .GroupBy(r => r.TestId)
                .ToDictionary(g => g.Key, g => g.First());

            foreach (var order in visit.Orders)
            {
                var orderEval = new CommissionOrderEvaluation
                {
                    OrderId = order.OrderId,
                    TestId = order.TestId,
                    TestCode = order.Test?.TestCode ?? string.Empty,
                    TestName = order.Test?.TestName ?? "Investigation",
                    TestPrice = order.Price,
                    Discount = order.Discount,
                    IsOutsourced = order.IsOutsourced
                };

                result.TotalGrossBilling += (order.Price - order.Discount);

                if (ruleMap.TryGetValue(order.TestId, out var rule))
                {
                    orderEval.HasLearnedRule = true;
                    orderEval.CommissionType = rule.CommissionType;
                    orderEval.CommissionValue = rule.CommissionValue;

                    // Margin Protection: Skip commission on outsourced tests unless explicitly allowed
                    if (order.IsOutsourced && !rule.AllowCommissionOnOutsourcedTests)
                    {
                        orderEval.CalculatedCommission = 0;
                        orderEval.ResolutionReason = "Margin Protection (Outsourced test zeroed)";
                    }
                    else
                    {
                        decimal baseAmount = (partner.CalculationBase == CommissionCalculationBase.BeforeDiscounts)
                            ? order.Price
                            : (order.Price - order.Discount);

                        if (rule.CommissionType == CommissionType.Percentage)
                        {
                            orderEval.CalculatedCommission = Math.Round(baseAmount * (rule.CommissionValue / 100m), 2);
                            orderEval.ResolutionReason = $"Rate Card: {rule.CommissionValue}% on ₹{baseAmount}";
                        }
                        else
                        {
                            orderEval.CalculatedCommission = rule.CommissionValue;
                            orderEval.ResolutionReason = $"Rate Card: Flat ₹{rule.CommissionValue}";
                        }
                    }

                    result.TotalCommissionRecognized += orderEval.CalculatedCommission;
                }
                else
                {
                    // Unmapped test: No arbitrary fallback! Must be learned via Rate Queue.
                    orderEval.HasLearnedRule = false;
                    orderEval.CalculatedCommission = 0;
                    orderEval.ResolutionReason = "Awaiting Rate Learning (Unmapped)";
                    result.UnmappedTestCount++;
                    result.IsFullyResolved = false;
                }

                result.OrderEvaluations.Add(orderEval);
            }

            return result;
        }

        public async Task<CommissionVisitEvaluationResult> ProcessBillingRecognitionAsync(Guid visitId)
        {
            var eval = await EvaluateVisitAsync(visitId);

            var visit = await _context.Visits
                .Include(v => v.ReferralPartner)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            var targetPartnerId = visit?.SecondaryReferralPartnerId ?? visit?.ReferralPartnerId;

            if (visit == null || !visit.IsReferred || targetPartnerId == null)
            {
                return eval;
            }

            var partner = await _context.ReferralPartners.FindAsync(targetPartnerId.Value);
            if (partner == null) return eval;

            // Draft partners wait for approval & rate learning
            if (partner.Status == PartnerStatus.Draft)
            {
                _logger.LogInformation("Partner {PartnerId} is in DRAFT status. Holding commission for Visit {VisitId}.", partner.ReferralPartnerId, visit.VisitId);
                return eval;
            }

            var collectionModel = visit.PaymentCollectionModel ?? partner.PaymentCollectionModel;

            if (eval.IsFullyResolved)
            {
                if (collectionModel == "PartnerCollects")
                {
                    var netPayableByPartner = eval.TotalGrossBilling - eval.TotalCommissionRecognized;
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
                    }
                }
                else
                {
                    // Payout liability recognition
                    var existingPayable = await _context.ReferralPayableFacts
                        .FirstOrDefaultAsync(f => f.SourceVisitId == visit.VisitId);

                    if (existingPayable != null)
                    {
                        if (existingPayable.SettledAt == null)
                        {
                            existingPayable.Amount = eval.TotalCommissionRecognized;
                            existingPayable.Description = "Governed Rate Recognized";
                        }
                    }
                    else if (eval.TotalCommissionRecognized > 0)
                    {
                        var newPayable = new ReferralPayableFact
                        {
                            ReferralPayableFactId = Guid.NewGuid(),
                            ReferralPartnerId = partner.ReferralPartnerId,
                            Amount = eval.TotalCommissionRecognized,
                            Currency = "INR",
                            SourceVisitId = visit.VisitId,
                            OccurredAt = visit.CreatedAt,
                            RecordedAt = DateTime.UtcNow,
                            Status = "Pending",
                            Description = "Governed Rate Recognized"
                        };
                        _context.ReferralPayableFacts.Add(newPayable);
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("Governing Engine resolved Visit {VisitId}: ₹{Commission} recognized.", visit.VisitId, eval.TotalCommissionRecognized);
            }
            else
            {
                _logger.LogInformation("Governing Engine placed Visit {VisitId} in Rate Queue: {Count} unmapped test(s) awaiting rate cut.",
                    visit.VisitId, eval.UnmappedTestCount);
            }

            return eval;
        }

        public async Task<int> RecalculatePartnerPendingVisitsAsync(Guid partnerId)
        {
            var visits = await _context.Visits
                .Where(v => v.ReferralPartnerId == partnerId && v.IsReferred)
                .OrderBy(v => v.CreatedAt)
                .ToListAsync();

            int updatedCount = 0;
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var visit in visits)
                {
                    var eval = await EvaluateVisitAsync(visit.VisitId);
                    if (!eval.IsFullyResolved) continue;

                    var existingPayable = await _context.ReferralPayableFacts
                        .FirstOrDefaultAsync(f => f.SourceVisitId == visit.VisitId);

                    if (existingPayable != null)
                    {
                        if (existingPayable.SettledAt == null && existingPayable.Amount != eval.TotalCommissionRecognized)
                        {
                            existingPayable.Amount = eval.TotalCommissionRecognized;
                            existingPayable.Description = "Auto-governed via Rate Learning";
                            updatedCount++;
                        }
                    }
                    else if (eval.TotalCommissionRecognized > 0 && visit.PaymentCollectionModel != "PartnerCollects")
                    {
                        var newPayable = new ReferralPayableFact
                        {
                            ReferralPayableFactId = Guid.NewGuid(),
                            ReferralPartnerId = partnerId,
                            Amount = eval.TotalCommissionRecognized,
                            Currency = "INR",
                            SourceVisitId = visit.VisitId,
                            OccurredAt = visit.CreatedAt,
                            RecordedAt = DateTime.UtcNow,
                            Status = "Pending",
                            Description = "Auto-governed via Rate Learning"
                        };
                        _context.ReferralPayableFacts.Add(newPayable);
                        updatedCount++;
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return updatedCount;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to recalculate visits for partner {PartnerId}", partnerId);
                throw;
            }
        }
    }
}
