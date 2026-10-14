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
                    baseQuery = baseQuery.Where(r => r.DebtorType == DebtorType.Partner || r.ReferralPartnerId != null);
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

            var query = from r in baseQuery
                        join v in _context.Visits on r.SourceVisitId equals v.VisitId
                        join p in _context.Patients on v.PatientId equals p.PatientId
                        orderby r.OccurredAt descending
                        select new
                        {
                            receivableFactId = r.ReceivableFactId,
                            sourceVisitId = r.SourceVisitId,
                            debtorType = r.DebtorType.ToString(),
                            debtorId = r.DebtorId != Guid.Empty ? r.DebtorId : (r.ReferralPartnerId ?? Guid.Empty),
                            debtorName = !string.IsNullOrEmpty(r.DebtorName) 
                                ? r.DebtorName 
                                : (r.ReferralPartner != null ? r.ReferralPartner.Name : "Unknown Account"),
                            claimReference = r.ClaimReference,
                            referralPartnerId = r.ReferralPartnerId ?? (r.DebtorType == DebtorType.Partner ? r.DebtorId : (Guid?)null),
                            partnerName = !string.IsNullOrEmpty(r.DebtorName)
                                ? r.DebtorName
                                : (r.ReferralPartner != null ? r.ReferralPartner.Name : "Unknown Partner"),
                            amount = r.Amount,
                            amountReceived = r.AmountReceived,
                            pendingAmount = r.Amount - r.AmountReceived,
                            currency = r.Currency,
                            occurredAt = r.OccurredAt,
                            settledAt = r.SettledAt,
                            status = r.SettledAt.HasValue ? "Settled" : (r.AmountReceived > 0 ? "Partial" : "Pending"),
                            patientName = p.FirstName + " " + p.LastName,
                            token = v.Token
                        };

            var receivables = await query.ToListAsync();
            return Ok(receivables);
        }
    }
}
