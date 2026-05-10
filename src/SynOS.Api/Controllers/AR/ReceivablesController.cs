using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
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
        public async Task<IActionResult> GetReceivables()
        {
            var query = from r in _context.ReceivableFacts
                        join v in _context.Visits on r.SourceVisitId equals v.VisitId
                        join p in _context.Patients on v.PatientId equals p.PatientId
                        orderby r.OccurredAt descending
                        select new
                        {
                            receivableFactId = r.ReceivableFactId,
                            sourceVisitId = r.SourceVisitId,
                            partnerName = r.ReferralPartner != null ? r.ReferralPartner.Name : "Unknown Partner",
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
