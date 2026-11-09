using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.HealthCards;
using SynOS.Services.HealthCards;

namespace SynOS.Api.Controllers.Reception
{
    [ApiController]
    [Route("api/v1/reception/health-cards")]
    [Authorize]
    public class HealthCardsController : ControllerBase
    {
        private readonly IHealthCardService _healthCardService;

        public HealthCardsController(IHealthCardService healthCardService)
        {
            _healthCardService = healthCardService;
        }

        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans()
        {
            var plans = await _healthCardService.GetActivePlansAsync();
            return Ok(plans);
        }

        [HttpPost("issue")]
        public async Task<IActionResult> IssueCard([FromBody] IssueHealthCardRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userName = User.Identity?.Name ?? "receptionist";
                var branchId = GetCurrentBranchId();

                var card = await _healthCardService.IssueCardAsync(request, userId, userName, branchId);
                return Ok(card);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to issue health card.", details = ex.Message });
            }
        }

        [HttpGet("eligibility")]
        public async Task<IActionResult> CheckEligibility(
            [FromQuery] Guid? patientId, 
            [FromQuery] string? phoneNumber)
        {
            try
            {
                var result = await _healthCardService.CheckEligibilityAsync(patientId, phoneNumber);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to verify health card eligibility.", details = ex.Message });
            }
        }

        [HttpPost("{cardId:guid}/enroll-beneficiary")]
        public async Task<IActionResult> EnrollBeneficiary(
            Guid cardId, 
            [FromBody] EnrollBeneficiaryRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var beneficiary = await _healthCardService.EnrollBeneficiaryAsync(cardId, request, userId);
                return Ok(beneficiary);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to enroll family member.", details = ex.Message });
            }
        }

        [HttpPost("record-usage")]
        public async Task<IActionResult> RecordUsage([FromBody] RecordCardUsageRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userName = User.Identity?.Name ?? "cashier";
                var success = await _healthCardService.RecordCardUsageAsync(request, userId, userName);
                return Ok(new { success });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to record health card usage.", details = ex.Message });
            }
        }

        [HttpPost("attach-to-visit")]
        public async Task<IActionResult> AttachToVisit([FromBody] AttachCardToVisitRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _healthCardService.AttachCardToVisitAsync(request.VisitId, request.PlanId, userId);
                return Ok(new { success });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to attach health card to visit.", details = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetCards(
            [FromQuery] string? query = null, 
            [FromQuery] int limit = 50)
        {
            var cards = await _healthCardService.GetCardsAsync(query, limit);
            return Ok(cards);
        }

        [HttpGet("{cardId:guid}")]
        public async Task<IActionResult> GetCardById(Guid cardId)
        {
            var card = await _healthCardService.GetCardByIdAsync(cardId);
            if (card == null) return NotFound(new { message = "Health card not found." });
            return Ok(card);
        }

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                        User.FindFirst("sub")?.Value ??
                        User.FindFirst("userId")?.Value;

            return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
        }

        private Guid GetCurrentBranchId()
        {
            var claim = User.FindFirst("branchId")?.Value ??
                        User.FindFirst("BranchId")?.Value;

            return Guid.TryParse(claim, out var id) ? id : Guid.Parse("A0000000-0000-0000-0000-000000000001");
        }
    }
}
