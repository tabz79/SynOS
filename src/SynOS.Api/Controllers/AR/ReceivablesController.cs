using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
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
                                 InvoiceId = v.Invoices.OrderByDescending(i => i.CreatedAt).Select(i => (Guid?)i.InvoiceId).FirstOrDefault(),
                                 SettlementReceiptNo = v.Invoices.SelectMany(i => i.Payments).OrderByDescending(pay => pay.ReceivedAt).Select(pay => pay.ReceiptNo).FirstOrDefault(),
                                 SettlementMethod = v.Invoices.SelectMany(i => i.Payments).OrderByDescending(pay => pay.ReceivedAt).Select(pay => pay.Method).FirstOrDefault(),
                                 PaymentReceivedAt = v.Invoices.SelectMany(i => i.Payments).OrderByDescending(pay => pay.ReceivedAt).Select(pay => (DateTime?)pay.ReceivedAt).FirstOrDefault(),
                                 TestNames = v.Orders.Where(o => o.Status != OrderStatus.Cancelled).Select(o => o.Test.TestName).ToList()
                             }).ToListAsync();

            var receivables = raw.Select(x =>
            {
                var testList = x.TestNames.Where(t => !string.IsNullOrEmpty(t)).ToList();
                var testsSummary = string.Join(", ", testList);
                var pending = x.Amount - x.AmountReceived;
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
                    amount = x.Amount,
                    totalAmount = x.Amount,
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
