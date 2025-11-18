using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Api.Authorization;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using Microsoft.Extensions.Logging; // Added for logging
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class VisitsController : ControllerBase
    {
        private readonly IVisitService _visitService;
        private readonly ILogger<VisitsController> _logger; // Added for logging

        public VisitsController(IVisitService visitService, ILogger<VisitsController> logger)
        {
            _visitService = visitService;
            _logger = logger;
        }

        [HttpPost]
        [AuthorizeRoles("Admin", "Reception")]
        public async Task<IActionResult> CreateVisit([FromBody] VisitCreateDto visitDto, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey = null)
        {
            try
            {
                // Ensure the user ID is set in the DTO for audit/tracking purposes if needed in service
                // For now, we'll pass it directly to the service if the service needs it.
                // visitDto.CreatedByUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value); // Example if needed

                var visit = await _visitService.CreateVisitAsync(visitDto, idempotencyKey);
                return CreatedAtAction(nameof(GetVisitDetails), new { id = visit.VisitId }, visit);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Patient not found during visit creation.");
                return NotFound(new { code = "PATIENT_NOT_FOUND", message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Token limit reached or other invalid operation during visit creation.");
                return Conflict(new { code = "TOKEN_EXHAUSTED_OR_INVALID_OPERATION", message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument provided for visit creation.");
                return BadRequest(new { code = "INVALID_ARGUMENT", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred during visit creation.");
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetVisitDetails(Guid id)
        {
            try
            {
                var visit = await _visitService.GetVisitDetailsAsync(id);
                if (visit == null) return NotFound(new { code = "VISIT_NOT_FOUND", message = $"Visit with ID {id} not found." });
                return Ok(visit);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred while getting visit details for ID {VisitId}.", id);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetVisits([FromQuery] string dept, [FromQuery] string status, [FromQuery] int limit = 50)
        {
            try
            {
                var visits = await _visitService.GetVisitsAsync(dept, status, limit);
                return Ok(visits);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred while getting visits for department {Department} and status {Status}.", dept, status);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpPost("{id}/payment")]
        [AuthorizeRoles("Admin", "Reception")]
        public async Task<IActionResult> RecordPayment(Guid id, [FromBody] PaymentRequestDto paymentDto)
        {
            try
            {
                // Get UserId from claims and set it in the DTO
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { message = "User ID not found or invalid." });
                }
                paymentDto.ReceivedByUserId = userId;
                var payment = await _visitService.RecordPaymentAsync(id, paymentDto);
                return Ok(payment);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Invoice not found for visit ID {VisitId} during payment recording.", id);
                return NotFound(new { code = "INVOICE_NOT_FOUND", message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation during payment recording for visit ID {VisitId}.", id);
                return Conflict(new { code = "INVALID_PAYMENT_OPERATION", message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument provided for payment recording for visit ID {VisitId}.", id);
                return BadRequest(new { code = "INVALID_ARGUMENT", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred during payment recording for visit ID {VisitId}.", id);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpPost("{id}/cancel")]
        [AuthorizeRoles("Admin", "Reception")]
        public async Task<IActionResult> CancelVisit(Guid id, [FromBody] SynOS.Models.DTOs.CancelRequestDto cancelDto)
        {
            try
            {
                // Get UserId from claims and set it in the DTO
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { message = "User ID not found or invalid." });
                }
                cancelDto.CancelledByUserId = userId;
                var cancellation = await _visitService.CancelVisitAsync(id, cancelDto);
                return Ok(cancellation);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Visit not found for ID {VisitId} during cancellation.", id);
                return NotFound(new { code = "VISIT_NOT_FOUND", message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation during visit cancellation for ID {VisitId}.", id);
                return Conflict(new { code = "INVALID_CANCELLATION_OPERATION", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred during visit cancellation for ID {VisitId}.", id);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpGet("{id}/token")]
        public async Task<IActionResult> GetVisitToken(Guid id)
        {
            try
            {
                var visit = await _visitService.GetVisitDetailsAsync(id);
                if (visit == null) return NotFound(new { code = "VISIT_NOT_FOUND", message = $"Visit with ID {id} not found." });
                if (visit.Patient == null) return NotFound(new { code = "PATIENT_NOT_FOUND", message = $"Patient for Visit ID {id} not found." });

                // Return a DTO suitable for printing
                var tokenPrintDto = new TokenPrintDto
                {
                    Token = visit.Token,
                    MRN = visit.Patient.MRN,
                    PatientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                    VisitTime = visit.CreatedAt // Or ScheduledFor if applicable
                };
                return Ok(tokenPrintDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred while getting token for visit ID {VisitId}.", id);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }
    }
}
