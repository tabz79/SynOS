using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Reception;
using SynOS.Services;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Reception
{
    [ApiController]
    [Route("api/v1/reception/visit")]
    [Authorize(Roles = "Receptionist,Admin")]
    public class IntakeVisitController : ControllerBase
    {
        private readonly IReceptionFlowService _service;

        public IntakeVisitController(IReceptionFlowService service)
        {
            _service = service;
        }



        [HttpPost("referral")]
        public async Task<IActionResult> SetReferral([FromBody] SetReferralRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            try
            {
                var userId = GetCurrentUserId();
                await _service.SetVisitReferralAsync(request.VisitId, request.ReferralPartnerId, userId);
                return Ok(); // 200 OK
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // CRITICAL DEBUGGING: Expose unexpected errors
                return StatusCode(500, new { message = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpDelete("referral")]
        public async Task<IActionResult> RemoveReferral([FromQuery] Guid visitId)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _service.RemoveVisitReferralAsync(visitId, userId);
                return Ok();
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpPatch("referrer-text")]
        public async Task<IActionResult> UpdateReferrerText([FromBody] UpdateReferrerTextRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = GetCurrentUserId();
                await _service.UpdateReferrerTextAsync(request.VisitId, request.ReferrerText, userId);
                return Ok();
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpPost("mark-prepaid")]
        public async Task<IActionResult> MarkPrepaid([FromBody] MarkPrepaidRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = GetCurrentUserId();
                await _service.MarkVisitAsPrepaidAsync(request.VisitId, userId);
                return Ok(new { success = true });
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
            {
                var innerMsg = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = $"Database error: {innerMsg}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpPost("billing-context")]
        public async Task<IActionResult> SetBillingContext([FromBody] SetBillingContextRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = GetCurrentUserId();
                await _service.SetBillingContextAsync(
                    request.VisitId,
                    request.BillingType,
                    request.InsuranceCompanyId,
                    request.PolicyNumber,
                    request.PreAuthApprovalNumber,
                    request.InsuranceCoPayAmount,
                    request.CorporateAccountId,
                    request.EmployeeId,
                    request.CorporatePackageId,
                    userId);
                return Ok(new { success = true });
            }
            catch (System.Collections.Generic.KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPost("mark-insurance")]
        public async Task<IActionResult> MarkInsurance([FromBody] MarkInsuranceRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = GetCurrentUserId();
                await _service.MarkVisitAsInsuranceAsync(request.VisitId, userId);
                return Ok(new { success = true });
            }
            catch (System.Collections.Generic.KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPost("mark-corporate")]
        public async Task<IActionResult> MarkCorporate([FromBody] MarkCorporateRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = GetCurrentUserId();
                await _service.MarkVisitAsCorporateAsync(request.VisitId, userId);
                return Ok(new { success = true });
            }
            catch (System.Collections.Generic.KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            return Guid.Empty;
        }
    }

    public class SetBillingContextRequestDto
    {
        public Guid VisitId { get; set; }
        public SynOS.Models.Enums.BillingType BillingType { get; set; }
        public Guid? InsuranceCompanyId { get; set; }
        public string? PolicyNumber { get; set; }
        public string? PreAuthApprovalNumber { get; set; }
        public decimal? InsuranceCoPayAmount { get; set; }
        public Guid? CorporateAccountId { get; set; }
        public string? EmployeeId { get; set; }
        public Guid? CorporatePackageId { get; set; }
    }

    public class MarkInsuranceRequestDto
    {
        public Guid VisitId { get; set; }
    }

    public class MarkCorporateRequestDto
    {
        public Guid VisitId { get; set; }
    }
}
