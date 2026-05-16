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
using SynOS.Models.Entities.Payables; // ADDED

namespace SynOS.Services.EconomicsIntelligence
{
    public class EconomicsIntelligenceService : IEconomicsIntelligenceService
    {
        private readonly SynOSDbContext _context;

        public EconomicsIntelligenceService(SynOSDbContext context)
        {
            _context = context;
        }

        private async Task<bool> CheckTableExistsAsync(string schema, string table)
        {
            try
            {
                // SQL Server specific existence check
                var sql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @p0 AND TABLE_NAME = @p1";
                var count = await _context.Database.SqlQueryRaw<int>(sql, schema, table).ToListAsync();
                return count.FirstOrDefault() > 0;
            }
            catch
            {
                return false;
            }
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

        public async Task<EconomicEventMarginView> GetCashMarginForEventAsync(Guid eventId)
        {
            var inventoryCostView = await GetCostForEventAsync(eventId);
            var revenueView = await GetRevenueForEventAsync(eventId);

            // Fetch Cash Moved (SpendFacts related to this event, e.g., Reference Lab Payments, Referral Payments)
            var eventIdStr = eventId.ToString();
            var eventSpendFacts = await _context.SpendFacts
                .AsNoTracking()
                .Where(f => f.TransactionReference.Contains(eventIdStr)) // simplistic linking for now
                .SumAsync(f => f.Amount);

            var totalCashCost = inventoryCostView.TotalCost + eventSpendFacts;

            var currency = inventoryCostView.Currency != "N/A" ? inventoryCostView.Currency : revenueView.Currency;
            
            var cashMargin = revenueView.TotalRevenue - totalCashCost;

            return new EconomicEventMarginView
            {
                EventId = eventId,
                Description = $"Cash Margin for Event {eventId}",
                TotalRevenue = revenueView.TotalRevenue,
                TotalCost = totalCashCost,
                OperationalMargin = cashMargin,
                Currency = currency
            };
        }

        public async Task<EconomicEventMarginView> GetAccrualMarginForEventAsync(Guid eventId)
        {
            var inventoryCostView = await GetCostForEventAsync(eventId);
            var revenueView = await GetRevenueForEventAsync(eventId);

            // Fetch Direct Costs (Accrual/Obligations)
            var outsourcedCost = await _context.ReferenceLabPayables
                .Where(p => p.PatientId == eventId) // eventId corresponds to VisitId
                .SumAsync(p => p.AmountDue);

            var referralPayout = await _context.ReferralPayableFacts
                .Where(f => f.SourceVisitId == eventId)
                .SumAsync(f => f.Amount);

            var totalCost = inventoryCostView.TotalCost + outsourcedCost + referralPayout;
            
            var currency = inventoryCostView.Currency != "N/A" ? inventoryCostView.Currency : revenueView.Currency;
            
            var operationalMargin = revenueView.TotalRevenue - totalCost;

            return new EconomicEventMarginView
            {
                EventId = eventId,
                Description = $"Accrual Margin for Event {eventId}",
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

            // --- CASH BASIS (Movement Facts) ---
            var revenueFacts = await _context.RevenueFacts
                .AsNoTracking()
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Direction == RevenueDirection.Inflow)
                .ToListAsync();

            summary.TotalRevenueCash = revenueFacts.Sum(f => f.Amount);
            
            // Separation for Drawer Reconciliation
            summary.CashCollected = revenueFacts.Where(f => f.PaymentMode == PaymentMode.Cash).Sum(f => f.Amount);
            summary.OnlineCollected = revenueFacts.Where(f => f.PaymentMode != PaymentMode.Cash).Sum(f => f.Amount);

            summary.ConsumableCashOutflow = await _context.CostAttribution_UsageFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end)
                .SumAsync(f => f.TotalCost ?? 0);

            summary.OutsourcedTestCashOutflow = await _context.SpendFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "OutsourcedTest")
                .SumAsync(f => f.Amount);

            summary.ReferralCashOutflow = await _context.SpendFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Referral")
                .SumAsync(f => f.Amount);

            summary.PayrollCashOutflow = await _context.SpendFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Payroll")
                .SumAsync(f => f.Amount);

