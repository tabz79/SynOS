using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.Revenue;
using SynOS.Models.DTOs; // ADDED
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/visits/{visitId}/corrections")]
    [Authorize] // Policy to be refined
    public class CorrectionController : ControllerBase
    {
        private readonly ICorrectionService _correctionService;

        public CorrectionController(ICorrectionService correctionService)
        {
            _correctionService = correctionService;
        }

        [HttpGet("context")]
        public async Task<ActionResult<CorrectionContextDto>> GetCorrectionContext(Guid visitId)
        {
            try
            {
                var context = await _correctionService.GetCorrectionContextAsync(visitId);
                return Ok(context);
            }
            catch (System.Collections.Generic.KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost]
        [Authorize(Policy = "OperationalModeOnly")]
        public async Task<IActionResult> ApplyCorrection(Guid visitId, [FromBody] ApplyCorrectionCommand command)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

                await _correctionService.ApplyCorrectionAsync(visitId, command, userId);
                return Ok();
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }
    }
}
