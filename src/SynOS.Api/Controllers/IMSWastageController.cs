using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.IMS;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/ims/wastage")]
    [Authorize(Roles = "Admin,StoreManager")]
    public class IMSWastageController : ControllerBase
    {
        private readonly IIMSWastageInsightService _insightService;

        public IMSWastageController(IIMSWastageInsightService insightService)
        {
            _insightService = insightService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetWastageSummary()
        {
            var expiry = await _insightService.GetExpiryLossAsync();
            var operational = await _insightService.GetOperationalWastageAsync();
            var calibration = await _insightService.GetCalibrationCostAsync();
            var unexplained = await _insightService.GetUnexplainedLossAsync();

            var allMovements = expiry.Concat(operational).Concat(calibration).Concat(unexplained);

            var summary = allMovements
                .GroupBy(m => new { m.MovementType, m.ConsumableId, m.ConsumableCategory, m.ConsumableName })
                .Select(g => new WastageSummaryDto
                {
                    MovementType = g.Key.MovementType,
                    ConsumableId = g.Key.ConsumableId,
                    ConsumableName = g.Key.ConsumableName,
                    ConsumableCategory = g.Key.ConsumableCategory,
                    TotalQuantity = g.Sum(m => m.Quantity),
                    TotalCost = g.Sum(m => m.Quantity * (m.CostPerUnit ?? 0))
                })
                .OrderBy(s => s.MovementType)
                .ThenBy(s => s.ConsumableCategory)
                .ThenBy(s => s.ConsumableName)
                .ToList();

            return Ok(summary);
        }
    }
}