            summary.OverheadCashOutflow = await _context.SpendFacts
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Overhead")
                .SumAsync(f => f.Amount);

            // --- ACCRUAL BASIS (Obligations) ---
            summary.TotalRevenueAccrual = await _context.Invoices
                .Where(i => i.CreatedAt >= start && i.CreatedAt <= end)
                .SumAsync(i => i.Total);

            var vendorAccrual = await _context.VendorPayables
                .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                .SumAsync(p => p.Amount);

            var overheadAccrual = await _context.OverheadPayableFacts
                .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                .SumAsync(p => p.AmountDue);

            var outsourcedAccrual = await _context.ReferenceLabPayables
                .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                .SumAsync(p => p.AmountDue);

            var referralAccrual = await _context.ReferralPayableFacts
                .Where(f => f.RecordedAt >= start && f.RecordedAt <= end)
                .SumAsync(f => f.Amount);

            decimal payrollAccrual = 0;
            if (await CheckTableExistsAsync("Payables", "EmployeePayables"))
            {
                try
                {
                    payrollAccrual = await _context.EmployeePayables
                        .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                        .SumAsync(p => p.GrossSalary);
                }
                catch
                {
                    payrollAccrual = summary.PayrollCashOutflow;
                }
            }
            else
            {
                payrollAccrual = summary.PayrollCashOutflow;
            }

            summary.TotalExpensesAccrual = vendorAccrual + overheadAccrual + outsourcedAccrual + referralAccrual + payrollAccrual;

            return summary;
        }

