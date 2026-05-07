using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payables;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class PayablesController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public PayablesController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<VendorPayable>>> GetPayables()
        {
            return await _context.VendorPayables
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        [HttpPatch("{id}/mark-paid")]
        public async Task<IActionResult> MarkAsPaid(Guid id)
        {
            var payable = await _context.VendorPayables.FindAsync(id);
            if (payable == null)
            {
                return NotFound();
            }

            payable.Status = "Paid";
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
