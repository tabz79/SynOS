using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Enums;
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

        public ReceivablesController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetReceivables([FromQuery] string? type = null)
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

            var raw = await (from r in baseQuery
                             join v in _context.Visits on r.SourceVisitId equals v.VisitId
                             join p in _context.Patients on v.PatientId equals p.PatientId
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
                                 TestNames = v.Orders.Where(o => o.Status != OrderStatus.Cancelled).Select(o => o.Test.TestName).ToList()
                             }).ToListAsync();

            var receivables = raw.Select(x =>
            {
                var testList = x.TestNames.Where(t => !string.IsNullOrEmpty(t)).ToList();
                var testsSummary = string.Join(", ", testList);
                var pending = x.Amount - x.AmountReceived;
                var status = x.SettledAt.HasValue ? "Settled" : (x.AmountReceived > 0 ? "Partial" : "Pending");

                return new
                {
                    receivableFactId = x.ReceivableFactId,
                    sourceVisitId = x.SourceVisitId,
                    debtorType = x.DebtorType,
                    debtorId = x.DebtorId != Guid.Empty ? x.DebtorId : (x.ReferralPartnerId ?? Guid.Empty),
                    debtorName = !string.IsNullOrEmpty(x.DebtorName) ? x.DebtorName : (x.PartnerName != "" ? x.PartnerName : "Unknown Account"),
                    claimReference = x.ClaimReference,
                    referralPartnerId = x.ReferralPartnerId,
                    partnerName = !string.IsNullOrEmpty(x.PartnerName) ? x.PartnerName : (x.DebtorType == "Partner" ? x.DebtorName : "Direct / Walk-in"),
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
                    settledAt = x.SettledAt,
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
