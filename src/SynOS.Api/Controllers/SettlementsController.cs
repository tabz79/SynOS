using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.Settlements;
using SynOS.Services.Security;
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
        private readonly IUserContext _userContext;

        public SettlementsController(ISettlementService settlementService, IUserContext userContext)
        {
            _settlementService = settlementService ?? throw new ArgumentNullException(nameof(settlementService));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
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
            await _settlementService.SettleBulkPartnerReceivablesAsync(request.PartnerId, request.FactIds, request.TotalAmount, request.PaymentMode, request.Reference);
            return Ok(new { Message = "Bulk settlement processed successfully." });
        }

        [HttpGet("reception/b2b-today")]
        public async Task<IActionResult> GetTodayB2BReceivables([FromQuery] Guid? branchId)
        {
            var targetBranchId = (branchId.HasValue && branchId.Value != Guid.Empty) 
                ? branchId.Value 
                : _userContext.CurrentBranchId;

            if (targetBranchId == Guid.Empty)
            {
                return BadRequest(new { Message = "BranchId is required to fetch today's B2B receivables." });
            }

            var groups = await _settlementService.GetTodayB2BReceivablesAsync(targetBranchId);
            return Ok(groups);
        }

        [HttpPost("reception/b2b-today/settle")]
        public async Task<IActionResult> SettleSameDayB2B([FromBody] SettleSameDayB2BRequestDto request)
        {
            if (request == null)
            {
                return BadRequest(new { Message = "Settlement payload is required." });
            }

            var userId = _userContext.CurrentUserId;
            var branchId = _userContext.CurrentBranchId;

            if (branchId == Guid.Empty)
            {
                return BadRequest(new { Message = "Active branch context is required." });
            }

            try
            {
                var receipt = await _settlementService.SettleSameDayB2BReceivablesAsync(request, userId, branchId);
                return Ok(receipt);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        [HttpGet("reception/b2b-today/history")]
        public async Task<IActionResult> GetTodayB2BSettlementsHistory([FromQuery] Guid? branchId)
        {
            var targetBranchId = (branchId.HasValue && branchId.Value != Guid.Empty) 
                ? branchId.Value 
                : _userContext.CurrentBranchId;

            if (targetBranchId == Guid.Empty)
            {
                return BadRequest(new { Message = "BranchId is required to fetch today's B2B settlement history." });
            }

            var history = await _settlementService.GetTodayB2BSettlementsHistoryAsync(targetBranchId);
            return Ok(history);
        }
    }
}
