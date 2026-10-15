using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Enums.Referral;
using SynOS.Services.Referral;
using SynOS.Services.Security;

namespace SynOS.Api.Controllers.Admin.Referral
{
    [ApiController]
    [Route("api/v1/admin/doctor-crm")]
    [Authorize]
    public class DoctorCrmController : ControllerBase
    {
        private readonly IDoctorCrmService _doctorCrmService;
        private readonly IReferralCommissionGoverningEngine _governingEngine;
        private readonly IUserContext _userContext;

        public DoctorCrmController(
            IDoctorCrmService doctorCrmService,
            IReferralCommissionGoverningEngine governingEngine,
            IUserContext userContext)
        {
            _doctorCrmService = doctorCrmService;
            _governingEngine = governingEngine;
            _userContext = userContext;
        }

        [HttpGet("directory")]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetDoctorDirectory([FromQuery] DoctorDirectoryFilterDto filter)
        {
            var result = await _doctorCrmService.GetDoctorDirectoryAsync(filter);
            return Ok(result);
        }

        [HttpGet("{id}/profile")]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetDoctorProfile(Guid id)
        {
            try
            {
                var profile = await _doctorCrmService.GetDoctorProfileAsync(id);
                return Ok(profile);
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/demographics")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateDoctorDemographics(Guid id, [FromBody] UpdateDoctorDemographicsRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var updated = await _doctorCrmService.UpdateDoctorDemographicsAsync(id, request, _userContext.CurrentUserId);
                return Ok(updated);
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        public class QuickLearnRatePayload
        {
            [Required]
            public Guid TestId { get; set; }
            public CommissionType CommissionType { get; set; } = CommissionType.Percentage;
            [Required]
            [Range(0, (double)decimal.MaxValue)]
            public decimal CommissionValue { get; set; }
        }

        [HttpPost("{id}/quick-learn")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> QuickLearnRate(Guid id, [FromBody] QuickLearnRatePayload payload)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var rule = await _doctorCrmService.QuickLearnRateAsync(
                    id, 
                    payload.TestId, 
                    payload.CommissionType, 
                    payload.CommissionValue, 
                    _userContext.CurrentUserId);

                return Ok(rule);
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("governance/evaluate/{visitId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> EvaluateVisit(Guid visitId)
        {
            var result = await _governingEngine.EvaluateVisitAsync(visitId);
            return Ok(result);
        }
    }
}
