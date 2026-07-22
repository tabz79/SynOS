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
        private readonly SynOS.Services.Security.IUserContext _userContext;

        public EconomicsController(IEconomicsIntelligenceService economicsService, SynOS.Services.Security.IUserContext userContext)
        {
            _economicsService = economicsService;
            _userContext = userContext;
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
        public async Task<IActionResult> GetProfitability([FromQuery] DateTime start, [FromQuery] DateTime end, [FromQuery] Guid? branchId, [FromQuery] bool isConsolidated = false)
        {
            if (start == default) start = DateTime.UtcNow.AddDays(-30);
            if (end == default) end = DateTime.UtcNow;

            Guid? effectiveBranchId = branchId ?? _userContext.CurrentBranchId;
            if (isConsolidated && (_userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin"))
            {
                effectiveBranchId = null;
            }

            var result = await _economicsService.GetLabProfitabilitySummaryAsync(start, end, effectiveBranchId);
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
        
        [HttpGet("settlement-history")]
        public async Task<IActionResult> GetSettlementHistory([FromQuery] string category)
        {
            var result = await _economicsService.GetSettlementHistoryAsync(category);
            return Ok(result);
        }

        [HttpGet("partner-receivables-summary")]
        public async Task<IActionResult> GetPartnerReceivablesSummary()
        {
            var result = await _economicsService.GetPartnerReceivablesSummaryAsync();
            return Ok(result);
        }

        [HttpGet("expense-facts")]
        public async Task<IActionResult> GetExpenseFacts([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (start == default) start = DateTime.UtcNow.AddDays(-30);
            if (end == default) end = DateTime.UtcNow;

            var result = await _economicsService.GetExpenseFactsAsync(start, end);
            return Ok(result);
        }

        [HttpGet("export-pnl")]
        public async Task<IActionResult> ExportProfitability([FromQuery] DateTime start, [FromQuery] DateTime end, [FromQuery] Guid? branchId, [FromServices] SynOS.Services.ICsvService csvService)
        {
            if (start == default) start = DateTime.UtcNow.AddDays(-30);
            if (end == default) end = DateTime.UtcNow;

            Guid? effectiveBranchId = branchId ?? _userContext.CurrentBranchId;
            var summary = await _economicsService.GetLabProfitabilitySummaryAsync(start, end, effectiveBranchId);
            
            var csvBytes = await csvService.ExportProfitabilityCsvAsync(summary);
            var fileName = $"SynOS_Profitability_Statement_{start:yyyyMMdd}_to_{end:yyyyMMdd}.csv";
            return File(csvBytes, "text/csv", fileName);
        }
    }
}
