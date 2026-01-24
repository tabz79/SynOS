using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.Settlements;
using System;
using System.Threading.Tasks;

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
        public async Task<IActionResult> SettleReferralPayable(Guid id)
        {
            await _settlementService.SettleReferralPayableAsync(id);
            return Ok(new { Message = "Referral payable settled successfully." });
        }

        [HttpPost("receivable/{id}/settle")]
        public async Task<IActionResult> SettleReceivable(Guid id)
        {
            await _settlementService.SettleReceivableAsync(id);
            return Ok(new { Message = "Receivable settled successfully." });
        }
    }
}
