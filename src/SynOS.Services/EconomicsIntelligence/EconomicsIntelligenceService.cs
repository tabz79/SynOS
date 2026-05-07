using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.ReadModels.Economics;
using SynOS.Models.DTOs.Economics;

namespace SynOS.Services.EconomicsIntelligence
{
    public class EconomicsIntelligenceService : IEconomicsIntelligenceService
    {
        private readonly SynOSDbContext _context;

        public EconomicsIntelligenceService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<EconomicEventCostView> GetCostForEventAsync(Guid eventId)
        {
            var usageFacts = await _context.CostAttribution_UsageFacts
                .AsNoTracking()
                .Where(f => f.SourceEventId == eventId)
                .ToListAsync();

            if (!usageFacts.Any())
            {
                return new EconomicEventCostView { EventId = eventId, Description = $"No cost attribution facts found for Event {eventId}", Currency = "N/A" };
            }

            var itemIds = usageFacts.Select(f => f.InventoryItemId).Distinct().ToList();
            var inventoryItems = await _context.ImsInventoryItems
                .AsNoTracking()
                .Where(i => itemIds.Contains(i.ItemId))
                .ToDictionaryAsync(i => i.ItemId);
            
            var itemCodes = inventoryItems.Values.Select(i => i.ItemCode).ToList();

            var tubes = await _context.ImsTubeMasters
                .AsNoTracking()
                .Where(t => itemCodes.Contains(t.Code))
                .ToDictionaryAsync(t => t.Code);

            var tubeIds = tubes.Values.Select(t => t.TubeId).ToList();

            var purchaseOrderItems = await _context.ImsPOItems
                .AsNoTracking()
                .Include(poi => poi.PurchaseOrder)
                .Where(poi => tubeIds.Contains(poi.TubeId))
                .ToListAsync();

            var costDetails = new List<ItemCostDetailView>();
            decimal totalCost = 0;
            string derivedCurrency = "INR";
            string accuracyFlag = string.Empty;

            foreach (var fact in usageFacts)
            {
                if (!inventoryItems.TryGetValue(fact.InventoryItemId, out var inventoryItem)) continue;

                // NEW: Check for persisted high-precision cost attribution (Phase 3)
                if (fact.TotalCost.HasValue)
                {
                    totalCost += fact.TotalCost.Value;
                    costDetails.Add(new ItemCostDetailView
                    {
                        ItemName = inventoryItem.Name,
                        Quantity = fact.Quantity,
                        UnitCost = fact.UnitCost ?? 0,
                        TotalItemCost = fact.TotalCost.Value
                    });
                    if (!string.IsNullOrEmpty(fact.AccuracyFlag)) 
                    {
                        accuracyFlag = fact.AccuracyFlag;
                    }
                    continue;
                }

                // LEGACY FALLBACK: On-the-fly estimation logic for historical data
                if (!tubes.TryGetValue(inventoryItem.ItemCode, out var tube))
                {
                    accuracyFlag = "Estimated / Missing Link";
                    costDetails.Add(new ItemCostDetailView
                    {
                        ItemName = inventoryItem.Name,
                        Quantity = fact.Quantity,
                        UnitCost = 0,
                        TotalItemCost = 0
                    });
                    continue;
                }

                var relevantPOIs = purchaseOrderItems.Where(poi => poi.TubeId == tube.TubeId).ToList();

                if (relevantPOIs.Count != 1)
                {
                    accuracyFlag = "Incomplete / Multi-PO";
                    costDetails.Add(new ItemCostDetailView
                    {
                        ItemName = inventoryItem.Name,
                        Quantity = fact.Quantity,
                        UnitCost = 0,
                        TotalItemCost = 0
                    });
                    continue;
                }
                
                var purchaseItem = relevantPOIs.Single();
                var unitCost = purchaseItem.UnitPrice;
                var lineCost = fact.Quantity * unitCost;

                totalCost += lineCost;
                costDetails.Add(new ItemCostDetailView
                {
                    ItemName = inventoryItem.Name,
                    Quantity = fact.Quantity,
                    UnitCost = unitCost,
                    TotalItemCost = lineCost
                });
            }

            return new EconomicEventCostView
            {
                EventId = eventId,
                Description = $"Attributed cost for Event {eventId}",
                TotalCost = totalCost,
                Currency = derivedCurrency,
                Flag = accuracyFlag,
                Details = costDetails
            };
        }

