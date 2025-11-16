using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Api.Authorization;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class VisitsController : ControllerBase
    {
        private readonly IVisitService _visitService;

        public VisitsController(IVisitService visitService)
        {
            _visitService = visitService;
        }

        [HttpPost]
        [AuthorizeRoles("Admin", "Reception")]
        public async Task<IActionResult> CreateVisit([FromBody] VisitCreateDto visitDto)
        {
            try
            {
                var visit = await _visitService.CreateVisitAsync(visitDto);
                return CreatedAtAction(nameof(GetVisitDetails), new { id = visit.VisitId }, visit);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { code = "TOKEN_LIMIT_REACHED", message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetVisitDetails(Guid id)
        {
            var visit = await _visitService.GetVisitDetailsAsync(id);
            if (visit == null) return NotFound();
            return Ok(visit);
        }

        [HttpGet]
        public async Task<IActionResult> GetVisits([FromQuery] string dept, [FromQuery] string status, [FromQuery] int limit = 50)
        {
            var visits = await _visitService.GetVisitsAsync(dept, status, limit);
            return Ok(visits);
        }

        [HttpPost("{id}/payment")]
        [AuthorizeRoles("Admin", "Reception")]
        public async Task<IActionResult> RecordPayment(Guid id, [FromBody] PaymentRequestDto paymentDto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
                var payment = await _visitService.RecordPaymentAsync(id, paymentDto, userId);
                return Ok(payment);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "INVOICE_NOT_FOUND", message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpPost("{id}/cancel")]
        [AuthorizeRoles("Admin", "Reception")]
        public async Task<IActionResult> CancelVisit(Guid id, [FromBody] CancelRequestDto cancelDto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
                var cancellation = await _visitService.CancelVisitAsync(id, cancelDto, userId);
                return Ok(cancellation);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "VISIT_NOT_FOUND", message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }
    }
}
