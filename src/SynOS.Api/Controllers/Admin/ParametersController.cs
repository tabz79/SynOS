using System;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin;
using SynOS.Services;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/tests/{testId}/parameters")]
    [Authorize(Roles = "Admin")]
    public class ParametersController : ControllerBase
    {
        private readonly ITestMasterService _testMasterService;
        private readonly IMapper _mapper;

        public ParametersController(ITestMasterService testMasterService, IMapper mapper)
        {
            _testMasterService = testMasterService;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task<IActionResult> AddParameter(Guid testId, [FromBody] CreateParameterDto dto)
        {
            var parameter = await _testMasterService.AddParameterToTestAsync(testId, dto, GetCurrentUserId());
            return Ok(_mapper.Map<ParameterDto>(parameter));
        }

        [HttpPut("{parameterId}")]
        public async Task<IActionResult> UpdateParameter(Guid testId, Guid parameterId, [FromBody] UpdateParameterDto dto)
        {
            var parameter = await _testMasterService.UpdateParameterAsync(testId, parameterId, dto, GetCurrentUserId());
            return Ok(_mapper.Map<ParameterDto>(parameter));
        }

        [HttpDelete("{parameterId}")]
        public async Task<IActionResult> DeleteParameter(Guid testId, Guid parameterId)
        {
            await _testMasterService.DeleteParameterAsync(testId, parameterId, GetCurrentUserId());
            return NoContent();
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
}
