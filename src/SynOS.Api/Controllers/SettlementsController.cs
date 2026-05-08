using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.Settlements;
using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Revenue;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/settlements")]
    [Authorize]
    public class SettlementsController : ControllerBase
    {
        private readonly ISettlementService _settlementService;

        public SettlementsController(ISettlementService settlementService)
        {
            _settlementService = settlementService ?? throw new ArgumentNullException(nameof(settlementService));
        }

        [HttpPost("referral-payable/{id}/settle")]
        public async Task<IActionResult> SettleReferralPayable(Guid id, [FromBody] SettleRequestDto request)
        {
            await _settlementService.SettleReferralPayableAsync(id, request.Amount);
            return Ok(new { Message = "Referral payable settled successfully." });
        }

        [HttpPost("receivable/{id}/settle")]
        public async Task<IActionResult> SettleReceivable(Guid id, [FromBody] SettleRequestDto request)
        {
            await _settlementService.SettleReceivableAsync(id, request.Amount);
            return Ok(new { Message = "Receivable settled successfully." });
        }

        [HttpPost("receivable/bulk")]
        public async Task<IActionResult> SettleBulkReceivables([FromBody] BulkSettleRequestDto request)
        {
            await _settlementService.SettleBulkPartnerReceivablesAsync(request.PartnerId, request.FactIds, request.TotalAmount);
            return Ok(new { Message = "Bulk settlement processed successfully." });
        }
    }
}
