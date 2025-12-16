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
    [Route("api/v1/admin/tests/{testId}/parameters/{parameterId}/ranges")]
    [Authorize(Roles = "Admin")]
    public class ReferenceRangesController : ControllerBase
    {
        private readonly ITestMasterService _testMasterService;
        private readonly IMapper _mapper;

        public ReferenceRangesController(ITestMasterService testMasterService, IMapper mapper)
        {
            _testMasterService = testMasterService;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task<IActionResult> AddReferenceRange(Guid parameterId, [FromBody] CreateReferenceRangeDto dto)
        {
            var range = await _testMasterService.AddReferenceRangeToParameterAsync(parameterId, dto, GetCurrentUserId());
            return Ok(_mapper.Map<ReferenceRangeDto>(range));
        }

        [HttpPut("{rangeId}")]
        public async Task<IActionResult> UpdateReferenceRange(Guid parameterId, Guid rangeId, [FromBody] UpdateReferenceRangeDto dto)
        {
            var range = await _testMasterService.UpdateReferenceRangeAsync(parameterId, rangeId, dto, GetCurrentUserId());
            return Ok(_mapper.Map<ReferenceRangeDto>(range));
        }

        [HttpDelete("{rangeId}")]
        public async Task<IActionResult> DeleteReferenceRange(Guid parameterId, Guid rangeId)
        {
            await _testMasterService.DeleteReferenceRangeAsync(parameterId, rangeId, GetCurrentUserId());
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
