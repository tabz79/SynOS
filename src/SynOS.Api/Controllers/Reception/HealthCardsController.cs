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

        [HttpPost("{cardId:guid}/activate")]
        public async Task<IActionResult> ActivateCard(Guid cardId, [FromQuery] string? paymentMode)
        {
            try
            {
                var userId = GetCurrentUserId();
                var card = await _healthCardService.ActivatePendingCardAsync(cardId, paymentMode ?? "Cash", userId);
                return Ok(card);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to activate health card.", details = ex.Message });
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
            try
            {
                var cards = await _healthCardService.GetCardsAsync(query, limit);
                return Ok(cards);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to fetch health cards.", details = ex.Message });
            }
        }

        [HttpGet("{cardId:guid}")]
        public async Task<IActionResult> GetCardById(Guid cardId)
        {
            try
            {
                var card = await _healthCardService.GetCardByIdAsync(cardId);
                if (card == null) return NotFound(new { message = "Health card not found." });
                return Ok(card);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to fetch health card details.", details = ex.Message });
            }
        }

        [HttpGet("by-patient/{patientId:guid}")]
        public async Task<IActionResult> GetCardByPatient(Guid patientId)
        {
            try
            {
                var card = await _healthCardService.GetCardByPatientIdAsync(patientId);
                if (card == null) return NotFound(new { message = "No health card found for this patient." });
                return Ok(card);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to fetch patient health card.", details = ex.Message });
            }
        }

        [HttpPut("{cardId:guid}")]
        public async Task<IActionResult> UpdateCard(Guid cardId, [FromBody] UpdateHealthCardRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var card = await _healthCardService.UpdateCardAsync(cardId, request, userId);
                return Ok(card);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to update health card.", details = ex.Message });
            }
        }

        [HttpPost("{cardId:guid}/renew")]
        public async Task<IActionResult> RenewCard(Guid cardId, [FromBody] RenewHealthCardRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userName = User.Identity?.Name ?? "receptionist";
                var card = await _healthCardService.RenewCardAsync(cardId, request, userId, userName);
                return Ok(card);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to renew health card.", details = ex.Message });
            }
        }

        [HttpPost("{cardId:guid}/cancel")]
        public async Task<IActionResult> CancelCard(Guid cardId, [FromBody] CancelHealthCardRequestDto? request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _healthCardService.CancelCardAsync(cardId, request?.Reason, userId);
                if (!success) return NotFound(new { message = "Health card not found." });
                return Ok(new { success, message = "Health card cancelled successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to cancel health card.", details = ex.Message });
            }
        }

        [HttpDelete("{cardId:guid}/beneficiaries/{beneficiaryId:guid}")]
        public async Task<IActionResult> RemoveBeneficiary(Guid cardId, Guid beneficiaryId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _healthCardService.RemoveBeneficiaryAsync(cardId, beneficiaryId, userId);
                if (!success) return NotFound(new { message = "Beneficiary not found on this card." });
                return Ok(new { success, message = "Beneficiary removed successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to remove beneficiary.", details = ex.Message });
            }
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
