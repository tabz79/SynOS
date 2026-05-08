using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SynOS.Services.EconomicsIntelligence;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/economics")]
    [Authorize]
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

        [HttpGet("revenue-facts")]
        public async Task<IActionResult> GetRevenueFacts([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (start == default) start = DateTime.UtcNow.AddDays(-30);
            if (end == default) end = DateTime.UtcNow;

            var result = await _economicsService.GetRevenueFactsAsync(start, end);
            return Ok(result);
        }

        [HttpGet("profitability")]
        public async Task<IActionResult> GetProfitability([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (start == default) start = DateTime.UtcNow.AddDays(-30);
            if (end == default) end = DateTime.UtcNow;

            var result = await _economicsService.GetLabProfitabilitySummaryAsync(start, end);
            return Ok(result);
        }

        [HttpGet("referral-payables")]
        public async Task<IActionResult> GetReferralPayables()
        {
            var result = await _economicsService.GetReferralPayablesAsync();
            return Ok(result);
        }

        [HttpGet("trends")]
        public async Task<IActionResult> GetTrends([FromQuery] int days = 30)
        {
            var result = await _economicsService.GetRevenueTrendsAsync(days);
            return Ok(result);
        }

        [HttpGet("partner-receivables-summary")]
        public async Task<IActionResult> GetPartnerReceivablesSummary()
        {
            var result = await _economicsService.GetPartnerReceivablesSummaryAsync();
            return Ok(result);
        }
    }
}
