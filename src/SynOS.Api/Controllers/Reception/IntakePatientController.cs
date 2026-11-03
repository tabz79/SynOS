using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Reception;
using SynOS.Services.Reception;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Reception
{
    [ApiController]
    [Route("api/v1/reception/intake/register-patient")]
    [Authorize(Policy = "ReceptionPolicy")]
    public class IntakePatientController : ControllerBase
    {
        private readonly IReceptionPatientService _service;

        public IntakePatientController(IReceptionPatientService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> RegisterPatient([FromBody] IntakeRegisterPatientRequest request)
        {
            try
            {
                var result = await _service.RegisterPatientAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // EXPOSE DETAILS FOR STABILIZATION PHASE
                return StatusCode(500, new { 
                    message = "An error occurred during registration.", 
                    details = ex.Message,
                    inner = ex.InnerException?.Message,
                    stack = ex.StackTrace 
                });
            }
        }

        [HttpGet("fuzzy-match")]
        public async Task<IActionResult> FuzzyMatch(
            [FromQuery] string name,
            [FromQuery] string? gender = null,
            [FromQuery] int? age = null,
            [FromQuery] DateTime? dob = null)
        {
            if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 2)
            {
                return Ok(Array.Empty<PatientFuzzyMatchDto>());
            }

            var results = await _service.FindFuzzyMatchesAsync(name, gender, age, dob);
            return Ok(results);
        }
    }
}
