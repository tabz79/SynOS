using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Enums.Payables;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/finance/outsourced-payables")]
    public class FinancePayablesController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public FinancePayablesController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetOutsourcedPayables()
        {
            var payables = await _context.ReferenceLabPayables
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(new { data = payables });
        }

        [HttpPost("{id}/settle")]
        public async Task<IActionResult> SettlePayable(Guid id, [FromBody] SettlePayableRequest request)
        {
            var payable = await _context.ReferenceLabPayables.FindAsync(id);
            if (payable == null) return NotFound();

            payable.AmountPaid += request.Amount;
            if (payable.AmountPaid >= payable.AmountDue)
            {
                payable.Status = ReferencePayableStatus.Settled;
                payable.SettledAt = DateTime.UtcNow;
            }
            else
            {
                payable.Status = ReferencePayableStatus.PartiallyPaid;
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }

    public class SettlePayableRequest
    {
        public decimal Amount { get; set; }
    }
}
