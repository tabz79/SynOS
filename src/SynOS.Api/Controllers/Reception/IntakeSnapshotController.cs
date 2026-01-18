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
    [Route("api/v1/reception/intake/snapshot")]
    [Authorize(Policy = "ReceptionPolicy")]
    public class IntakeSnapshotController : ControllerBase
    {
        private readonly IReceptionSnapshotService _service;

        public IntakeSnapshotController(IReceptionSnapshotService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetSnapshot([FromQuery] Guid? patientId, [FromQuery] Guid? visitId)
        {
            try
            {
                var query = new ReceptionSnapshotQuery { PatientId = patientId, VisitId = visitId };
                var snapshot = await _service.GetSnapshotAsync(query);
                return Ok(snapshot);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message }); // Mismatch
            }
        }
    }
}
