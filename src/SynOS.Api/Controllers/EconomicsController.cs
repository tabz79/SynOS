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
        public async Task<IActionResult> GetProfitability([FromQuery] DateTime? start = null, [FromQuery] DateTime? end = null, [FromQuery] Guid? branchId = null, [FromQuery] bool isConsolidated = false, [FromQuery] string? preset = null)
        {
            var now = DateTime.UtcNow;
            DateTime startDate = start ?? default;
            DateTime endDate = end ?? default;

            if (!string.IsNullOrEmpty(preset))
            {
                var p = preset.ToLower();
                if (p == "today")
                {
                    startDate = now.Date;
                    endDate = now.Date.AddDays(1).AddTicks(-1);
                }
                else if (p == "mtd" || p == "month")
                {
                    startDate = new DateTime(now.Year, now.Month, 1);
                    endDate = now;
                }
                else if (p == "q3" || p == "quarter")
                {
                    var quarter = (now.Month - 1) / 3 + 1;
                    var qStartMonth = (quarter - 1) * 3 + 1;
                    startDate = new DateTime(now.Year, qStartMonth, 1);
                    endDate = now;
                }
                else if (p == "fy" || p == "year")
                {
                    var fyStartYear = now.Month >= 4 ? now.Year : now.Year - 1;
                    startDate = new DateTime(fyStartYear, 4, 1);
                    endDate = now;
                }
            }

            if (startDate == default) startDate = DateTime.UtcNow.AddDays(-30);
            if (endDate == default) endDate = DateTime.UtcNow;

            Guid? effectiveBranchId = isConsolidated ? null : (branchId ?? _userContext.CurrentBranchId);
            var result = await _economicsService.GetLabProfitabilitySummaryAsync(startDate, endDate, effectiveBranchId);
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
        public async Task<IActionResult> GetExpenseFacts([FromQuery] DateTime? start = null, [FromQuery] DateTime? end = null)
        {
            DateTime startDate = start ?? DateTime.UtcNow.AddDays(-30);
            DateTime endDate = end ?? DateTime.UtcNow;

            var result = await _economicsService.GetExpenseFactsAsync(startDate, endDate);
            return Ok(result);
        }

        [HttpGet("export-pnl")]
        public async Task<IActionResult> ExportProfitability([FromQuery] DateTime? start = null, [FromQuery] DateTime? end = null, [FromQuery] Guid? branchId = null, [FromQuery] bool isConsolidated = false, [FromQuery] string? preset = null, [FromServices] SynOS.Services.ICsvService csvService = null!)
        {
            var now = DateTime.UtcNow;
            DateTime startDate = start ?? default;
            DateTime endDate = end ?? default;

            if (!string.IsNullOrEmpty(preset))
            {
                var p = preset.ToLower();
                if (p == "today")
                {
                    startDate = now.Date;
                    endDate = now.Date.AddDays(1).AddTicks(-1);
                }
                else if (p == "mtd" || p == "month")
                {
                    startDate = new DateTime(now.Year, now.Month, 1);
                    endDate = now;
                }
                else if (p == "q3" || p == "quarter")
                {
                    var quarter = (now.Month - 1) / 3 + 1;
                    var qStartMonth = (quarter - 1) * 3 + 1;
                    startDate = new DateTime(now.Year, qStartMonth, 1);
                    endDate = now;
                }
                else if (p == "fy" || p == "year")
                {
                    var fyStartYear = now.Month >= 4 ? now.Year : now.Year - 1;
                    startDate = new DateTime(fyStartYear, 4, 1);
                    endDate = now;
                }
            }

            if (startDate == default) startDate = DateTime.UtcNow.AddDays(-30);
            if (endDate == default) endDate = DateTime.UtcNow;

            Guid? effectiveBranchId = isConsolidated ? null : (branchId ?? _userContext.CurrentBranchId);
            var summary = await _economicsService.GetLabProfitabilitySummaryAsync(startDate, endDate, effectiveBranchId);
            
            var csvBytes = await csvService.ExportProfitabilityCsvAsync(summary);
            var fileName = $"SynOS_Profitability_Statement_{startDate:yyyyMMdd}_to_{endDate:yyyyMMdd}.csv";
            return File(csvBytes, "text/csv", fileName);
        }
    }
}
