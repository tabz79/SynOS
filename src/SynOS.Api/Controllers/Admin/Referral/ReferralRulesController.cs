using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Services.Referral;
using SynOS.Services.Security;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin.Referral
{
    [ApiController]
    [Route("api/v1/admin/referral-commission-rules")]
    [Authorize(Roles = "Admin")]
    public class ReferralRulesController : ControllerBase
    {
        private readonly IReferralPartnerService _referralPartnerService;
        private readonly IUserContext _userContext;

        public ReferralRulesController(IReferralPartnerService referralPartnerService, IUserContext userContext)
        {
            _referralPartnerService = referralPartnerService;
            _userContext = userContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllRules()
        {
            var rules = await _referralPartnerService.GetAllCommissionRulesAsync();
            return Ok(rules);
        }

        [HttpPost]
        public async Task<IActionResult> CreateRule([FromBody] ReferralCommissionRuleCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            try
            {
                var rule = await _referralPartnerService.CreateCommissionRuleAsync(dto, _userContext.CurrentUserId);
                return CreatedAtAction(nameof(GetAllRules), rule);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRule(Guid id)
        {
            await _referralPartnerService.DeleteCommissionRuleAsync(id, _userContext.CurrentUserId);
            return NoContent();
        }
    }
}
