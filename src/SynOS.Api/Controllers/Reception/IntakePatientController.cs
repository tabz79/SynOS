using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Reception;
using SynOS.Services.Reception;
using System;
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
                return StatusCode(500, new { message = "An error occurred during registration.", details = ex.Message });
            }
        }
    }
}
