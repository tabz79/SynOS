using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Enums;
using SynOS.Models.Enums.Referral;
using SynOS.Services.Referral;
using SynOS.Services.Security;
using SynOS.Services.Time;

namespace SynOS.Api.Controllers.Admin.Referral
{
    [ApiController]
    [Route("api/v1/admin/referral-commissions")]
    [Authorize]
    public class ReferralCommissionsController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IReferralFinancialService _referralFinancialService;
        private readonly IReferralCommissionGoverningEngine _governingEngine;
        private readonly IUserContext _userContext;
        private readonly ILabTimeProvider _labTimeProvider;

        public ReferralCommissionsController(
            SynOSDbContext context,
            IReferralFinancialService referralFinancialService,
            IReferralCommissionGoverningEngine governingEngine,
            IUserContext userContext,
            ILabTimeProvider labTimeProvider)
        {
            _context = context;
            _referralFinancialService = referralFinancialService;
            _governingEngine = governingEngine;
            _userContext = userContext;
            _labTimeProvider = labTimeProvider;
        }

        private (DateTimeOffset? startUtc, DateTimeOffset? endUtc) ResolvePresetDateRange(
            string? preset, 
            DateTime? explicitStart, 
            DateTime? explicitEnd)
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
                preset = "this_month";
            }

            var p = preset.Trim().ToLowerInvariant().Replace("-", "_");
            var istZone = _labTimeProvider.GetLabTimeZone();
            var istNow = _labTimeProvider.GetLabNow();
            var istToday = istNow.Date;

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
                case "this_week":
                case "week":
                    istStart = istToday.AddDays(-6);
                    istEnd = istToday.AddDays(1).AddTicks(-1);
                    break;
                case "this_month":
                case "month":
                    istStart = new DateTime(istToday.Year, istToday.Month, 1);
                    istEnd = istStart.AddMonths(1).AddTicks(-1);
                    break;
                case "this_quarter":
                case "quarter":
                    var quarter = (istToday.Month - 1) / 3 + 1;
                    var qStartMonth = (quarter - 1) * 3 + 1;
                    istStart = new DateTime(istToday.Year, qStartMonth, 1);
                    istEnd = istStart.AddMonths(3).AddTicks(-1);
                    break;
                case "this_year":
                case "year":
                case "fy":
                    var fyStartYear = istToday.Month >= 4 ? istToday.Year : istToday.Year - 1;
                    istStart = new DateTime(fyStartYear, 4, 1);
                    istEnd = istStart.AddYears(1).AddTicks(-1);
                    break;
                case "all":
                case "all_time":
                    return (null, null);
                default:
                    istStart = new DateTime(istToday.Year, istToday.Month, 1);
                    istEnd = istStart.AddMonths(1).AddTicks(-1);
                    break;
            }

            var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(istStart, DateTimeKind.Unspecified), istZone);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(istEnd, DateTimeKind.Unspecified), istZone);
            return (new DateTimeOffset(startUtc), new DateTimeOffset(endUtc));
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard(
            [FromQuery] Guid? branchId = null,
            [FromQuery] bool isConsolidated = false,
            [FromQuery] string? preset = "this_month",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            // 1. Ensure any eligible visits created at reception have their commissions safely recognized
            await _referralFinancialService.BackfillUnrecognizedCommissionsAsync();

            Guid? effectiveBranchId = isConsolidated ? null : (branchId ?? _userContext.CurrentBranchId);

            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);

            // Compute prior equivalent time window for trend percentage calculation
            DateTimeOffset? priorStartUtc = null;
            DateTimeOffset? priorEndUtc = null;
            if (startUtc.HasValue && endUtc.HasValue)
            {
                var duration = endUtc.Value - startUtc.Value;
                priorEndUtc = startUtc.Value.AddTicks(-1);
                priorStartUtc = priorEndUtc.Value - duration;
            }

            // Clean active partners query
            var partners = await _context.ReferralPartners
                .AsNoTracking()
                .Where(p => p.Name.ToUpper() != "SELF" && 
                            p.Name.ToUpper() != "SYSTEM_SELF" && 
                            p.Name.ToUpper() != "SELF WALK-IN" && 
                            p.Name.ToUpper() != "DIRECT")
                .ToListAsync();

            var partnerDict = partners.ToDictionary(p => p.ReferralPartnerId);

            // 2. Base visits query
            var baseVisitsQuery = _context.Visits
                .AsNoTracking()
                .Where(v => v.IsReferred && 
                            (v.ReferralPartnerId != null || v.SecondaryReferralPartnerId != null) &&
                            v.Status != VisitStatus.Cancelled &&
                            (v.Token == null || !v.Token.StartsWith("D-")));

            if (effectiveBranchId.HasValue && effectiveBranchId != Guid.Empty)
            {
                baseVisitsQuery = baseVisitsQuery.Where(v => v.BranchId == effectiveBranchId.Value);
            }

            // Current period visits
            var periodVisitsQuery = baseVisitsQuery;
            if (startUtc.HasValue) periodVisitsQuery = periodVisitsQuery.Where(v => v.CreatedAt >= startUtc.Value);
            if (endUtc.HasValue) periodVisitsQuery = periodVisitsQuery.Where(v => v.CreatedAt <= endUtc.Value);

            var periodVisits = await periodVisitsQuery
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.Invoices)
                .ToListAsync();

            var periodVisitIds = periodVisits.Select(v => v.VisitId).ToHashSet();

            // 3. Base ReferralPayableFacts query
            var basePayablesQuery = _context.ReferralPayableFacts
                .AsNoTracking();

            if (effectiveBranchId.HasValue && effectiveBranchId != Guid.Empty)
            {
                basePayablesQuery = from f in basePayablesQuery
                                    join v in _context.Visits on f.SourceVisitId equals v.VisitId
                                    where v.BranchId == effectiveBranchId.Value
                                    select f;
            }

            // Current period payables (accrued in window)
            var periodPayablesQuery = basePayablesQuery;
            if (startUtc.HasValue) periodPayablesQuery = periodPayablesQuery.Where(f => f.OccurredAt >= startUtc.Value);
            if (endUtc.HasValue) periodPayablesQuery = periodPayablesQuery.Where(f => f.OccurredAt <= endUtc.Value);

            var periodPayables = await periodPayablesQuery.ToListAsync();

            // Prior period payables for percentage delta
            decimal priorAccrued = 0m;
            if (priorStartUtc.HasValue && priorEndUtc.HasValue)
            {
                priorAccrued = await basePayablesQuery
                    .Where(f => f.OccurredAt >= priorStartUtc.Value && f.OccurredAt <= priorEndUtc.Value)
                    .SumAsync(f => (decimal?)f.Amount) ?? 0m;
            }

            // Current period settlements (disbursements actually paid in window)
            var periodSettlementsQuery = basePayablesQuery.Where(f => f.SettledAt != null);
            if (startUtc.HasValue) periodSettlementsQuery = periodSettlementsQuery.Where(f => f.SettledAt >= startUtc.Value);
            if (endUtc.HasValue) periodSettlementsQuery = periodSettlementsQuery.Where(f => f.SettledAt <= endUtc.Value);

            var periodSettlements = await periodSettlementsQuery.ToListAsync();

            // Total outstanding liability (across all historical unsettled payables)
            var outstandingPayables = await basePayablesQuery
                .Where(f => f.SettledAt == null)
                .ToListAsync();

            // 4. KPI Calculations
            var commissionAccrued = periodPayables.Sum(f => f.Amount);
            var commissionPaid = periodSettlements.Sum(f => f.AmountPaid);
            var pendingCommission = outstandingPayables.Sum(f => f.Amount - f.AmountPaid);

            decimal accruedDeltaPct = priorAccrued > 0 
                ? Math.Round(((commissionAccrued - priorAccrued) / priorAccrued) * 100m, 1) 
                : 0m;

            var distinctSettlementsCount = periodSettlements.Select(f => f.SettledAt).Distinct().Count();
            var settledPartnersCount = periodSettlements.Select(f => f.ReferralPartnerId).Distinct().Count();

            // Eligible Revenue: Net billed revenue of non-cancelled referred visits in this period
            decimal eligibleGrossRevenue = periodVisits
                .SelectMany(v => v.Orders)
                .Where(o => o.Status != OrderStatus.Cancelled)
                .Sum(o => o.Price);

            decimal eligibleConcessions = periodVisits
                .SelectMany(v => v.Orders)
                .Where(o => o.Status != OrderStatus.Cancelled)
                .Sum(o => o.Discount) + periodVisits.Sum(v => v.B2BDiscountAmount ?? 0m);

            decimal eligibleNetRevenue = Math.Max(0m, eligibleGrossRevenue - eligibleConcessions);

            decimal effectiveCommissionRate = eligibleNetRevenue > 0 
                ? Math.Round((commissionAccrued / eligibleNetRevenue) * 100m, 1) 
                : 0m;

            decimal pendingPctOfAccrued = commissionAccrued > 0 
                ? Math.Round((pendingCommission / commissionAccrued) * 100m, 1) 
                : 0m;

            // 5. Commission Trend: Last 7 Days (Accrued vs Paid)
            var istNow = _labTimeProvider.GetLabNow();
            var istZone = _labTimeProvider.GetLabTimeZone();
            var trendDays = new List<object>();

            for (int i = 6; i >= 0; i--)
            {
                var dayDate = istNow.Date.AddDays(-i);
                var dayStartIst = dayDate;
                var dayEndIst = dayDate.AddDays(1).AddTicks(-1);

                var dayStartUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(dayStartIst, DateTimeKind.Unspecified), istZone);
                var dayEndUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(dayEndIst, DateTimeKind.Unspecified), istZone);

                var dayAccrued = await basePayablesQuery
                    .Where(f => f.OccurredAt >= dayStartUtc && f.OccurredAt <= dayEndUtc)
                    .SumAsync(f => (decimal?)f.Amount) ?? 0m;

                var dayPaid = await basePayablesQuery
                    .Where(f => f.SettledAt >= dayStartUtc && f.SettledAt <= dayEndUtc)
                    .SumAsync(f => (decimal?)f.AmountPaid) ?? 0m;

                trendDays.Add(new
                {
                    date = dayDate.ToString("yyyy-MM-dd"),
                    label = dayDate.ToString("dd MMM"),
                    day = dayDate.ToString("ddd"),
                    accrued = Math.Round(dayAccrued, 2),
                    paid = Math.Round(dayPaid, 2)
                });
            }

            // 6. Referral Partner Performance Aggregation
            // Exact Rule: Primary partner retains volume attribution; secondary partner is commission recipient.
            var partnerVisitGroups = periodVisits
                .Where(v => v.ReferralPartnerId.HasValue)
                .GroupBy(v => v.ReferralPartnerId!.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var partnerPayableGroups = periodPayables
                .GroupBy(f => f.ReferralPartnerId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var partnerOutstandingDict = outstandingPayables
                .GroupBy(f => f.ReferralPartnerId)
                .ToDictionary(g => g.Key, g => g.Sum(f => f.Amount - f.AmountPaid));

            var partnerPaidDict = periodSettlements
                .GroupBy(f => f.ReferralPartnerId)
                .ToDictionary(g => g.Key, g => g.Sum(f => f.AmountPaid));

            // Query latest referral date for all partners
            var lastReferredDates = await _context.Visits
                .Where(v => v.IsReferred && (v.ReferralPartnerId.HasValue || v.SecondaryReferralPartnerId.HasValue))
                .GroupBy(v => v.ReferralPartnerId ?? v.SecondaryReferralPartnerId!.Value)
                .Select(g => new { PartnerId = g.Key, LastDate = g.Max(v => (DateTimeOffset?)v.CreatedAt) })
                .ToDictionaryAsync(x => x.PartnerId, x => x.LastDate);

            var partnerPerformanceList = partners.Select(p =>
            {
                partnerVisitGroups.TryGetValue(p.ReferralPartnerId, out var pVisits);
                pVisits ??= new List<Visit>();

                partnerPayableGroups.TryGetValue(p.ReferralPartnerId, out var pPayables);
                pPayables ??= new List<ReferralPayableFact>();

                partnerOutstandingDict.TryGetValue(p.ReferralPartnerId, out var pOutstanding);
                partnerPaidDict.TryGetValue(p.ReferralPartnerId, out var pPaid);
                lastReferredDates.TryGetValue(p.ReferralPartnerId, out var pLastDate);

                var pOrders = pVisits.SelectMany(v => v.Orders).Where(o => o.Status != OrderStatus.Cancelled).ToList();
                decimal pGross = pOrders.Sum(o => o.Price);
                decimal pConcessions = pOrders.Sum(o => o.Discount) + pVisits.Sum(v => v.B2BDiscountAmount ?? 0m);
                decimal pNet = Math.Max(0m, pGross - pConcessions);
                decimal pAccrued = pPayables.Sum(f => f.Amount);

                decimal concPct = pGross > 0 ? Math.Round((pConcessions / pGross) * 100m, 1) : 0m;
                decimal effRate = pNet > 0 ? Math.Round((pAccrued / pNet) * 100m, 1) : (p.DefaultCommissionPercentage > 0 ? p.DefaultCommissionPercentage : 0m);

                return new
                {
                    partnerId = p.ReferralPartnerId,
                    name = p.Name,
                    partnerType = p.PartnerType.ToString(),
                    clinicName = p.ClinicName ?? string.Empty,
                    location = p.Location ?? string.Empty,
                    referredPatients = pVisits.Select(v => v.PatientId).Distinct().Count(),
                    visits = pVisits.Count,
                    investigations = pOrders.Count,
                    grossTariff = Math.Round(pGross, 2),
                    concessions = Math.Round(pConcessions, 2),
                    concessionsPct = concPct,
                    netRevenue = Math.Round(pNet, 2),
                    commissionAccrued = Math.Round(pAccrued, 2),
                    commissionPaid = Math.Round(pPaid, 2),
                    outstanding = Math.Round(pOutstanding, 2),
                    effectiveRate = effRate,
                    lastReferralDate = pLastDate?.ToString("yyyy-MM-dd") ?? p.CreatedAt.ToString("yyyy-MM-dd")
                };
            })
            .Where(p => p.visits > 0 || p.commissionAccrued > 0 || p.outstanding > 0 || p.commissionPaid > 0)
            .OrderByDescending(p => p.commissionAccrued)
            .ThenByDescending(p => p.netRevenue)
            .ToList();

            // 7. Top 5 Referral Partners (by Commission)
            decimal totalTopAccrued = partnerPerformanceList.Sum(p => p.commissionAccrued);
            var topPartners = partnerPerformanceList
                .Take(5)
                .Select(p => new
                {
                    partnerId = p.partnerId,
                    name = p.name,
                    partnerType = p.partnerType,
                    netRevenue = p.netRevenue,
                    commission = p.commissionAccrued,
                    rate = p.effectiveRate,
                    share = totalTopAccrued > 0 ? Math.Round((p.commissionAccrued / totalTopAccrued) * 100m, 1) : 0m
                })
                .ToList();

            // 8. Commission by Investigation (Top 5 Tests)
            var topInvestigations = periodVisits
                .SelectMany(v => v.Orders.Where(o => o.Status != OrderStatus.Cancelled && o.Test != null))
                .GroupBy(o => new { o.TestId, o.Test.TestName, o.Test.TestCode })
                .Select(g =>
                {
                    decimal testGross = g.Sum(o => o.Price);
                    decimal testDisc = g.Sum(o => o.Discount);
                    decimal testNet = Math.Max(0m, testGross - testDisc);
                    int volume = g.Count();

                    // Estimate commission recognized for this investigation in period
                    decimal testComm = Math.Round(testNet * 0.15m, 2); // Default fallback estimate
                    return new
                    {
                        testId = g.Key.TestId,
                        testName = g.Key.TestName,
                        testCode = g.Key.TestCode,
                        volume = volume,
                        netRevenue = testNet,
                        commission = testComm,
                        rate = testNet > 0 ? Math.Round((testComm / testNet) * 100m, 1) : 15.0m
                    };
                })
                .OrderByDescending(t => t.volume)
                .Take(5)
                .ToList();

            // 9. Commission Calculation Base (Donut Distribution)
            // Group eligible revenue by partner's calculation base
            decimal afterDiscountNetRevenue = 0m;
            decimal beforeDiscountGrossRevenue = 0m;

            foreach (var visit in periodVisits)
            {
                var recipientId = visit.SecondaryReferralPartnerId ?? visit.ReferralPartnerId;
                if (recipientId.HasValue && partnerDict.TryGetValue(recipientId.Value, out var partner))
                {
                    var vGross = visit.Orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.Price);
                    var vNet = Math.Max(0m, vGross - (visit.Orders.Sum(o => o.Discount) + (visit.B2BDiscountAmount ?? 0m)));

                    if (partner.CalculationBase == CommissionCalculationBase.BeforeDiscounts)
                    {
                        beforeDiscountGrossRevenue += vGross;
                    }
                    else
                    {
                        afterDiscountNetRevenue += vNet;
                    }
                }
                else
                {
                    afterDiscountNetRevenue += visit.Orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.Price - o.Discount);
                }
            }

            decimal totalBaseRevenue = afterDiscountNetRevenue + beforeDiscountGrossRevenue;
            if (totalBaseRevenue == 0) totalBaseRevenue = eligibleNetRevenue;

            decimal afterDiscountPct = totalBaseRevenue > 0 ? Math.Round((afterDiscountNetRevenue / totalBaseRevenue) * 100m, 1) : 80.0m;
            decimal beforeDiscountPct = totalBaseRevenue > 0 ? Math.Round((beforeDiscountGrossRevenue / totalBaseRevenue) * 100m, 1) : 20.0m;

            var calculationBase = new
            {
                totalEligibleRevenue = totalBaseRevenue,
                afterDiscountAmount = afterDiscountNetRevenue,
                afterDiscountPct = afterDiscountPct,
                beforeDiscountAmount = beforeDiscountGrossRevenue,
                beforeDiscountPct = beforeDiscountPct,
                ruleNote = "Commission rules use: Net Revenue (After Discount)"
            };

            // 10. Recent Commission Activity Feed
            var recentActivity = new List<object>();

            // Recent settlements
            var recentSettledFacts = await basePayablesQuery
                .Where(f => f.SettledAt != null)
                .OrderByDescending(f => f.SettledAt)
                .Take(5)
                .ToListAsync();

            foreach (var f in recentSettledFacts)
            {
                partnerDict.TryGetValue(f.ReferralPartnerId, out var p);
                recentActivity.Add(new
                {
                    id = f.ReferralPayableFactId,
                    type = "Settled",
                    title = $"Commission Settled: {p?.Name ?? "Referral Partner"}",
                    subtitle = $"₹{f.AmountPaid:N0} • Settlement #{f.ReferralPayableFactId.ToString()[..8].ToUpper()}",
                    timestamp = f.SettledAt?.ToString("dd MMM, hh:mm tt") ?? "Recently",
                    icon = "shield-check"
                });
            }

            // Recent accruals
            var recentAccruedFacts = await basePayablesQuery
                .OrderByDescending(f => f.OccurredAt)
                .Take(5)
                .ToListAsync();

            foreach (var f in recentAccruedFacts)
            {
                partnerDict.TryGetValue(f.ReferralPartnerId, out var p);
                recentActivity.Add(new
                {
                    id = f.ReferralPayableFactId,
                    type = "Accrued",
                    title = $"Commission Accrued: {p?.Name ?? "Referral Partner"}",
                    subtitle = $"₹{f.Amount:N0} • Accrued on Visit",
                    timestamp = f.OccurredAt.ToString("dd MMM, hh:mm tt"),
                    icon = "layers"
                });
            }

            var sortedActivity = recentActivity.Take(6).ToList();

            return Ok(new
            {
                kpis = new
                {
                    commissionAccrued = Math.Round(commissionAccrued, 2),
                    accruedChangePct = accruedDeltaPct,
                    commissionPaid = Math.Round(commissionPaid, 2),
                    settlementCount = distinctSettlementsCount,
                    settledPartnerCount = settledPartnersCount,
                    pendingCommission = Math.Round(pendingCommission, 2),
                    pendingPctOfAccrued = pendingPctOfAccrued,
                    effectiveCommissionRate = effectiveCommissionRate,
                    eligibleRevenue = Math.Round(eligibleNetRevenue, 2),
                    eligibleVisitCount = periodVisits.Count
                },
                trend = trendDays,
                topPartners = topPartners,
                partners = partnerPerformanceList,
                topInvestigations = topInvestigations,
                calculationBase = calculationBase,
                recentActivity = sortedActivity
            });
        }

        [HttpGet("visits")]
        public async Task<IActionResult> GetVisits(
            [FromQuery] Guid? branchId = null,
            [FromQuery] Guid? partnerId = null,
            [FromQuery] string? preset = "this_month",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? search = null,
            [FromQuery] string? billStatus = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);

            var query = _context.Visits
                .AsNoTracking()
                .Include(v => v.Patient)
                .Include(v => v.ReferralPartner)
                .Include(v => v.SecondaryReferralPartner)
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.Payments)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Where(v => v.IsReferred && 
                            (v.ReferralPartnerId != null || v.SecondaryReferralPartnerId != null) &&
                            v.Status != VisitStatus.Cancelled &&
                            (v.Token == null || !v.Token.StartsWith("D-")));

            if (branchId.HasValue && branchId != Guid.Empty)
            {
                query = query.Where(v => v.BranchId == branchId.Value);
            }

            if (partnerId.HasValue && partnerId != Guid.Empty)
            {
                query = query.Where(v => v.ReferralPartnerId == partnerId.Value || v.SecondaryReferralPartnerId == partnerId.Value);
            }

            if (startUtc.HasValue) query = query.Where(v => v.CreatedAt >= startUtc.Value);
            if (endUtc.HasValue) query = query.Where(v => v.CreatedAt <= endUtc.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(v => 
                    (v.Token != null && v.Token.ToLower().Contains(s)) ||
                    (v.Patient != null && (v.Patient.FirstName + " " + v.Patient.LastName).ToLower().Contains(s)) ||
                    (v.ReferralPartner != null && v.ReferralPartner.Name.ToLower().Contains(s)) ||
                    (v.SecondaryReferralPartner != null && v.SecondaryReferralPartner.Name.ToLower().Contains(s)));
            }

            var totalCount = await query.CountAsync();
            var visits = await query
                .OrderByDescending(v => v.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var visitIds = visits.Select(v => v.VisitId).ToList();
            var payables = await _context.ReferralPayableFacts
                .AsNoTracking()
                .Where(f => visitIds.Contains(f.SourceVisitId))
                .ToListAsync();

            var payableDict = payables.ToDictionary(f => f.SourceVisitId);

            var items = visits.Select(v =>
            {
                var invoice = v.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                decimal gross = (invoice?.GrossAmount > 0 ? invoice.GrossAmount : invoice?.Total) ?? v.Orders.Sum(o => o.Price);
                decimal concession = (invoice?.DiscountAmount > 0 ? invoice.DiscountAmount : (v.B2BDiscountAmount ?? 0m));
                decimal net = (invoice?.NetAmount > 0 ? invoice.NetAmount : Math.Max(0m, gross - concession));

                var totalPaid = (invoice?.Payments?.Sum(p => p.Amount) ?? 0m);
                string paymentStatus = "Unpaid";
                if (totalPaid >= net && net > 0) paymentStatus = "Paid";
                else if (totalPaid > 0) paymentStatus = "PartialPayment";
                else if (v.PaymentCollectionModel == "PartnerCollects") paymentStatus = "B2B Credit";

                payableDict.TryGetValue(v.VisitId, out var payable);
                decimal commAccrued = payable?.Amount ?? 0m;
                string commStatus = payable == null ? "None" : (payable.SettledAt == null ? "Pending" : "Settled");

                // Exact Rule: Recipient is secondary if assigned; otherwise primary
                var recipient = v.SecondaryReferralPartner ?? v.ReferralPartner;

                return new
                {
                    visitId = v.VisitId,
                    token = v.Token,
                    visitDate = v.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                    patientName = v.Patient != null ? $"{v.Patient.FirstName} {v.Patient.LastName}".Trim() : "Patient",
                    patientMrn = v.Patient?.MRN ?? string.Empty,
                    primaryDoctorId = v.ReferralPartnerId,
                    primaryDoctorName = v.ReferralPartner?.Name ?? "None",
                    secondaryDoctorId = v.SecondaryReferralPartnerId,
                    secondaryDoctorName = v.SecondaryReferralPartner?.Name ?? "None",
                    commissionRecipientId = recipient?.ReferralPartnerId,
                    commissionRecipientName = recipient?.Name ?? "None",
                    billGross = gross,
                    concessions = concession,
                    billNet = net,
                    billPaymentStatus = paymentStatus,
                    commissionAccrued = commAccrued,
                    commissionStatus = commStatus,
                    testNames = v.Orders.Where(o => o.Status != OrderStatus.Cancelled && o.Test != null).Select(o => o.Test.TestName).ToList()
                };
            }).ToList();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }
    }
}
