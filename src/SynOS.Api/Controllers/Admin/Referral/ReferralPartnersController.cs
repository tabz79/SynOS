using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Services.Referral;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin.Referral
{
    [ApiController]
    [Route("api/v1/admin/referral-partners")]
    [Authorize(Roles = "Admin")]
    public class ReferralPartnersController : ControllerBase
    {
        private readonly IReferralPartnerService _referralPartnerService;

        public ReferralPartnersController(IReferralPartnerService referralPartnerService)
        {
            _referralPartnerService = referralPartnerService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateReferralPartner([FromBody] ReferralPartnerCreateDto createDto)
        {
            var partner = await _referralPartnerService.CreateReferralPartnerAsync(createDto);
            return CreatedAtAction(nameof(GetReferralPartnerById), new { id = partner.ReferralPartnerId }, partner);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllReferralPartners()
        {
            var partners = await _referralPartnerService.GetAllReferralPartnersAsync();
            return Ok(partners);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetReferralPartnerById(Guid id)
        {
            var partner = await _referralPartnerService.GetReferralPartnerByIdAsync(id);
            return Ok(partner);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReferralPartner(Guid id, [FromBody] ReferralPartnerUpdateDto updateDto)
        {
            var partner = await _referralPartnerService.UpdateReferralPartnerAsync(id, updateDto);
            return Ok(partner);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReferralPartner(Guid id)
        {
            await _referralPartnerService.DeleteReferralPartnerAsync(id);
            return NoContent();
        }
    }
}
