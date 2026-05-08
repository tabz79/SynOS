using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.AR;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class ReceivablesController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public ReceivablesController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetReceivables()
        {
            // Join with ReferralPartner to get names for the UI
            var receivables = await (from r in _context.ReceivableFacts
                                     join p in _context.ReferralPartners on r.ReferralPartnerId equals p.ReferralPartnerId
                                     select new
                                     {
                                         r.ReceivableFactId,
                                         r.SourceVisitId,
                                         PartnerName = p.Name,
                                         r.Amount,
                                         r.AmountReceived,
                                         PendingAmount = r.Amount - r.AmountReceived,
                                         r.Currency,
                                         r.OccurredAt,
                                         r.SettledAt,
                                         Status = r.SettledAt.HasValue ? "Settled" : (r.AmountReceived > 0 ? "Partial" : "Pending")
                                     })
                                     .OrderByDescending(r => r.OccurredAt)
                                     .ToListAsync();

            return Ok(receivables);
        }
    }
}
