using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.AR;
using SynOS.Models.Enums;
using SynOS.Services.Time;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.AR
{
    [ApiController]
    [Route("api/v1/receivables")]
    [Authorize]
    public class ReceivablesController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ILabTimeProvider _labTimeProvider;

        public ReceivablesController(SynOSDbContext context, ILabTimeProvider labTimeProvider)
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

        [HttpGet]
        public async Task<IActionResult> GetReceivables(
            [FromQuery] string? type = null,
            [FromQuery] Guid? branchId = null,
            [FromQuery] string? preset = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            // Auto-Healing: Ensure all active Prepaid/B2B visits have a corresponding ReceivableFact
            var missingVisits = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.ReferralPartner)
                .Include(v => v.SecondaryReferralPartner)
                .Include(v => v.ReferralDraft)
                .Where(v => v.Status != VisitStatus.Draft && 
                            v.Status != VisitStatus.Cancelled &&
                            (v.Token == null || !v.Token.StartsWith("D-")) &&
                            (v.PaymentCollectionModel == "PartnerCollects" || v.BillingType == BillingType.PrepaidPartner) &&
                            !_context.ReceivableFacts.Any(r => r.SourceVisitId == v.VisitId))
                .ToListAsync();

            if (missingVisits.Any())
            {
                foreach (var v in missingVisits)
                {
                    var inv = v.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                    if (inv == null) continue;

                    var effectivePartnerId = v.SecondaryReferralPartnerId ?? v.ReferralPartnerId;
                    var pName = v.SecondaryReferralPartner?.Name ?? v.ReferralPartner?.Name ?? v.ReferralDraft?.ClinicName ?? v.ReferralDraft?.ProviderName ?? v.ReferrerText ?? "Referral Partner";
                    var debtorId = effectivePartnerId ?? (v.ReferralDraft?.ReferralDraftId ?? Guid.NewGuid());

                    decimal gross = inv.GrossAmount > 0 ? inv.GrossAmount : inv.Total;
                    decimal disc = (v.B2BDiscountAmount.HasValue && v.B2BDiscountAmount.Value > 0) ? v.B2BDiscountAmount.Value : inv.DiscountAmount;
                    decimal netB2B = Math.Max(0m, gross - disc);

                    var newFact = new ReceivableFact
                    {
                        ReceivableFactId = Guid.NewGuid(),
                        SourceVisitId = v.VisitId,
                        DebtorType = DebtorType.Partner,
                        DebtorId = debtorId,
                        DebtorName = pName,
                        ClaimReference = $"Prepaid Partner Bill: {pName}",
                        ReferralPartnerId = effectivePartnerId,
                        Amount = netB2B,
                        Currency = inv.Currency ?? "INR",
                        OccurredAt = v.CreatedAt,
                        RecordedAt = DateTimeOffset.UtcNow
                    };
                    _context.ReceivableFacts.Add(newFact);

                    // Clean up any stray counter payments (like mistaken Cash payments) on this prepaid visit
                    var strayCounterPayments = inv.Payments.Where(p => 
                        p.Method != "PartnerAccount" && 
                        (p.ReceiptNo == null || (!p.ReceiptNo.StartsWith("RCP-B2B") && !p.ReceiptNo.StartsWith("REC-B2B")))).ToList();
                    if (strayCounterPayments.Any())
                    {
                        _context.Payments.RemoveRange(strayCounterPayments);
                    }

                    if (!inv.Payments.Any(p => p.Method == "PartnerAccount"))
                    {
                        _context.Payments.Add(new Payment
                        {
                            PaymentId = Guid.NewGuid(),
                            InvoiceId = inv.InvoiceId,
                            Amount = inv.Total,
                            Method = "PartnerAccount",
                            ReceiptNo = $"SYS-{v.Token}",
                            ReceivedAt = DateTime.UtcNow,
                            ReceivedByUserId = v.CreatedByUserId ?? Guid.Empty
                        });
                    }
                }
                await _context.SaveChangesAsync();
            }

            var baseQuery = _context.ReceivableFacts.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(type))
            {
                var lowerType = type.Trim().ToLowerInvariant();
                if (lowerType == "partner")
                {
                    baseQuery = baseQuery.Where(r => r.DebtorType == DebtorType.Partner);
                }
                else if (lowerType == "insurance")
                {
                    baseQuery = baseQuery.Where(r => r.DebtorType == DebtorType.Insurance);
                }
                else if (lowerType == "corporate")
                {
                    baseQuery = baseQuery.Where(r => r.DebtorType == DebtorType.Corporate);
                }
            }

            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);
            if (startUtc.HasValue)
            {
                baseQuery = baseQuery.Where(r => r.OccurredAt >= startUtc.Value);
            }
            if (endUtc.HasValue)
            {
                baseQuery = baseQuery.Where(r => r.OccurredAt <= endUtc.Value);
            }

            var raw = await (from r in baseQuery
                             join v in _context.Visits on r.SourceVisitId equals v.VisitId
                             join p in _context.Patients on v.PatientId equals p.PatientId
                             where v.Status != VisitStatus.Draft && 
                                   (v.Token == null || !v.Token.StartsWith("D-")) &&
                                   (!branchId.HasValue || branchId == Guid.Empty || v.BranchId == branchId.Value)
                             orderby r.OccurredAt descending
                             select new
                             {
                                 r.ReceivableFactId,
                                 r.SourceVisitId,
                                 DebtorType = r.DebtorType.ToString(),
                                 r.DebtorId,
                                 r.DebtorName,
                                 r.ClaimReference,
                                 r.ReferralPartnerId,
                                 PrimaryPartnerId = v.ReferralPartnerId,
                                 PrimaryPartnerName = v.ReferralPartner != null ? v.ReferralPartner.Name : null,
                                 SecondaryPartnerId = v.SecondaryReferralPartnerId,
                                 SecondaryPartnerName = v.SecondaryReferralPartner != null ? v.SecondaryReferralPartner.Name : null,
                                 PartnerName = v.ReferralPartner != null ? v.ReferralPartner.Name : (r.DebtorType == DebtorType.Partner ? r.DebtorName : ""),
                                 CorporateName = v.CorporateAccount != null ? v.CorporateAccount.CompanyName : (r.DebtorType == DebtorType.Corporate ? r.DebtorName : ""),
                                 InsuranceName = v.InsuranceCompany != null ? v.InsuranceCompany.Name : (r.DebtorType == DebtorType.Insurance ? r.DebtorName : ""),
                                 r.Amount,
                                 r.AmountReceived,
                                 r.Currency,
                                 r.OccurredAt,
                                 r.SettledAt,
                                 PatientName = (p.FirstName + " " + p.LastName).Trim(),
                                 PatientMrn = p.MRN,
                                 Token = v.Token,
                                 PaymentCollectionModel = v.PaymentCollectionModel,
                                 B2BDiscountAmount = v.B2BDiscountAmount,
                                 InvoiceGrossAmount = v.Invoices.OrderByDescending(i => i.CreatedAt).Select(i => (decimal?)i.GrossAmount).FirstOrDefault(),
                                 InvoiceDiscountAmount = v.Invoices.OrderByDescending(i => i.CreatedAt).Select(i => (decimal?)i.DiscountAmount).FirstOrDefault(),
                                 InvoiceTotal = v.Invoices.OrderByDescending(i => i.CreatedAt).Select(i => (decimal?)i.Total).FirstOrDefault(),
                                 InvoiceId = v.Invoices.OrderByDescending(i => i.CreatedAt).Select(i => (Guid?)i.InvoiceId).FirstOrDefault(),
                                 SettlementReceiptNo = v.Invoices.SelectMany(i => i.Payments).OrderByDescending(pay => pay.ReceivedAt).Select(pay => pay.ReceiptNo).FirstOrDefault(),
                                 SettlementMethod = v.Invoices.SelectMany(i => i.Payments).OrderByDescending(pay => pay.ReceivedAt).Select(pay => pay.Method).FirstOrDefault(),
                                 PaymentReceivedAt = v.Invoices.SelectMany(i => i.Payments).OrderByDescending(pay => pay.ReceivedAt).Select(pay => (DateTime?)pay.ReceivedAt).FirstOrDefault(),
                                 TestNames = v.Orders.Where(o => o.Status != OrderStatus.Cancelled).Select(o => o.Test.TestName).ToList()
                             }).ToListAsync();

            // Self-Healing AR Subledger: heal any drifted ReceivableFacts asynchronously
            var driftedFactIds = raw
                .Where(x => (x.PaymentCollectionModel == "PartnerCollects" || x.DebtorType == "Partner") &&
                            !x.SettledAt.HasValue &&
                            x.AmountReceived == 0 &&
                            Math.Abs(x.Amount - Math.Max(0m, ((x.InvoiceGrossAmount.HasValue && x.InvoiceGrossAmount.Value > 0 ? x.InvoiceGrossAmount.Value : (x.InvoiceTotal ?? x.Amount)) - ((x.B2BDiscountAmount.HasValue && x.B2BDiscountAmount.Value > 0) ? x.B2BDiscountAmount.Value : (x.InvoiceDiscountAmount ?? 0m))))) > 0.001m)
                .Select(x => x.ReceivableFactId)
                .ToList();

            if (driftedFactIds.Any())
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = HttpContext.RequestServices.CreateScope();
                        var db = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                        var factsToHeal = await db.ReceivableFacts.Where(f => driftedFactIds.Contains(f.ReceivableFactId)).ToListAsync();
                        foreach (var f in factsToHeal)
                        {
                            var visit = await db.Visits.Include(v => v.Invoices).FirstOrDefaultAsync(v => v.VisitId == f.SourceVisitId);
                            if (visit != null)
                            {
                                var inv = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                                decimal g = (inv?.GrossAmount > 0 ? inv.GrossAmount : inv?.Total) ?? f.Amount;
                                decimal disc = (visit.B2BDiscountAmount.HasValue && visit.B2BDiscountAmount.Value > 0)
                                    ? visit.B2BDiscountAmount.Value
                                    : (inv?.DiscountAmount ?? 0m);
                                f.Amount = Math.Max(0m, g - disc);
                                f.DebtorType = DebtorType.Partner;
                                var pId = visit.SecondaryReferralPartnerId ?? visit.ReferralPartnerId;
                                if (pId.HasValue)
                                {
                                    f.DebtorId = pId.Value;
                                    f.ReferralPartnerId = pId.Value;
                                    var pName = await db.ReferralPartners.Where(rp => rp.ReferralPartnerId == pId.Value).Select(rp => rp.Name).FirstOrDefaultAsync();
                                    if (!string.IsNullOrEmpty(pName)) f.DebtorName = pName;
                                }
                            }
                        }
                        await db.SaveChangesAsync();
                    }
                    catch { /* non-fatal background self-healing */ }
                });
            }

            var receivables = raw.Select(x =>
            {
                var testList = x.TestNames.Where(t => !string.IsNullOrEmpty(t)).ToList();
                var testsSummary = string.Join(", ", testList);

                // Canonical B2B Contracted Tariff Resolution: Net Due = Gross - Concession
                var isPartnerReceivable = x.PaymentCollectionModel == "PartnerCollects" || x.DebtorType == "Partner";
                var effectiveGross = (x.InvoiceGrossAmount.HasValue && x.InvoiceGrossAmount.Value > 0) ? x.InvoiceGrossAmount.Value : (x.InvoiceTotal ?? x.Amount);
                var effectiveConcession = (x.B2BDiscountAmount.HasValue && x.B2BDiscountAmount.Value > 0)
                    ? x.B2BDiscountAmount.Value
                    : (x.InvoiceDiscountAmount ?? 0m);
                var canonicalContractedAmount = isPartnerReceivable ? Math.Max(0m, effectiveGross - effectiveConcession) : x.Amount;
                var effectiveAmount = (isPartnerReceivable && !x.SettledAt.HasValue && x.AmountReceived == 0) ? canonicalContractedAmount : x.Amount;

                var pending = effectiveAmount - x.AmountReceived;
                var isSettled = x.SettledAt.HasValue || pending <= 0.0001m;
                var effectiveSettledAt = x.SettledAt ?? (isSettled ? x.PaymentReceivedAt : null);
                var status = isSettled ? "Settled" : (x.AmountReceived > 0 ? "Partial" : "Pending");

                // Secondary Referral overrides primary doctor for financial attribution (Receivables & Payouts)
                var effectivePartnerId = x.SecondaryPartnerId ?? x.PrimaryPartnerId ?? x.ReferralPartnerId ?? (x.DebtorId != Guid.Empty ? x.DebtorId : (Guid?)null);
                var effectivePartnerName = x.SecondaryPartnerName 
                    ?? x.PrimaryPartnerName 
                    ?? (!string.IsNullOrEmpty(x.PartnerName) ? x.PartnerName : (!string.IsNullOrEmpty(x.DebtorName) ? x.DebtorName : "Unknown Partner"));

                var isPartnerDebtor = x.DebtorType == "Partner";
                var resolvedDebtorId = isPartnerDebtor && effectivePartnerId.HasValue ? effectivePartnerId.Value : (x.DebtorId != Guid.Empty ? x.DebtorId : (effectivePartnerId ?? Guid.Empty));
                var resolvedDebtorName = isPartnerDebtor ? effectivePartnerName : (!string.IsNullOrEmpty(x.DebtorName) ? x.DebtorName : effectivePartnerName);
                var hasReferralChain = x.SecondaryPartnerId.HasValue && x.PrimaryPartnerId.HasValue;

                var cleanToken = !string.IsNullOrEmpty(x.Token) ? System.Text.RegularExpressions.Regex.Replace(x.Token, "[^a-zA-Z0-9]", "").ToUpper() : "MAI000";
                var canonicalBillNo = $"{cleanToken}-{x.OccurredAt:yyMMdd}";

                return new
                {
                    receivableFactId = x.ReceivableFactId,
                    sourceVisitId = x.SourceVisitId,
                    billNumber = canonicalBillNo,
                    canonicalBillNo = canonicalBillNo,
                    debtorType = x.DebtorType,
                    debtorId = resolvedDebtorId,
                    debtorName = resolvedDebtorName,
                    claimReference = x.ClaimReference,
                    referralPartnerId = effectivePartnerId,
                    partnerName = effectivePartnerName,
                    primaryDoctorId = x.PrimaryPartnerId,
                    primaryDoctorName = x.PrimaryPartnerName,
                    secondaryDoctorId = x.SecondaryPartnerId,
                    secondaryDoctorName = x.SecondaryPartnerName,
                    hasReferralChain = hasReferralChain,
                    corporateName = x.CorporateName,
                    insuranceName = x.InsuranceName,
                    amount = effectiveAmount,
                    totalAmount = effectiveAmount,
                    amountReceived = x.AmountReceived,
                    paidAmount = x.AmountReceived,
                    pendingAmount = pending,
                    balanceDue = pending,
                    currency = x.Currency,
                    occurredAt = x.OccurredAt,
                    settledAt = effectiveSettledAt,
                    settlementReceiptNo = x.SettlementReceiptNo,
                    settlementMethod = x.SettlementMethod,
                    isSettled = isSettled,
                    status = status,
                    patientName = x.PatientName,
                    patientMrn = x.PatientMrn,
                    token = x.Token,
                    visitToken = x.Token,
                    invoiceNumber = x.InvoiceId.HasValue ? $"INV-{x.InvoiceId.Value.ToString().Substring(0, 8).ToUpper()}" : x.Token,
                    tests = testList,
                    testNames = testList,
                    testsSummary = testsSummary
                };
            }).ToList();

            return Ok(receivables);
        }
    }
}
