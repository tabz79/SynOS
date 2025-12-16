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
    [Route("api/v1/admin/tests/{testId}/price-config")]
    [Authorize(Roles = "Admin")]
    public class PriceConfigController : ControllerBase
    {
        private readonly ITestMasterService _testMasterService;
        private readonly IMapper _mapper;

        public PriceConfigController(ITestMasterService testMasterService, IMapper mapper)
        {
            _testMasterService = testMasterService;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task<IActionResult> AddOrUpdatePriceConfig(Guid testId, [FromBody] CreatePriceConfigDto dto)
        {
            var config = await _testMasterService.AddOrUpdatePriceConfigAsync(testId, dto, GetCurrentUserId());
            return Ok(_mapper.Map<PriceConfigDto>(config));
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
