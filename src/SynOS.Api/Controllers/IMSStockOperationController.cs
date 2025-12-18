using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.IMS;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/ims/stock")]
    [Authorize]
    public class IMSStockOperationController : ControllerBase
    {
        private readonly ITubeConsumptionService _tubeConsumptionService;

        public IMSStockOperationController(ITubeConsumptionService tubeConsumptionService)
        {
            _tubeConsumptionService = tubeConsumptionService;
        }

        [HttpPost("lot")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddStockLot([FromBody] LotCreateDto lotDto)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            await _tubeConsumptionService.AddStockManualAsync(lotDto, userId);
            return Ok(new { message = "Stock lot added successfully." });
        }

        [HttpPost("wastage")]
        [Authorize(Roles = "Admin,LabTech")]
        public async Task<IActionResult> RecordWastage([FromBody] WastageRequestDto dto)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            try
            {
                await _tubeConsumptionService.RecordWastageAsync(dto, userId);
                return Ok(new { message = "Wastage recorded successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
