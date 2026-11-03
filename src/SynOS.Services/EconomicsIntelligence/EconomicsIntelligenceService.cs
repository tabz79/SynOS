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
using SynOS.Models.Enums;
using SynOS.Services.Time;

namespace SynOS.Services.EconomicsIntelligence
{
    public class EconomicsIntelligenceService : IEconomicsIntelligenceService
    {
        private readonly SynOSDbContext _context;
        private readonly ILabTimeProvider _labTimeProvider;

        public EconomicsIntelligenceService(SynOSDbContext context, ILabTimeProvider labTimeProvider)
        {
            _context = context;
            _labTimeProvider = labTimeProvider;
        }

        private (DateTimeOffset? startUtc, DateTimeOffset? endUtc) ResolvePresetDateRange(string? preset, DateTime? explicitStart, DateTime? explicitEnd)
        {
            if (explicitStart.HasValue || explicitEnd.HasValue)
            {
                var adjustedEnd = explicitEnd;
                if (adjustedEnd.HasValue && adjustedEnd.Value.TimeOfDay == TimeSpan.Zero)
                {
                    adjustedEnd = adjustedEnd.Value.AddDays(1).AddTicks(-1);
                }
                var s = explicitStart.HasValue ? (DateTimeOffset?)new DateTimeOffset(explicitStart.Value, TimeSpan.Zero) : null;
                var e = adjustedEnd.HasValue ? (DateTimeOffset?)new DateTimeOffset(adjustedEnd.Value, TimeSpan.Zero) : null;
                return (s, e);
            }

            if (string.IsNullOrWhiteSpace(preset))
            {
                return (null, null);
            }

            var p = preset.Trim().ToLowerInvariant();
            var istZone = _labTimeProvider.GetLabTimeZone();
            var istNow = _labTimeProvider.GetLabNow();
            var istToday = istNow.Date; // 00:00:00 IST

            DateTime istStart;
            DateTime istEnd;

            switch (p)
            {
                case "today":
                    istStart = istToday;
                    istEnd = istToday.AddDays(1).AddTicks(-1);
                    break;
                case "yesterday":
                    istStart = istToday.AddDays(-1);
                    istEnd = istToday.AddTicks(-1);
                    break;
                case "this week":
                case "week":
                    istStart = istToday.AddDays(-6);
                    istEnd = istToday.AddDays(1).AddTicks(-1);
                    break;
                case "this month":
                case "month":
                    istStart = new DateTime(istToday.Year, istToday.Month, 1);
                    istEnd = istStart.AddMonths(1).AddTicks(-1);
                    break;
                case "this quarter":
                case "quarter":
                case string q when q.StartsWith("q"):
                    var quarter = (istToday.Month - 1) / 3 + 1;
                    var qStartMonth = (quarter - 1) * 3 + 1;
                    istStart = new DateTime(istToday.Year, qStartMonth, 1);
                    istEnd = istStart.AddMonths(3).AddTicks(-1);
                    break;
                case "this year":
                case "year":
                case "fy":
                    var fyStartYear = istToday.Month >= 4 ? istToday.Year : istToday.Year - 1;
                    istStart = new DateTime(fyStartYear, 4, 1);
                    istEnd = istStart.AddYears(1).AddTicks(-1);
                    break;
                case "all":
                case "all time":
                    return (null, null);
                default:
                    return (null, null);
            }

            var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(istStart, DateTimeKind.Unspecified), istZone);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(istEnd, DateTimeKind.Unspecified), istZone);
            return (new DateTimeOffset(startUtc), new DateTimeOffset(endUtc));
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

        public async Task<LabProfitabilitySummaryDto> GetLabProfitabilitySummaryAsync(DateTime start, DateTime end, Guid? branchId = null)
        {
            var summary = new LabProfitabilitySummaryDto
            {
                StartDate = start,
                EndDate = end
            };

            // --- CASH BASIS (Movement Facts) ---
            var revenueFactsQuery = _context.RevenueFacts.AsNoTracking();
            if (branchId.HasValue)
            {
                revenueFactsQuery = from f in revenueFactsQuery
                                    join v in _context.Visits on f.SourceReferenceId equals v.VisitId.ToString()
                                    where v.BranchId == branchId.Value
                                    select f;
            }

            var revenueFacts = await revenueFactsQuery
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Direction == RevenueDirection.Inflow)
                .ToListAsync();

            // Desk collections ONLY: Cash or direct digital payments (Card, UPI, Gateway).
            // STRICT CONTRACT: Exclude Prepaid, Partner Account, Corporate credit, or ledger receivables.
            summary.CashCollected = revenueFacts.Where(f => f.PaymentMode == PaymentMode.Cash).Sum(f => f.Amount);
            summary.OnlineCollected = revenueFacts.Where(f => f.PaymentMode == PaymentMode.Card || 
                                                             f.PaymentMode == PaymentMode.UPI || 
                                                             f.PaymentMode == PaymentMode.BankTransfer).Sum(f => f.Amount);
            summary.TotalRevenueCash = summary.CashCollected + summary.OnlineCollected;

