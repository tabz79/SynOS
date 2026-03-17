using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.Admin;

namespace SynOS.Api.Controllers.Admin
{
    [Authorize(Policy = "AdminPolicy")]
    [ApiController]
    [Route("api/v1/admin/operations/resources")]
    public class AdminOperationalResourceController : ControllerBase
    {
        private readonly IAdminUserService _adminUserService;

        public AdminOperationalResourceController(IAdminUserService adminUserService)
        {
            _adminUserService = adminUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetResources()
        {
            var resources = await _adminUserService.GetOperationalResourcesAsync();
            return Ok(resources);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateResource(Guid id, [FromBody] UpdateResourceRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.DepartmentCode))
            {
                return BadRequest("Department code is required.");
            }

            await _adminUserService.UpdateOperationalResourceAsync(id, request.DepartmentCode);
            return NoContent();
        }

        [HttpPost("sync")]
        public async Task<IActionResult> SyncResources()
        {
            await _adminUserService.SyncOperationalResourcesAsync();
            return Ok(new { message = "Operational resources synchronized successfully." });
        }
    }

    public class UpdateResourceRequest
    {
        public string DepartmentCode { get; set; } = string.Empty;
    }
}