        public async Task<EconomicEventRevenueView> GetRevenueForEventAsync(Guid eventId)
        {
            var eventIdString = eventId.ToString();

            var revenueFacts = await _context.RevenueFacts
                .AsNoTracking()
                .Where(f => f.SourceReferenceId == eventIdString)
                .ToListAsync();

            if (!revenueFacts.Any())
            {
                return new EconomicEventRevenueView { EventId = eventId, Description = $"No revenue facts found for Event {eventId}", Currency = "N/A" };
            }

            var currencies = revenueFacts.Select(f => f.Currency).Distinct().ToList();
            if (currencies.Count > 1)
            {
                throw new InvalidOperationException("Inconsistent currencies found across revenue facts for the same economic event.");
            }
            var derivedCurrency = currencies.Single();

            var totalRevenue = revenueFacts.Sum(f => f.Direction == RevenueDirection.Inflow ? f.Amount : -f.Amount);

            var revenueDetails = revenueFacts.Select(fact => new ItemRevenueDetailView
            {
                ItemName = $"Revenue Fact ({fact.Direction})",
                Amount = fact.Direction == RevenueDirection.Inflow ? fact.Amount : -fact.Amount,
                Currency = fact.Currency,
                PaymentMode = fact.PaymentMode.ToString()
            }).ToList();

            return new EconomicEventRevenueView
            {
                EventId = eventId,
                Description = $"Attributed revenue for Event {eventId}",
                TotalRevenue = totalRevenue,
                Currency = derivedCurrency,
                Details = revenueDetails
            };
        }

        public async Task<EconomicEventMarginView> GetMarginForEventAsync(Guid eventId)
        {
            var inventoryCostView = await GetCostForEventAsync(eventId);
            var revenueView = await GetRevenueForEventAsync(eventId);

            // Fetch Direct Costs (Accrual)
            var outsourcedCost = await _context.ReferenceLabPayables
                .Where(p => p.PatientId == eventId) // eventId corresponds to VisitId
                .SumAsync(p => p.AmountDue);

            var referralPayout = await _context.ReferralPayableFacts
                .Where(f => f.SourceVisitId == eventId)
                .SumAsync(f => f.Amount);

            var totalCost = inventoryCostView.TotalCost + outsourcedCost + referralPayout;

            if (inventoryCostView.Currency != "N/A" && revenueView.Currency != "N/A" && inventoryCostView.Currency != revenueView.Currency)
            {
                throw new InvalidOperationException($"Cannot calculate margin for Event {eventId} due to inconsistent currencies between cost ('{inventoryCostView.Currency}') and revenue ('{revenueView.Currency}').");
            }
            
            var currency = inventoryCostView.Currency != "N/A" ? inventoryCostView.Currency : revenueView.Currency;
            
            var operationalMargin = revenueView.TotalRevenue - totalCost;

            return new EconomicEventMarginView
            {
                EventId = eventId,
                Description = $"Operational Margin for Event {eventId}",
                TotalRevenue = revenueView.TotalRevenue,
                TotalCost = totalCost,
                OperationalMargin = operationalMargin,
                Currency = currency
            };
        }

        public async Task<LabProfitabilitySummaryDto> GetLabProfitabilitySummaryAsync(DateTime start, DateTime end)
        {
            var summary = new LabProfitabilitySummaryDto
            {
                StartDate = start,
                EndDate = end
            };

            // 1. Total Inflow (Recognized Revenue)
            summary.TotalCashInflow = await _context.RevenueFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Direction == RevenueDirection.Inflow)
                .SumAsync(f => f.Amount);

            // 2. Consumable Outflow (Usage as proxy for simplicity in V1, or SpendFacts if categorized)
            summary.ConsumableCashOutflow = await _context.CostAttribution_UsageFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end)
                .SumAsync(f => f.TotalCost ?? 0);

            // 3. Outsourced Test Outflow (SpendFacts)
            summary.OutsourcedTestCashOutflow = await _context.SpendFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "OutsourcedTest")
                .SumAsync(f => f.Amount);

            // 4. Referral Outflow (SpendFacts)
            // Assuming Referral payouts are categorized or linked. We can use ReferenceType if available.
            summary.ReferralCashOutflow = await _context.SpendFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Referral")
                .SumAsync(f => f.Amount);

            // 5. Payroll Outflow (SpendFacts)
            summary.PayrollCashOutflow = await _context.SpendFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Payroll")
                .SumAsync(f => f.Amount);

            // 6. Overhead Outflow (SpendFacts)
            summary.OverheadCashOutflow = await _context.SpendFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Overhead")
                .SumAsync(f => f.Amount);

            return summary;
        }
    }
}