            // Reconcile with direct Payments table for physical drawer and digital truth (excluding B2B Partner credit/receivable adjustments)
            var paymentsQuery = _context.Payments
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                .AsNoTracking()
                .Where(p => p.ReceivedAt >= start && p.ReceivedAt <= end && 
                            p.Method != "PartnerAccount" && 
                            p.Method != "Prepaid" && 
                            p.Method != "PartnerCollects" &&
                            p.Method != "DoctorAccount" &&
                            p.Method != "B2B" &&
                            p.Method != "Insurance" &&
                            (p.Invoice == null || p.Invoice.Visit == null || (p.Invoice.Visit.PaymentCollectionModel != "PartnerCollects" && p.Invoice.Visit.PaymentCollectionModel != "PrepaidPartner")));

            if (branchId.HasValue)
            {
                paymentsQuery = paymentsQuery.Where(p => p.Invoice != null && p.Invoice.Visit != null && p.Invoice.Visit.BranchId == branchId.Value);
            }

            var actualPayments = await paymentsQuery.ToListAsync();

            if (actualPayments.Any())
            {
                var directCash = actualPayments.Where(p => {
                    var m = (p.Method ?? "").ToLower().Trim();
                    return m == "cash" || m == "0";
                }).Sum(p => p.Amount);

                var directOnline = actualPayments.Where(p => {
                    var m = (p.Method ?? "").ToLower().Trim();
                    return m == "card" || m == "upi" || m == "banktransfer" || m == "1" || m == "2" || m == "3" || m == "gateway";
                }).Sum(p => p.Amount);

                if ((directCash + directOnline) > summary.TotalRevenueCash)
                {
                    summary.CashCollected = directCash;
                    summary.OnlineCollected = directOnline;
                    summary.TotalRevenueCash = directCash + directOnline;
                }
            }

            var consumableFactsQuery = _context.CostAttribution_UsageFacts.AsNoTracking();
            if (branchId.HasValue)
            {
                consumableFactsQuery = consumableFactsQuery.Where(f => f.BranchId == branchId.Value);
            }

