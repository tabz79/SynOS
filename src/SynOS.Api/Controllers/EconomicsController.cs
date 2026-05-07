using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.EconomicsIntelligence;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/economics")]
    public class EconomicsController : ControllerBase
    {
        private readonly IEconomicsIntelligenceService _economicsService;

        public EconomicsController(IEconomicsIntelligenceService economicsService)
        {
            _economicsService = economicsService;
        }

        [HttpGet("cost/{eventId}")]
        public async Task<IActionResult> GetCost(Guid eventId)
        {
            var result = await _economicsService.GetCostForEventAsync(eventId);
            return Ok(result);
        }
    }
}
