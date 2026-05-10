using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Services.Settlements;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin.Referral
{
    [ApiController]
    [Route("api/v1/admin/referral-settle")]
    [Authorize]
    public class ReferralSettleController : ControllerBase
    {
        private readonly ISettlementService _settlementService;

        public ReferralSettleController(ISettlementService settlementService)
        {
            _settlementService = settlementService;
        }

        [HttpPost("payout")]
        public async Task<IActionResult> SettlePayout([FromBody] BulkSettlementDto dto)
        {
            try
            {
                await _settlementService.SettleBulkReferralPayablesAsync(dto.PartnerId, dto.FactIds, dto.TotalAmount, dto.PaymentMethod);
                return Ok(new { message = "Bulk payout successful" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message, detail = ex.InnerException?.Message });
            }
        }

        [HttpPost("recovery")]
        public async Task<IActionResult> SettleRecovery([FromBody] BulkSettlementDto dto)
        {
            try
            {
                await _settlementService.SettleBulkPartnerReceivablesAsync(dto.PartnerId, dto.FactIds, dto.TotalAmount, dto.PaymentMethod);
                return Ok(new { message = "Bulk recovery successful" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message, detail = ex.InnerException?.Message });
            }
        }
    }
}
