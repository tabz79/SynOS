using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin;
using SynOS.Services.Admin;

namespace SynOS.Api.Controllers.Admin
{
    [Authorize(Policy = "AdminPolicy")]
    [ApiController]
    [Route("api/v1/admin/users")]
    public class AdminUserController : ControllerBase
    {
        private readonly IAdminUserService _adminUserService;

        public AdminUserController(IAdminUserService adminUserService)
        {
            _adminUserService = adminUserService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            var user = await _adminUserService.CreateUserAsync(request.Email, request.Name, request.Password);
            return Ok(new { user.UserId, user.Email, user.Name });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> SetUserStatus(Guid id, [FromBody] SetUserStatusRequest request)
        {
            await _adminUserService.SetUserStatusAsync(id, request.IsActive);
            return NoContent();
        }

        [HttpPost("{id}/branches")]
        public async Task<IActionResult> AssignBranchRole(Guid id, [FromBody] AssignBranchRoleRequest request)
        {
            await _adminUserService.AssignBranchRoleAsync(id, request.BranchId, request.RoleId, request.RoleName);
            return Ok();
        }

        [HttpDelete("{id}/branches")]
        public async Task<IActionResult> RemoveBranchRole(Guid id, [FromQuery] Guid branchId, [FromQuery] Guid roleId)
        {
            await _adminUserService.RemoveBranchRoleAsync(id, branchId, roleId);
            return Ok();
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _adminUserService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpGet("branches")]
        public async Task<IActionResult> GetAllBranches()
        {
            var branches = await _adminUserService.GetAllBranchesAsync();
            return Ok(branches);
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles = await _adminUserService.GetAllRolesAsync();
            return Ok(roles);
        }
    }
}
