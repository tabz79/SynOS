using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Services.Referral;
using SynOS.Services.Security;

namespace SynOS.Api.Controllers.Admin.Referral
{
    [ApiController]
    [Route("api/v1/admin/referral-learning")]
    [Authorize]
    public class ReferralLearningController : ControllerBase
    {
        private readonly IReferralLearningService _learningService;
        private readonly IUserContext _userContext;

        public ReferralLearningController(
            IReferralLearningService learningService,
            IUserContext userContext)
        {
            _learningService = learningService;
            _userContext = userContext;
        }

        /// <summary>
        /// Retrieves the daily pending referral rate learning queue (doctors and tests prescribed without rules).
        /// </summary>
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingQueue()
        {
            var queue = await _learningService.GetPendingLearningQueueAsync();
            return Ok(queue);
        }

        /// <summary>
        /// Commits learned doctor-test rates and automatically recalculates pending unsettled visit payables.
        /// </summary>
        [HttpPost("commit")]
        [Authorize(Roles = "Admin,SystemAdmin")]
        public async Task<IActionResult> CommitLearnedRates([FromBody] CommitLearningBatchRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _learningService.CommitLearnedRatesAsync(request, _userContext.CurrentUserId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gets all learned test commission rules for a specific doctor.
        /// </summary>
        [HttpGet("doctor/{partnerId}/rate-card")]
        public async Task<IActionResult> GetDoctorRateCard(Guid partnerId)
        {
            var rules = await _learningService.GetLearnedRulesForDoctorAsync(partnerId);
            return Ok(rules);
        }

        /// <summary>
        /// Searches across all learned doctor-test rules.
        /// </summary>
        [HttpGet("rules")]
        public async Task<IActionResult> SearchLearnedRules([FromQuery] string? query)
        {
            var rules = await _learningService.SearchAllLearnedRulesAsync(query);
            return Ok(rules);
        }

        /// <summary>
        /// Deletes/deactivates a specific learned rule.
        /// </summary>
        [HttpDelete("rules/{ruleId}")]
        [Authorize(Roles = "Admin,SystemAdmin")]
        public async Task<IActionResult> DeleteLearnedRule(Guid ruleId)
        {
            await _learningService.DeleteLearnedRuleAsync(ruleId);
            return NoContent();
        }
    }
}