        public async Task<IEnumerable<object>> GetRevenueFactsAsync(DateTime start, DateTime end)
        {
            return await _context.RevenueFacts
                .AsNoTracking()
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end)
                .OrderByDescending(f => f.OccurredAt)
                .Select(f => new
                {
                    f.RevenueFactId,
                    f.OccurredAt,
                    f.Amount,
                    f.Currency,
                    f.Direction,
                    f.SourceType,
                    f.SourceReferenceId,
                    f.PaymentMode,
                    f.Notes
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<object>> GetReferralPayablesAsync()
        {
            var query = from f in _context.ReferralPayableFacts
                        join v in _context.Visits on f.SourceVisitId equals v.VisitId
                        join p in _context.Patients on v.PatientId equals p.PatientId
                        where f.SettledAt == null
                        orderby f.RecordedAt descending
                        select new
                        {
                            factId = f.ReferralPayableFactId,
                            referralPartnerId = f.ReferralPartnerId,
                            partnerName = f.ReferralPartner != null ? f.ReferralPartner.Name : "Unknown Partner",
                            amount = f.Amount - f.AmountPaid,
                            originalAmount = f.Amount,
                            amountPaid = f.AmountPaid,
                            status = f.SettledAt == null ? "Pending" : "Settled",
                            createdAt = f.RecordedAt,
                            description = f.Description,
                            patientName = p.FirstName + " " + p.LastName,
                            token = v.Token
                        };

            return await query.ToListAsync();
        }

        public async Task<IEnumerable<PartnerReceivableSummaryDto>> GetPartnerReceivablesSummaryAsync()
        {
            var now = DateTimeOffset.UtcNow;
            var day7 = now.AddDays(-7);
            var day30 = now.AddDays(-30);
            
            var query = await _context.ReceivableFacts
                .AsNoTracking()
                .Where(f => f.SettledAt == null)
                .Select(f => new 
                {
                    f.ReferralPartnerId,
                    PartnerName = f.ReferralPartner != null ? f.ReferralPartner.Name : "Unknown Account",
                    f.Amount,
                    f.AmountReceived,
                    f.OccurredAt
                })
                .GroupBy(x => new { x.ReferralPartnerId, x.PartnerName })
                .Select(g => new PartnerReceivableSummaryDto
                {
                    PartnerId = g.Key.ReferralPartnerId,
                    PartnerName = g.Key.PartnerName,
                    TotalOutstanding = g.Sum(x => x.Amount - x.AmountReceived),
                    BillCount = g.Count(),
                    OldestDueDate = g.Min(x => x.OccurredAt).DateTime,
                    Aging_0_7 = g.Where(x => x.OccurredAt >= day7).Sum(x => (decimal?)(x.Amount - x.AmountReceived)) ?? 0,
                    Aging_7_30 = g.Where(x => x.OccurredAt < day7 && x.OccurredAt >= day30).Sum(x => (decimal?)(x.Amount - x.AmountReceived)) ?? 0,
                    Aging_30_Plus = g.Where(x => x.OccurredAt < day30).Sum(x => (decimal?)(x.Amount - x.AmountReceived)) ?? 0
                })
                .ToListAsync();

            return query;
        }

        public async Task<object> GetRevenueTrendsAsync(int days = 30)
        {
            var start = DateTimeOffset.UtcNow.AddDays(-days);
            
            var facts = await _context.RevenueFacts
                .AsNoTracking()
                .Where(f => f.OccurredAt >= start && f.Direction == RevenueDirection.Inflow)
                .ToListAsync();

            var dailyTrends = facts
                .GroupBy(f => f.OccurredAt.Date)
                .OrderBy(g => g.Key)
                .Select(g => new
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    Cash = g.Where(f => f.PaymentMode == PaymentMode.Cash).Sum(f => f.Amount),
                    Online = g.Where(f => f.PaymentMode != PaymentMode.Cash).Sum(f => f.Amount),
                    Total = g.Sum(f => f.Amount)
                })
                .ToList();

            return new
            {
                Daily = dailyTrends,
                TotalCash = facts.Where(f => f.PaymentMode == PaymentMode.Cash).Sum(f => f.Amount),
                TotalOnline = facts.Where(f => f.PaymentMode != PaymentMode.Cash).Sum(f => f.Amount),
                GrowthRate = 0 // Stub for now
            };
        }

        public async Task<IEnumerable<ExpenseFactDto>> GetExpenseFactsAsync(DateTime start, DateTime end)
        {
            return await _context.SpendFacts
                .AsNoTracking()
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end)
                .OrderByDescending(f => f.OccurredAt)
                .Select(f => new ExpenseFactDto
                {
                    SpendFactId = f.SpendFactId,
                    OccurredAt = f.OccurredAt,
                    Category = f.Category,
                    CategoryLabel = f.Category, // For now, labels match categories
                    PayeeName = f.PayeeName ?? "Unknown Payee",
                    Amount = f.Amount,
                    Currency = f.Currency,
                    PaymentMode = f.PaymentMethod.ToString(),
                    Reference = f.TransactionReference,
                    BranchName = "Main Branch", // Placeholder or fetch branch name
                    Notes = f.Notes ?? string.Empty
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<object>> GetSettlementHistoryAsync(string category = null)
        {
            // Combined history from SpendFacts and RevenueFacts
            var spendHistory = await _context.SpendFacts
                .AsNoTracking()
                .Where(f => f.Category == category || category == null)
                .OrderByDescending(f => f.OccurredAt)
                .Select(f => new {
                    FactId = f.SpendFactId,
                    Direction = "Outflow",
                    Amount = f.Amount,
                    Currency = f.Currency,
                    Category = f.Category,
                    PayeeName = f.PayeeName,
                    Notes = f.Notes,
                    Reference = f.TransactionReference,
                    RecordedAt = f.RecordedAt,
                    PaymentMethod = f.PaymentMethod.ToString()
                })
                .Take(100)
                .ToListAsync();

            var revenueHistory = await _context.RevenueFacts
                .AsNoTracking()
                .Where(f => f.SourceType == RevenueSourceType.Partner) // Filtering for referral-like revenue
                .OrderByDescending(f => f.OccurredAt)
                .Select(f => new {
                    FactId = f.RevenueFactId,
                    Direction = "Inflow",
                    Amount = f.Amount,
                    Currency = f.Currency,
                    Category = "Referral Recovery",
                    PayeeName = "Referral Partner",
                    Notes = f.Notes,
                    Reference = f.SourceReferenceId,
                    RecordedAt = f.DeclaredAt,
                    PaymentMethod = f.PaymentMode.ToString()
                })
                .Take(100)
                .ToListAsync();

            var combined = spendHistory.Cast<object>().Concat(revenueHistory.Cast<object>())
                .OrderByDescending(x => (DateTimeOffset)((dynamic)x).RecordedAt)
                .ToList();

            return combined;
        }

        public async Task<IEnumerable<VendorPayableSummaryDto>> GetVendorPayablesSummaryAsync()
        {
            var now = DateTimeOffset.UtcNow;
            var day7 = now.AddDays(-7);
            var day30 = now.AddDays(-30);

            var query = await _context.VendorPayables
                .AsNoTracking()
                .Where(p => p.Status != SynOS.Models.Enums.Payables.VendorPayableStatus.Settled)
                .Select(p => new
                {
                    p.VendorId,
                    p.VendorName,
                    p.Amount,
                    p.AmountPaid,
                    p.CreatedAt
                })
                .GroupBy(x => new { x.VendorId, x.VendorName })
                .Select(g => new VendorPayableSummaryDto
                {
                    VendorId = g.Key.VendorId ?? Guid.Empty,
                    VendorName = g.Key.VendorName ?? "Unknown Vendor",
                    TotalOutstanding = g.Sum(x => x.Amount - x.AmountPaid),
                    BillCount = g.Count(),
                    OldestDueDate = g.Min(x => x.CreatedAt),
                    Aging_0_7 = g.Where(x => x.CreatedAt >= day7.DateTime).Sum(x => (decimal?)(x.Amount - x.AmountPaid)) ?? 0,
                    Aging_7_30 = g.Where(x => x.CreatedAt < day7.DateTime && x.CreatedAt >= day30.DateTime).Sum(x => (decimal?)(x.Amount - x.AmountPaid)) ?? 0,
                    Aging_30_Plus = g.Where(x => x.CreatedAt < day30.DateTime).Sum(x => (decimal?)(x.Amount - x.AmountPaid)) ?? 0
                })
                .ToListAsync();

            return query;
        }

        public async Task<object> GetWorkforceBurnSummaryAsync(DateTime start, DateTime end)
        {
            if (!await CheckTableExistsAsync("Payables", "EmployeePayables"))
            {
                return new { Message = "Workforce analytics unavailable (Schema not initialized)." };
            }

            try
            {
                var totalLiability = await _context.EmployeePayables
                    .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                    .SumAsync(p => p.NetPayable);

                var actualPaid = await _context.SpendFacts
                    .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Payroll")
                    .SumAsync(f => f.Amount);

                var statutoryAccrual = await _context.EmployeePayables
                    .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                    .SumAsync(p => p.PFDeduction + p.ESIDeduction + p.TDSDeduction);

                return new
                {
                    TotalAccruedLiability = totalLiability,
                    TotalActualPaid = actualPaid,
                    TotalStatutoryAccrual = statutoryAccrual,
                    NetWorkforceBurn = totalLiability + statutoryAccrual // CTC perspective
                };
            }
            catch
            {
                return new { Message = "Workforce analytics error (Check Database Health)." };
            }
        }

        public async Task<object> GetComplianceLiabilitySummaryAsync()
        {
            if (!await CheckTableExistsAsync("Payables", "EmployeePayables"))
            {
                return new { Message = "Compliance analytics unavailable (Schema not initialized)." };
            }

            try
            {
                var pendingPF = await _context.EmployeePayables
                    .Where(p => p.Status != "Settled") // This is simplified; ideally we track deposit facts
                    .SumAsync(p => p.PFDeduction);

                var pendingESI = await _context.EmployeePayables
                    .Where(p => p.Status != "Settled")
                    .SumAsync(p => p.ESIDeduction);

                var pendingTDS = await _context.EmployeePayables
                    .Where(p => p.Status != "Settled")
                    .SumAsync(p => p.TDSDeduction);

                return new
                {
                    PendingPF = pendingPF,
                    PendingESI = pendingESI,
                    PendingTDS = pendingTDS,
                    TotalComplianceLiability = pendingPF + pendingESI + pendingTDS
                };
            }
            catch
            {
                return new { Message = "Compliance analytics error (Check Database Health)." };
            }
        }
    }
}
