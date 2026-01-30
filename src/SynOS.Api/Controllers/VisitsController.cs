using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using Microsoft.Extensions.Logging; // Added for logging
using SynOS.Services;
using SynOS.Services.Operational; // ADDED

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize(Policy = "ReceptionPolicy")]
    public class VisitsController : ControllerBase
    {
        private readonly IVisitService _visitService;
        private readonly IInvoiceService _invoiceService;
        private readonly ILogger<VisitsController> _logger;
        private readonly IOperationalStatsProjector _projector; // ADDED

        public VisitsController(IVisitService visitService, IInvoiceService invoiceService, ILogger<VisitsController> logger, IOperationalStatsProjector projector) // ADDED
        {
            _visitService = visitService;
            _invoiceService = invoiceService;
            _logger = logger;
            _projector = projector;
        }

        [HttpPost]
        [Authorize(Policy = "ReceptionPolicy")]
        public async Task<IActionResult> CreateVisit([FromBody] VisitCreateDto visitDto, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey = null)
        {
            try
            {
                var visit = await _visitService.CreateVisitAsync(visitDto, idempotencyKey);
                return CreatedAtAction(nameof(GetVisitDetails), new { id = visit.VisitId }, visit);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Patient or Test not found during visit creation.");
                return NotFound(new { code = "NOT_FOUND", message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Token limit reached or other invalid operation during visit creation.");
                return Conflict(new { code = "BUSINESS_RULE_VIOLATION", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred during visit creation.");
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = "An internal error occurred." });
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
        [Authorize(Policy = "ReceptionPolicy")]
        public async Task<IActionResult> RecordPayment(Guid id, [FromBody] PaymentRequestDto paymentDto)
        {
            try
            {
                var visit = await _visitService.GetVisitDetailsAsync(id);
                if (visit?.Invoices == null || !visit.Invoices.Any())
                {
                    return NotFound(new { code = "INVOICE_NOT_FOUND", message = $"Invoice not found for visit ID {id}." });
                }
                
                var invoiceId = visit.Invoices.First().InvoiceId;

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { message = "User ID not found or invalid." });
                }
                paymentDto.ReceivedByUserId = userId;

                var payment = await _invoiceService.RecordPaymentAsync(invoiceId, paymentDto);
                
                // Trigger live projection
                await _projector.ProjectPendingEventsAsync();

                return Ok(new ApiResponse<Payment>(payment));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "NOT_FOUND", message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { code = "INVALID_PAYMENT_OPERATION", message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { code = "INVALID_ARGUMENT", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred during payment recording for visit ID {VisitId}.", id);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = "An internal error occurred." });
            }
        }

        [HttpPost("{id}/cancel")]
        [Authorize(Policy = "ReceptionPolicy")]
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
        public async Task<IActionResult> GetVisitTokenForPrinting(Guid id)
        {
            try
            {
                var printDto = await _visitService.GetVisitTokenForPrintingAsync(id);
                return Ok(new ApiResponse<VisitTokenPrintDto>(printDto));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "NOT_FOUND", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred while generating token print data for visit ID {VisitId}.", id);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = "An internal error occurred." });
            }
        }
    }
}
