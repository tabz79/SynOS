using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/ims/stock")]
    [Authorize(Roles = "Admin,LabTech,StoreManager")]
    public class IMSStockReadController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ITubeConsumptionService _tubeConsumptionService;

        public IMSStockReadController(SynOSDbContext context, ITubeConsumptionService tubeConsumptionService)
        {
            _context = context;
            _tubeConsumptionService = tubeConsumptionService;
        }

        [HttpGet("lots")]
        public async Task<IActionResult> GetStockLots([FromQuery] Guid? branchId)
        {
            var query = _context.ImsTubeLots.AsQueryable();

            if (branchId.HasValue)
            {
                query = query.Where(lot => lot.BranchId == branchId.Value);
            }

            var lots = await query
                .Include(lot => lot.Tube)
                .Include(lot => lot.Branch)
                .Select(lot => new LotSummaryDto
                {
                    LotId = lot.LotId,
                    TubeId = lot.TubeId,
                    TubeName = lot.Tube.Name,
                    BranchId = lot.BranchId,
                    BranchName = lot.Branch.Name,
                    LotNumber = lot.LotNumber,
                    ExpiryDate = lot.ExpiryDate,
                    CurrentQuantity = lot.CurrentQuantity,
                    ReceivedAt = lot.ReceivedAt,
                    IsActive = lot.IsActive
                })
                .OrderBy(dto => dto.ExpiryDate)
                .ToListAsync();
                
            return Ok(lots);
        }

        [HttpGet("expiry-alerts")]
        public async Task<IActionResult> GetNearExpiryAlerts([FromQuery] Guid? branchId, [FromQuery] int days = 14)
        {
            var alerts = await _tubeConsumptionService.GetNearExpiryAlertsAsync(branchId, days);
            return Ok(alerts);
        }
    }
}
