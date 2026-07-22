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
    [Route("api/v1/admin/referral-partners")]
    [Authorize] // Auth required, roles defined on methods
    public class ReferralPartnersController : ControllerBase
    {
        private readonly IReferralPartnerService _referralPartnerService;
        private readonly IReferralFinancialService _referralFinancialService;
        private readonly IUserContext _userContext;

        public ReferralPartnersController(
            IReferralPartnerService referralPartnerService,
            IReferralFinancialService referralFinancialService,
            IUserContext userContext)
        {
            _referralPartnerService = referralPartnerService;
            _referralFinancialService = referralFinancialService;
            _userContext = userContext;
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateReferralPartner([FromBody] ReferralPartnerCreateDto createDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            try 
            {
                var partner = await _referralPartnerService.CreateReferralPartnerAsync(createDto, _userContext.CurrentUserId);
                return CreatedAtAction(nameof(GetReferralPartnerById), new { id = partner.ReferralPartnerId }, partner);
            } 
            catch (InvalidOperationException ex) 
            { 
                return Conflict(new { message = ex.Message }); 
            }
        }

        [HttpPost("draft")]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> CreateDraftPartner([FromBody] ReferralPartnerCreateDto createDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            try 
            {
                var partner = await _referralPartnerService.CreateDraftPartnerAsync(createDto, _userContext.CurrentUserId);
                return Ok(partner);
            } 
            catch (InvalidOperationException ex) 
            { 
                return Conflict(new { message = ex.Message }); 
            }
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApprovePartner(Guid id, [FromBody] PartnerApprovalRequest request)
        {
            try 
            {
                await _referralPartnerService.ApprovePartnerAsync(id, request.CommissionPercentage, _userContext.CurrentUserId);
                return NoContent();
            } 
            catch (System.Collections.Generic.KeyNotFoundException) 
            { 
                return NotFound(); 
            }
            catch (InvalidOperationException ex) 
            { 
                return BadRequest(new { message = ex.Message }); 
            }
        }

        public class PartnerApprovalRequest
        {
            public decimal CommissionPercentage { get; set; }
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetAllReferralPartners()
        {
            var partners = await _referralPartnerService.GetAllReferralPartnersAsync();
            return Ok(partners);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetReferralPartnerById(Guid id)
        {
            try 
            {
                var partner = await _referralPartnerService.GetReferralPartnerByIdAsync(id);
                return Ok(partner);
            } 
            catch (System.Collections.Generic.KeyNotFoundException) 
            { 
                return NotFound(); 
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateReferralPartner(Guid id, [FromBody] ReferralPartnerUpdateDto updateDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try 
            {
                var partner = await _referralPartnerService.UpdateReferralPartnerAsync(id, updateDto, _userContext.CurrentUserId);
                return Ok(partner);
            } 
            catch (System.Collections.Generic.KeyNotFoundException) 
            { 
                return NotFound(); 
            }
            catch (InvalidOperationException ex) 
            { 
                return Conflict(new { message = ex.Message }); 
            }
        }
        [HttpGet("summary")]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetSummary([FromQuery] Guid? branchId, [FromQuery] bool isConsolidated = false)
        {
            await _referralFinancialService.BackfillUnrecognizedCommissionsAsync();

            Guid? effectiveBranchId = branchId ?? _userContext.CurrentBranchId;
            if (isConsolidated && (_userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin"))
            {
                effectiveBranchId = null;
            }

            var summary = await _referralPartnerService.GetReferralSummaryAsync(effectiveBranchId);
            return Ok(summary);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeactivatePartner(Guid id)
        {
            try 
            {
                await _referralPartnerService.DeleteReferralPartnerAsync(id, _userContext.CurrentUserId);
                return NoContent();
            } 
            catch (System.Collections.Generic.KeyNotFoundException) 
            { 
                return NotFound(); 
            }
        }
    }
}