            summary.ConsumableCashOutflow = await consumableFactsQuery
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end)
                .SumAsync(f => f.TotalCost ?? 0);

            var spendFactsQuery = _context.SpendFacts.AsNoTracking();
            if (branchId.HasValue)
            {
                spendFactsQuery = spendFactsQuery.Where(f => f.BranchId == branchId.Value);
            }

            summary.OutsourcedTestCashOutflow = await spendFactsQuery
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "OutsourcedTest")
                .SumAsync(f => f.Amount);

            summary.ReferralCashOutflow = await spendFactsQuery
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Referral")
                .SumAsync(f => f.Amount);

            summary.PayrollCashOutflow = await spendFactsQuery
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Payroll")
                .SumAsync(f => f.Amount);

            summary.OverheadCashOutflow = await spendFactsQuery
                .Where(f => f.OccurredAt >= start && f.OccurredAt <= end && f.Category == "Overhead")
                .SumAsync(f => f.Amount);

            // --- ACCRUAL BASIS (Obligations & Net Billed Legal Truth) ---
            var invoicesQuery = _context.Invoices.AsNoTracking();
            if (branchId.HasValue)
            {
                invoicesQuery = invoicesQuery.Where(i => i.Visit != null && i.Visit.BranchId == branchId.Value);
            }

            var invoicesInPeriod = await invoicesQuery
                .Where(i => i.CreatedAt >= start && i.CreatedAt <= end)
                .Select(i => new {
                    i.GrossAmount,
                    i.DiscountAmount,
                    i.NetAmount,
                    i.Total
                })
                .ToListAsync();

            decimal calculatedNetBilled = 0;
            foreach (var inv in invoicesInPeriod)
            {
                if (inv.NetAmount > 0)
                {
                    calculatedNetBilled += inv.NetAmount;
                }
                else if (inv.DiscountAmount > 0)
                {
                    var baseGross = inv.GrossAmount > 0 ? inv.GrossAmount : inv.Total;
                    calculatedNetBilled += Math.Max(0, baseGross - inv.DiscountAmount);
                }
                else
                {
                    calculatedNetBilled += (inv.Total > 0 ? inv.Total : inv.GrossAmount);
                }
            }

            // Also check total active concessions declared in period (Patient DiscountFacts + B2B Partner Concessions)
            var patientConcessions = await _context.DiscountFacts
                .AsNoTracking()
                .Where(df => df.AppliedAt >= start && df.AppliedAt <= end && df.IsActive)
                .SumAsync(df => df.DiscountAmount);

            var visitsInPeriodQuery = _context.Visits.AsNoTracking()
                .Where(v => v.CreatedAt >= start && v.CreatedAt <= end && v.Status != VisitStatus.Cancelled);
            if (branchId.HasValue) visitsInPeriodQuery = visitsInPeriodQuery.Where(v => v.BranchId == branchId.Value);

            var b2bConcessions = await visitsInPeriodQuery
                .SumAsync(v => v.B2BDiscountAmount ?? 0m);

            var totalConcessionsInPeriod = patientConcessions + b2bConcessions;

            var totalGrossInPeriod = invoicesInPeriod.Sum(i => i.GrossAmount > 0 ? i.GrossAmount : i.Total);
            if (totalGrossInPeriod == 0)
            {
                var ordersInPeriod = _context.Orders.AsNoTracking()
                    .Where(o => o.CreatedAt >= start && o.CreatedAt <= end && o.Status != OrderStatus.Cancelled);
                if (branchId.HasValue) ordersInPeriod = ordersInPeriod.Where(o => o.Visit != null && o.Visit.BranchId == branchId.Value);
                totalGrossInPeriod = await ordersInPeriod.SumAsync(o => o.Price);
            }

            if (totalConcessionsInPeriod > 0)
            {
                calculatedNetBilled = Math.Max(0, totalGrossInPeriod - totalConcessionsInPeriod);
            }

            summary.TotalRevenueAccrual = calculatedNetBilled;

            summary.BillsCount = invoicesInPeriod.Count;

            if (summary.BillsCount == 0)
            {
                var visitsQuery = _context.Visits.AsNoTracking();
                if (branchId.HasValue) visitsQuery = visitsQuery.Where(v => v.BranchId == branchId.Value);
                summary.BillsCount = await visitsQuery.Where(v => v.CreatedAt >= start && v.CreatedAt <= end).CountAsync();
            }

            var vendorPayablesQuery = _context.VendorPayables.AsNoTracking();
            if (branchId.HasValue)
            {
                vendorPayablesQuery = from p in vendorPayablesQuery
                                      join lot in _context.ImsInventoryLots on p.ReferenceId equals lot.LotId
                                      where lot.BranchId == branchId.Value
                                      select p;
            }

            var vendorAccrual = await vendorPayablesQuery
                .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                .SumAsync(p => p.Amount);

            // Overheads are global/non-branch specific. Set to 0 if remote branch is specified.
            decimal overheadAccrual = 0;
            if (!branchId.HasValue)
            {
                overheadAccrual = await _context.OverheadPayableFacts
                    .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                    .SumAsync(p => p.AmountDue);
            }

            var refLabPayablesQuery = _context.ReferenceLabPayables.AsNoTracking();
            if (branchId.HasValue)
            {
                refLabPayablesQuery = from p in refLabPayablesQuery
                                      join v in _context.Visits on p.PatientId equals v.VisitId
                                      where v.BranchId == branchId.Value
                                      select p;
            }

            var outsourcedAccrual = await refLabPayablesQuery
                .Where(p => p.CreatedAt >= start && p.CreatedAt <= end)
                .SumAsync(p => p.AmountDue);

            var referralPayablesQuery = _context.ReferralPayableFacts.AsNoTracking();
            if (branchId.HasValue)
            {
                referralPayablesQuery = from f in referralPayablesQuery
                                        join v in _context.Visits on f.SourceVisitId equals v.VisitId
                                        where v.BranchId == branchId.Value
                                        select f;
            }

            var referralAccrual = await referralPayablesQuery
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

            // Departmental Profitability Calculation (Pathology Disciplines & Radiology Modalities)
            var deptList = new List<DepartmentProfitabilityDto>();
            var totalRev = summary.TotalRevenueAccrual > 0 ? summary.TotalRevenueAccrual : (summary.TotalRevenueCash > 0 ? summary.TotalRevenueCash : 1);
            var cashRatio = summary.TotalRevenueAccrual > 0 ? (summary.TotalRevenueCash / summary.TotalRevenueAccrual) : 1.0m;

            // Fetch actual order data in period if available (match by order creation date OR visit creation date)
            var ordersQuery = _context.Orders.AsNoTracking();
            if (branchId.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.Visit != null && o.Visit.BranchId == branchId.Value);
            }
            var recentOrders = await ordersQuery
                .Where(o => (o.CreatedAt >= start && o.CreatedAt <= end) || 
                            (o.Visit != null && o.Visit.CreatedAt >= start && o.Visit.CreatedAt <= end))
                .Where(o => o.Status != OrderStatus.Cancelled)
                .Select(o => new {
                    Department = o.Department ?? "",
                    Category = o.Test != null ? (o.Test.Category ?? "") : "",
                    Modality = o.Test != null && o.Test.ModalityMaster != null ? (o.Test.ModalityMaster.Name ?? "") : "",
                    DeptName = o.Test != null && o.Test.DepartmentMaster != null ? (o.Test.DepartmentMaster.Name ?? "") : "",
                    TestName = o.Test != null ? (o.Test.TestName ?? "") : (o.TestCode ?? ""),
                    TestCode = o.TestCode ?? "",
                    Price = o.Price - o.Discount
                })
                .ToListAsync();

            // Setup 4 Pathology Disciplines + 4 Radiology Modalities
            var targetDepartments = new[]
            {
                // PATHOLOGY (68% baseline diagnostic workload)
                new { Name = "Biochemistry", Category = "Pathology", Modality = "Biochemistry", Share = 0.28m, CostShare = 0.22m, DefaultCount = 142 },
                new { Name = "Hematology", Category = "Pathology", Modality = "Hematology", Share = 0.20m, CostShare = 0.20m, DefaultCount = 98 },
                new { Name = "Microbiology", Category = "Pathology", Modality = "Microbiology", Share = 0.12m, CostShare = 0.18m, DefaultCount = 45 },
                new { Name = "Histopathology", Category = "Pathology", Modality = "Histopathology", Share = 0.08m, CostShare = 0.25m, DefaultCount = 16 },
                // RADIOLOGY (32% baseline imaging workload)
                new { Name = "X-Ray", Category = "Radiology", Modality = "X-Ray", Share = 0.08m, CostShare = 0.15m, DefaultCount = 38 },
                new { Name = "CT Scan", Category = "Radiology", Modality = "CT Scan", Share = 0.12m, CostShare = 0.18m, DefaultCount = 24 },
                new { Name = "Ultrasound", Category = "Radiology", Modality = "Ultrasound", Share = 0.07m, CostShare = 0.12m, DefaultCount = 29 },
                new { Name = "MRI", Category = "Radiology", Modality = "MRI", Share = 0.05m, CostShare = 0.20m, DefaultCount = 12 }
            };

            // Enterprise clinical test classifier mapping orders deterministically to the 8 departments
            Func<string, string, string, string, string, string, string> classifyOrder = (dept, cat, mod, deptName, testName, testCode) =>
            {
                var combined = $"{dept} {cat} {mod} {deptName} {testName} {testCode}".ToLowerInvariant();
                var d = dept.ToLowerInvariant().Trim();
                var m = mod.ToLowerInvariant().Trim();
                var dn = deptName.ToLowerInvariant().Trim();

                // 1. Radiology Modalities
                if (m.Contains("mri") || m.Contains("mr") || d == "mri" || combined.Contains("mri") || combined.Contains(" mr ") || combined.Contains("magnetic resonance"))
                    return "MRI";

                if (m.Contains("ct") || d == "ct" || combined.Contains(" ct ") || combined.Contains("ct scan") || combined.StartsWith("ct_") || combined.StartsWith("ct ") || combined.Contains("computed tomography") || combined.Contains("hrct"))
                    return "CT Scan";

                if (m.Contains("usg") || m.Contains("ultra") || d == "usg" || combined.Contains("ultrasound") || combined.Contains("usg") || combined.Contains("echo") || combined.Contains("sonography") || combined.Contains("doppler"))
                    return "Ultrasound";

                if (m.Contains("x-ray") || m.Contains("xray") || d == "x-ray" || d == "xray" || d == "rad" || combined.Contains("x-ray") || combined.Contains("xray") || combined.Contains("routine_xray") || combined.Contains("chest_pa") || combined.Contains(" xr ") || combined.EndsWith("xr") || combined.Contains("radiology"))
                    return "X-Ray";

                // 2. Pathology Disciplines
                if (d == "histo" || d == "hist" || d == "cyto" || dn.Contains("histo") || dn.Contains("cyto") ||
                    combined.Contains("histo") || combined.Contains("biopsy") || combined.Contains("fnac") || 
                    combined.Contains("pap") || combined.Contains("cytology") || combined.Contains("tissue") || 
                    combined.Contains("fluid analysis") || combined.Contains("carcinoma"))
                    return "Histopathology";

                if (d == "micro" || d == "sero" || d == "cps" || dn.Contains("micro") || dn.Contains("sero") ||
                    combined.Contains("micro") || combined.Contains("sero") || combined.Contains("culture") || 
                    combined.Contains("gram") || combined.Contains("afb") || combined.Contains("sputum") || 
                    combined.Contains("urine") || combined.Contains("stool") || combined.Contains("widal") || 
                    combined.Contains("typhoid") || combined.Contains("dengue") || combined.Contains("malaria") || 
                    combined.Contains("hiv") || combined.Contains("hbsag") || combined.Contains("hcv") || 
                    combined.Contains("vdrl") || combined.Contains("tpha") || combined.Contains("crp") || 
                    combined.Contains("ra factor") || combined.Contains("aso") || combined.Contains("antigen") || 
                    combined.Contains("influenza") || combined.Contains("swab") || combined.Contains("fungal") ||
                    combined.Contains("antibody"))
                    return "Microbiology";

                if (d == "bio" || dn.Contains("biochem") || dn.Contains("chem") ||
                    combined.Contains("bio") || combined.Contains("glucose") || combined.Contains("sugar") || 
                    combined.Contains("rbs") || combined.Contains("fbs") || combined.Contains("ppbs") || 
                    combined.Contains("lft") || combined.Contains("liver") || combined.Contains("kft") || 
                    combined.Contains("rft") || combined.Contains("renal") || combined.Contains("kidney") || 
                    combined.Contains("lipid") || combined.Contains("cholesterol") || combined.Contains("electrolyte") || 
                    combined.Contains("sodium") || combined.Contains("potassium") || combined.Contains("thyroid") || 
                    combined.Contains("tsh") || combined.Contains("t3") || combined.Contains("t4") || 
                    combined.Contains("hba1c") || combined.Contains("creatinine") || combined.Contains("urea") || 
                    combined.Contains("bilirubin") || combined.Contains("calcium") || combined.Contains("vitamin") || 
                    combined.Contains("amylase") || combined.Contains("lipase") || combined.Contains("protein") || 
                    combined.Contains("albumin") || combined.Contains("uric") || combined.Contains("serum"))
                    return "Biochemistry";

                // Default Pathology discipline: Hematology (HEM, CP, CBC, CBP, ESR, Blood, etc.)
                return "Hematology";
            };

            foreach (var target in targetDepartments)
            {
                decimal deptRev = 0;
                int testsCount = 0;

                // Match against actual orders if present
                if (recentOrders.Any())
                {
                    var matched = recentOrders.Where(o => classifyOrder(o.Department, o.Category, o.Modality, o.DeptName, o.TestName, o.TestCode) == target.Modality).ToList();

                    if (matched.Any())
                    {
                        var rawMatchedPrice = matched.Sum(m => Math.Max(0, m.Price));
                        var totalOrdersGross = recentOrders.Sum(o => Math.Max(0, o.Price));

                        // Scale to net revenue if concession was applied at visit/invoice level
                        if (summary.TotalRevenueAccrual > 0 && totalOrdersGross > summary.TotalRevenueAccrual)
                        {
                            deptRev = Math.Round(rawMatchedPrice * (summary.TotalRevenueAccrual / totalOrdersGross), MidpointRounding.AwayFromZero);
                        }
                        else
                        {
                            deptRev = rawMatchedPrice;
                        }
                        testsCount = matched.Count();
                    }
                }

                // Material / direct cost calculation
                decimal deptCost = 0;
                if (target.Category == "Pathology" && summary.ConsumableCashOutflow > 0 && testsCount > 0)
                {
                    deptCost = Math.Round(summary.ConsumableCashOutflow * target.CostShare, MidpointRounding.AwayFromZero);
                }
                else
                {
                    deptCost = Math.Round(deptRev * target.CostShare, MidpointRounding.AwayFromZero);
                }

                decimal baseMargin = totalRev > 0 ? (summary.NetCashPosition / totalRev) : 0.70m;
                decimal deptMargin = deptRev > 0 ? ((deptRev - deptCost) / deptRev) : 0;
                decimal multiplier = baseMargin > 0.05m ? Math.Round(Math.Max(0.5m, deptMargin / baseMargin), 1) : 1.0m;

                deptList.Add(new DepartmentProfitabilityDto
                {
                    DepartmentName = target.Name,
                    Category = target.Category,
                    Modality = target.Modality,
                    BilledRevenue = deptRev,
                    CashCollected = Math.Round(deptRev * Math.Min(1.0m, Math.Max(0.5m, cashRatio)), MidpointRounding.AwayFromZero),
                    DirectCost = deptCost,
                    ProfitMultiplier = multiplier > 0 ? multiplier : 1.0m,
                    TotalTestsCompleted = testsCount
                });
            }

            // Strictly adhere to SSOT: If zero pathology tests were performed in this branch/window, pathology revenue and test counts must remain strictly 0.
            summary.DepartmentProfitability = deptList;

            // Populate Real Doctor & Clinic Partner ROI from database
            try
            {
                var partnerQuery = _context.ReferralPartners.AsNoTracking();
                
                // Group referral facts by partner within date range
                var factsQuery = _context.ReferralPayableFacts.AsNoTracking()
                    .Where(f => f.RecordedAt >= start && f.RecordedAt <= end);

                var partnerStats = await (from f in factsQuery
                                          join p in partnerQuery on f.ReferralPartnerId equals p.ReferralPartnerId
                                          join v in _context.Visits on f.SourceVisitId equals v.VisitId into vGroup
                                          from v in vGroup.DefaultIfEmpty()
                                          where !branchId.HasValue || (v != null && v.BranchId == branchId.Value)
                                          group new { f, v } by new { p.ReferralPartnerId, p.Name, p.ClinicName } into g
                                          select new
                                          {
                                              PartnerId = g.Key.ReferralPartnerId,
                                              PartnerName = !string.IsNullOrEmpty(g.Key.ClinicName) ? $"{g.Key.Name} ({g.Key.ClinicName})" : g.Key.Name,
                                              TotalCommission = g.Sum(x => x.f.Amount),
                                              PatientCount = g.Select(x => x.f.SourceVisitId).Distinct().Count()
                                          })
                                          .OrderByDescending(x => x.TotalCommission)
                                          .Take(5)
                                          .ToListAsync();

                var partnerRoiList = new List<PartnerRoiDto>();
                foreach (var ps in partnerStats)
                {
                    // Calculate revenue generated from referral payout base
                    var estRevenue = ps.TotalCommission > 0 ? Math.Round(ps.TotalCommission / 0.18m, MidpointRounding.AwayFromZero) : 0m;
                    var netMargin = estRevenue > 0 ? Math.Round(((estRevenue - ps.TotalCommission) / estRevenue) * 100m, 1) : 0m;
                    
                    partnerRoiList.Add(new PartnerRoiDto
                    {
                        PartnerId = ps.PartnerId,
                        PartnerName = ps.PartnerName,
                        TotalRevenueGenerated = estRevenue,
                        TotalCommissionEarned = Math.Round(ps.TotalCommission, MidpointRounding.AwayFromZero),
                        PatientCount = ps.PatientCount,
                        GrowthPercentage = netMargin
                    });
                }

                if (!partnerRoiList.Any())
                {
                    var registeredPartners = await partnerQuery
                        .OrderBy(p => p.Name)
                        .Take(5)
                        .ToListAsync();

                    foreach (var p in registeredPartners)
                    {
                        var pName = !string.IsNullOrEmpty(p.ClinicName) ? $"{p.Name} ({p.ClinicName})" : p.Name;
                        partnerRoiList.Add(new PartnerRoiDto
                        {
                            PartnerId = p.ReferralPartnerId,
                            PartnerName = pName,
                            TotalRevenueGenerated = 0m,
                            TotalCommissionEarned = 0m,
                            PatientCount = 0,
                            GrowthPercentage = 0m
                        });
                    }
                }

                summary.TopPartnerRoi = partnerRoiList;
            }
            catch
            {
                // Soft fallback if partner tables are empty
            }

            return summary;
        }

        public async Task<IEnumerable<object>> GetRevenueFactsAsync(DateTime start, DateTime end)
        {
            return await GetRevenueFactsAsync(null, null, start, end);
        }

        public async Task<IEnumerable<object>> GetRevenueFactsAsync(
            Guid? branchId = null, 
            string? preset = null, 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);
            if (!startUtc.HasValue && !endUtc.HasValue && string.IsNullOrWhiteSpace(preset) && !startDate.HasValue && !endDate.HasValue)
            {
                // Default to last 30 days if completely unbounded
                var now = DateTimeOffset.UtcNow;
                startUtc = now.AddDays(-30);
                endUtc = now;
            }

            var factsQuery = _context.RevenueFacts.AsNoTracking();
            if (startUtc.HasValue) factsQuery = factsQuery.Where(f => f.OccurredAt >= startUtc.Value);
            if (endUtc.HasValue) factsQuery = factsQuery.Where(f => f.OccurredAt <= endUtc.Value);

            var rawFacts = await factsQuery
                .OrderByDescending(f => f.OccurredAt)
                .ToListAsync();

            if (rawFacts.Count == 0) return Enumerable.Empty<object>();

            // 1. Extract GUID candidates from SourceReferenceId and Notes
            var refGuids = new HashSet<Guid>();
            var guidRegex = new System.Text.RegularExpressions.Regex(@"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

            foreach (var f in rawFacts)
            {
                if (Guid.TryParse(f.SourceReferenceId, out var g))
                    refGuids.Add(g);

                if (!string.IsNullOrEmpty(f.Notes))
                {
                    var matches = guidRegex.Matches(f.Notes);
                    foreach (System.Text.RegularExpressions.Match m in matches)
                    {
                        if (Guid.TryParse(m.Value, out var mg))
                            refGuids.Add(mg);
                    }
                }
            }

            // 2. Batch load Payments
            var payments = await _context.Payments
                .AsNoTracking()
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                        .ThenInclude(v => v.Branch)
                .Where(p => refGuids.Contains(p.PaymentId))
                .ToDictionaryAsync(p => p.PaymentId);

            // 3. Batch load Invoices
            var invoices = await _context.Invoices
                .AsNoTracking()
                .Include(i => i.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(i => i.Visit)
                    .ThenInclude(v => v.Branch)
                .Where(i => refGuids.Contains(i.InvoiceId))
                .ToDictionaryAsync(i => i.InvoiceId);

            // 4. Batch load ReceivableFacts
            var receivables = await _context.ReceivableFacts
                .AsNoTracking()
                .Include(r => r.ReferralPartner)
                .Where(r => refGuids.Contains(r.ReceivableFactId))
                .ToDictionaryAsync(r => r.ReceivableFactId);

            // 5. Batch load Visits (including those referenced by ReceivableFacts)
            var visitGuids = new HashSet<Guid>(refGuids);
            foreach (var ar in receivables.Values)
            {
                if (ar.SourceVisitId != Guid.Empty)
                    visitGuids.Add(ar.SourceVisitId);
            }

            var visits = await _context.Visits
                .AsNoTracking()
                .Include(v => v.Patient)
                .Include(v => v.Branch)
                .Where(v => visitGuids.Contains(v.VisitId))
                .ToDictionaryAsync(v => v.VisitId);

            var results = new List<object>();

            foreach (var f in rawFacts)
            {
                SynOS.Models.Entities.Visit? visit = null;
                string? debtorOrPartner = null;
                string cleanNotes = "";

                Guid refGuid = Guid.Empty;
                Guid.TryParse(f.SourceReferenceId, out refGuid);

                // Try Payment
                if (refGuid != Guid.Empty && payments.TryGetValue(refGuid, out var payment))
                {
                    visit = payment.Invoice?.Visit;
                    cleanNotes = payment.Amount < 0 
                        ? "Visit Refund Disbursed" 
                        : (payment.Invoice != null && payment.Amount < payment.Invoice.Total ? "Partial Bill Payment" : "Patient Counter Payment");
                }
                // Try ReceivableFact
                else if (refGuid != Guid.Empty && receivables.TryGetValue(refGuid, out var receivable))
                {
                    if (receivable.SourceVisitId != Guid.Empty)
                        visits.TryGetValue(receivable.SourceVisitId, out visit);
                    debtorOrPartner = receivable.ReferralPartner?.Name ?? receivable.DebtorName;
                    cleanNotes = $"B2B Partner Settlement - {debtorOrPartner ?? "Institutional Account"}";
                }
                // Try Direct Visit
                else if (refGuid != Guid.Empty && visits.TryGetValue(refGuid, out var vDirect))
                {
                    visit = vDirect;
                    cleanNotes = "Visit Account Adjustment";
                }

                // Fallback: check Notes for Invoice GUID
                if (visit == null && !string.IsNullOrEmpty(f.Notes))
                {
                    var match = guidRegex.Match(f.Notes);
                    if (match.Success && Guid.TryParse(match.Value, out var invGuid) && invoices.TryGetValue(invGuid, out var inv))
                    {
                        visit = inv.Visit;
                        cleanNotes = "Patient Bill Settlement";
                    }
                }

                // Branch filter enforcement
                if (branchId.HasValue && branchId.Value != Guid.Empty)
                {
                    if (visit != null && visit.BranchId != branchId.Value)
                        continue;
                }

                // Canonical OG Bill Number: ${CleanToken}-${yyMMdd}
                string rawToken = visit?.Token ?? "";
                string cleanToken = rawToken.Replace("-", "").Trim().ToUpper();
                string canonicalBillNo;
                if (!string.IsNullOrEmpty(cleanToken) && !cleanToken.StartsWith("D"))
                {
                    canonicalBillNo = $"{cleanToken}-{f.OccurredAt:yyMMdd}";
                }
                else if (!string.IsNullOrEmpty(f.ExternalTransactionId) && !f.ExternalTransactionId.StartsWith("RCPT-") && !f.ExternalTransactionId.StartsWith("REF-"))
                {
                    canonicalBillNo = f.ExternalTransactionId;
                }
                else
                {
                    canonicalBillNo = !string.IsNullOrEmpty(rawToken) ? $"{cleanToken}-{f.OccurredAt:yyMMdd}" : "COUNTER-RCPT";
                }

                string patientName = visit?.Patient != null
                    ? $"{visit.Patient.FirstName} {visit.Patient.LastName}".Trim()
                    : (debtorOrPartner ?? (f.SourceType == RevenueSourceType.Partner ? "B2B Referral Partner" : "Walk-in Patient"));

                if (string.IsNullOrEmpty(cleanNotes))
                {
                    cleanNotes = f.SourceType == RevenueSourceType.Partner 
                        ? "B2B Partner Settlement" 
                        : (f.Direction == RevenueDirection.Reversal ? "Correction / Cancellation Refund" : "Walk-in Patient Payment");
                }

                results.Add(new
                {
                    RevenueFactId = f.RevenueFactId,
                    OccurredAt = f.OccurredAt,
                    Amount = f.Amount,
                    Currency = f.Currency,
                    Direction = f.Direction.ToString(),
                    SourceType = f.SourceType.ToString(),
                    SourceReferenceId = f.SourceReferenceId,
                    PaymentMode = f.PaymentMode.ToString(),
                    Notes = f.Notes,
                    CleanNotes = cleanNotes,
                    CanonicalBillNo = canonicalBillNo,
                    BillNumber = canonicalBillNo,
                    Token = rawToken,
                    PatientName = patientName,
                    PatientMrn = visit?.Patient?.MRN ?? "",
                    BranchId = visit?.BranchId,
                    BranchName = visit?.Branch?.Name,
                    ExternalTransactionId = f.ExternalTransactionId
                });
            }

            return results;
        }

        public async Task<IEnumerable<object>> GetReferralPayablesAsync()
        {
            var raw = await (from f in _context.ReferralPayableFacts
                             join v in _context.Visits on f.SourceVisitId equals v.VisitId
                             join p in _context.Patients on v.PatientId equals p.PatientId
                             where f.SettledAt == null
                             orderby f.RecordedAt descending
                             select new
                             {
                                 f.ReferralPayableFactId,
                                 f.Amount,
                                 f.AmountPaid,
                                 f.SettledAt,
                                 f.RecordedAt,
                                 f.Description,
                                 PatientName = (p.FirstName + " " + p.LastName).Trim(),
                                 Token = v.Token,
                                 PrimaryPartnerId = v.ReferralPartnerId,
                                 PrimaryPartnerName = v.ReferralPartner != null ? v.ReferralPartner.Name : null,
                                 SecondaryPartnerId = v.SecondaryReferralPartnerId,
                                 SecondaryPartnerName = v.SecondaryReferralPartner != null ? v.SecondaryReferralPartner.Name : null,
                                 DefaultPartnerId = f.ReferralPartnerId,
                                 DefaultPartnerName = f.ReferralPartner != null ? f.ReferralPartner.Name : "Unknown Partner"
                             }).ToListAsync();

            return raw.Select(x =>
            {
                // Secondary referral partner receives payouts whenever assigned
                var effectivePartnerId = x.SecondaryPartnerId ?? x.PrimaryPartnerId ?? x.DefaultPartnerId;
                var effectivePartnerName = x.SecondaryPartnerName ?? x.PrimaryPartnerName ?? x.DefaultPartnerName;
                var hasReferralChain = x.SecondaryPartnerId.HasValue && x.PrimaryPartnerId.HasValue;

                return new
                {
                    factId = x.ReferralPayableFactId,
                    referralPartnerId = effectivePartnerId,
                    partnerName = effectivePartnerName,
                    amount = x.Amount - x.AmountPaid,
                    originalAmount = x.Amount,
                    amountPaid = x.AmountPaid,
                    status = x.SettledAt == null ? "Pending" : "Settled",
                    createdAt = x.RecordedAt,
                    description = x.Description,
                    patientName = x.PatientName,
                    token = x.Token,
                    primaryDoctorId = x.PrimaryPartnerId,
                    primaryDoctorName = x.PrimaryPartnerName,
                    secondaryDoctorId = x.SecondaryPartnerId,
                    secondaryDoctorName = x.SecondaryPartnerName,
                    hasReferralChain = hasReferralChain
                };
            }).ToList();
        }

        public async Task<IEnumerable<PartnerReceivableSummaryDto>> GetPartnerReceivablesSummaryAsync(
            Guid? branchId = null, 
            string? preset = null, 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);
            var now = DateTimeOffset.UtcNow;
            var day7 = now.AddDays(-7);
            var day30 = now.AddDays(-30);

            var baseFacts = _context.ReceivableFacts.AsNoTracking().Where(f => f.SettledAt == null);
            if (startUtc.HasValue) baseFacts = baseFacts.Where(f => f.OccurredAt >= startUtc.Value);
            if (endUtc.HasValue) baseFacts = baseFacts.Where(f => f.OccurredAt <= endUtc.Value);
            
            var raw = await (from f in baseFacts
                             join v in _context.Visits.AsNoTracking() on f.SourceVisitId equals v.VisitId into vj
                             from v in vj.DefaultIfEmpty()
                             where (v == null || (v.Status != VisitStatus.Draft && 
                                                 (v.Token == null || !v.Token.StartsWith("D-")) && 
                                                 (!branchId.HasValue || branchId == Guid.Empty || v.BranchId == branchId.Value)))
                             select new
                             {
                                 EffectivePartnerId = (v != null && v.SecondaryReferralPartnerId != null) 
                                     ? v.SecondaryReferralPartnerId.Value 
                                     : (v != null && v.ReferralPartnerId != null) 
                                         ? v.ReferralPartnerId.Value 
                                         : (f.ReferralPartnerId ?? (f.DebtorId != Guid.Empty ? f.DebtorId : f.ReceivableFactId)),
                                 EffectivePartnerName = (v != null && v.SecondaryReferralPartner != null)
                                     ? v.SecondaryReferralPartner.Name
                                     : (v != null && v.ReferralPartner != null)
                                         ? v.ReferralPartner.Name
                                         : (f.ReferralPartner != null ? f.ReferralPartner.Name : (!string.IsNullOrEmpty(f.DebtorName) ? f.DebtorName : (v != null && v.CorporateAccount != null ? v.CorporateAccount.CompanyName : "Institutional Account"))),
                                 EffectiveAmount = (v != null && (v.PaymentCollectionModel == "PartnerCollects" || f.DebtorType == DebtorType.Partner))
                                     ? Math.Max(0m, (v.Invoices.OrderByDescending(i => i.CreatedAt).Select(i => (decimal?)i.GrossAmount).FirstOrDefault() ?? f.Amount) - ((v.B2BDiscountAmount.HasValue && v.B2BDiscountAmount.Value > 0) ? v.B2BDiscountAmount.Value : (v.Invoices.OrderByDescending(i => i.CreatedAt).Select(i => (decimal?)i.DiscountAmount).FirstOrDefault() ?? 0m)))
                                     : f.Amount,
                                 f.Amount,
                                 f.AmountReceived,
                                 f.OccurredAt
                             }).ToListAsync();

            var query = raw
                .GroupBy(x => new { x.EffectivePartnerId, x.EffectivePartnerName })
                .Select(g => new PartnerReceivableSummaryDto
                {
                    PartnerId = g.Key.EffectivePartnerId,
                    PartnerName = g.Key.EffectivePartnerName,
                    TotalOutstanding = g.Sum(x => x.EffectiveAmount - x.AmountReceived),
                    BillCount = g.Count(),
                    OldestDueDate = g.Min(x => x.OccurredAt).DateTime,
                    Aging_0_7 = g.Where(x => x.OccurredAt >= day7).Sum(x => (decimal?)(x.EffectiveAmount - x.AmountReceived)) ?? 0,
                    Aging_7_30 = g.Where(x => x.OccurredAt < day7 && x.OccurredAt >= day30).Sum(x => (decimal?)(x.EffectiveAmount - x.AmountReceived)) ?? 0,
                    Aging_30_Plus = g.Where(x => x.OccurredAt < day30).Sum(x => (decimal?)(x.EffectiveAmount - x.AmountReceived)) ?? 0
                })
                .ToList();

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
