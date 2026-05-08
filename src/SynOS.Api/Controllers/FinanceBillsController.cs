using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/finance/bills")]
    public class FinanceBillsController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public FinanceBillsController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetFinanceBills()
        {
            // Fetch invoices for non-walk-in patients or partner-linked accounts
            var bills = await _context.Invoices
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.Patient)
                .Include(i => i.Payments)
                .Where(i => i.Visit!.ReferralPartnerId != null || i.Visit.PaymentCollectionModel == "Insurance" || i.Visit.PaymentCollectionModel == "Corporate")
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new
                {
                    BillId = i.InvoiceId,
                    BillNumber = $"BILL-{i.CreatedAt:yyyyMMdd}-{i.InvoiceId.ToString().Substring(0, 4).ToUpper()}",
                    PatientName = i.Visit!.Patient!.FirstName + " " + i.Visit!.Patient!.LastName,
                    TotalAmount = i.Total,
                    CollectedAmount = i.Payments.Sum(p => p.Amount),
                    PendingAmount = i.Total - i.Payments.Sum(p => p.Amount),
                    Status = i.Status,
                    Date = i.CreatedAt,
                    PartnerName = i.Visit.ReferralPartner != null ? i.Visit.ReferralPartner.Name : "Direct Institutional"
                })
                .ToListAsync();

            return Ok(bills);
        }
    }
}
