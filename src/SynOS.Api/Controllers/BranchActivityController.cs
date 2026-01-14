using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.ReadModels;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/branch/activity")]
    public class BranchActivityController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public BranchActivityController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetBranchActivity([FromQuery] string branchId)
        {
            if (string.IsNullOrWhiteSpace(branchId))
            {
                return BadRequest("BranchId is required.");
            }

            // UTC Day Filtering (Strict Mode)
            var utcToday = DateTime.UtcNow.Date;
            var utcTomorrow = utcToday.AddDays(1);

            var events = await _context.BranchOperationalEvents
                .AsNoTracking()
                .Where(e => e.BranchId == branchId && e.OccurredAt >= utcToday && e.OccurredAt < utcTomorrow)
                .OrderByDescending(e => e.OccurredAt)
                .Take(50)
                .ToListAsync();

            return Ok(events);
        }
    }
}
