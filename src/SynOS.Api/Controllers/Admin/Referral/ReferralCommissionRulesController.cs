using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Services.Referral;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin.Referral
{
    [ApiController]
    [Route("api/v1/admin/")]
    [Authorize(Roles = "Admin")]
    public class ReferralCommissionRulesController : ControllerBase
    {
        private readonly IReferralCommissionService _commissionService;

        public ReferralCommissionRulesController(IReferralCommissionService commissionService)
        {
            _commissionService = commissionService;
        }

        [HttpPost("referral-partners/{partnerId}/commission-rules")]
        public async Task<IActionResult> CreateCommissionRule(Guid partnerId, [FromBody] ReferralCommissionRuleCreateDto createDto)
        {
            var rule = await _commissionService.CreateCommissionRuleAsync(partnerId, createDto);
            // This might not be the final location, but it's a reasonable default.
            return Ok(rule);
        }

        [HttpGet("referral-partners/{partnerId}/commission-rules")]
        public async Task<IActionResult> GetCommissionRulesForPartner(Guid partnerId)
        {
            var rules = await _commissionService.GetCommissionRulesForPartnerAsync(partnerId);
            return Ok(rules);
        }

        [HttpPut("commission-rules/{ruleId}")]
        public async Task<IActionResult> UpdateCommissionRule(Guid ruleId, [FromBody] ReferralCommissionRuleUpdateDto updateDto)
        {
            var rule = await _commissionService.UpdateCommissionRuleAsync(ruleId, updateDto);
            return Ok(rule);
        }

        [HttpDelete("commission-rules/{ruleId}")]
        public async Task<IActionResult> DeleteCommissionRule(Guid ruleId)
        {
            await _commissionService.DeleteCommissionRuleAsync(ruleId);
            return NoContent();
        }
    }
}
