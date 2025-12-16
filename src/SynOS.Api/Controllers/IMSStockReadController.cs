using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/ims/stock")]
    [Authorize(Roles = "Admin,LabTech,StoreManager")] // As per prompt
    public class IMSStockReadController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public IMSStockReadController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetStockSummary()
        {
            var stockItems = await _context.ImsTubeStocks
                .Include(s => s.Tube)
                .Select(s => new StockItemDto
                {
                    TubeId = s.TubeId,
                    TubeCode = s.Tube.Code,
                    TubeName = s.Tube.Name,
                    CurrentQuantity = s.CurrentQuantity,
                    AlertQuantity = s.AlertQuantity,
                    IsBelowAlertThreshold = s.CurrentQuantity < s.AlertQuantity
                })
                .ToListAsync();

            var summary = new StockSummaryDto
            {
                // BranchId is implicitly single branch
                StockItems = stockItems
            };

            return Ok(summary);
        }

        [HttpGet("low-alerts")]
        public async Task<IActionResult> GetLowStockAlerts()
        {
            var query = _context.ImsTubeStocks
                .Where(s => s.CurrentQuantity < s.AlertQuantity);

            var alerts = await query
                .Include(s => s.Tube)
                .Select(s => new LowStockAlertDto
                {
                    TubeId = s.TubeId,
                    TubeCode = s.Tube.Code,
                    TubeName = s.Tube.Name,
                    // BranchId is implicitly single branch
                    CurrentQuantity = s.CurrentQuantity,
                    AlertQuantity = s.AlertQuantity
                })
                .ToListAsync();

            return Ok(alerts);
        }
    }
}