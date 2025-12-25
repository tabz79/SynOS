using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.ReadModels.Economics;

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
            string? derivedCurrency = null;

            foreach (var fact in usageFacts)
            {
                if (!inventoryItems.TryGetValue(fact.InventoryItemId, out var inventoryItem)) continue;

                if (!tubes.TryGetValue(inventoryItem.ItemCode, out var tube))
                {
                    throw new NotSupportedException($"Costing for non-tube consumable '{inventoryItem.Name}' is not supported as no link to purchase orders exists.");
                }

                var relevantPOIs = purchaseOrderItems.Where(poi => poi.TubeId == tube.TubeId).ToList();

                if (relevantPOIs.Count != 1)
                {
                    throw new NotSupportedException($"Cannot determine a single deterministic cost basis for Inventory Item '{inventoryItem.Name}'. Found {relevantPOIs.Count} purchase order items. A specific costing policy (e.g., FIFO, LIFO) is required but not implemented.");
                }
                
                var purchaseItem = relevantPOIs.Single();
                var unitCost = purchaseItem.UnitPrice;

                // Correction: Currency does not exist on ImsPurchaseOrder.
                // Throwing an exception as a deterministic currency cannot be derived.
                throw new NotSupportedException($"Cannot determine currency for cost of Inventory Item '{inventoryItem.Name}'. The ImsPurchaseOrder entity does not contain currency information.");
            }

            // This part of the code is now unreachable due to the exception above,
            // but is kept here to show the intended structure.
            return new EconomicEventCostView
            {
                EventId = eventId,
                Description = $"Attributed cost for Event {eventId}",
                TotalCost = totalCost,
                Currency = derivedCurrency ?? "N/A",
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
            var costView = await GetCostForEventAsync(eventId);
            var revenueView = await GetRevenueForEventAsync(eventId);

            if (costView.Currency != "N/A" && revenueView.Currency != "N/A" && costView.Currency != revenueView.Currency)
            {
                throw new InvalidOperationException($"Cannot calculate margin for Event {eventId} due to inconsistent currencies between cost ('{costView.Currency}') and revenue ('{revenueView.Currency}').");
            }
            
            var currency = costView.Currency != "N/A" ? costView.Currency : revenueView.Currency;
            
            var grossMargin = revenueView.TotalRevenue - costView.TotalCost;

            return new EconomicEventMarginView
            {
                EventId = eventId,
                Description = $"Gross Margin for Event {eventId}",
                TotalRevenue = revenueView.TotalRevenue,
                TotalCost = costView.TotalCost,
                GrossMargin = grossMargin,
                Currency = currency
            };
        }
    }
}
