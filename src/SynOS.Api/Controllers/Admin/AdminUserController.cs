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
            var user = await _adminUserService.CreateUserAsync(request.Username, request.Email, request.Name, request.Password, request.Designation);
            return Ok(new { user.UserId, user.Username, user.Email, user.Name, user.Designation });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                await _adminUserService.UpdateUserAsync(id, request.Name, request.Username, request.Email, request.Designation, request.IsActive, request.DepartmentCode);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
        {
            try
            {
                await _adminUserService.ResetPasswordAsync(id, request.Password);
                return Ok(new { Message = "Password reset successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost("{id}/unlock")]
        public async Task<IActionResult> UnlockUser(Guid id)
        {
            try
            {
                await _adminUserService.UnlockUserAsync(id);
                return Ok(new { Message = "User account unlocked successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
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

        [HttpPost("branches")]
        public async Task<IActionResult> CreateBranch([FromBody] CreateBranchRequest request)
        {
            try
            {
                var branch = await _adminUserService.CreateBranchAsync(request.Code, request.Name, request.Address, request.Phone, request.Email);
                return Ok(branch);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPut("branches/{id}")]
        public async Task<IActionResult> UpdateBranch(Guid id, [FromBody] UpdateBranchRequest request)
        {
            try
            {
                var branch = await _adminUserService.UpdateBranchAsync(id, request.Code, request.Name, request.IsActive, request.Address, request.Phone, request.Email);
                return Ok(branch);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpDelete("branches/{id}")]
        public async Task<IActionResult> DeleteBranch(Guid id)
        {
            try
            {
                await _adminUserService.DeleteBranchAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles = await _adminUserService.GetAllRolesAsync();
            return Ok(roles);
        }

        [HttpGet("/api/v1/admin/departments")]
        public async Task<IActionResult> GetAllDepartments()
        {
            var depts = await _adminUserService.GetAllDepartmentsAsync();
            return Ok(depts);
        }

        [HttpPost("/api/v1/admin/departments")]
        public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentRequest request)
        {
            try
            {
                var dept = await _adminUserService.CreateDepartmentAsync(request.Code, request.Name, request.MacroDepartment);
                return Ok(dept);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPut("/api/v1/admin/departments/{id}")]
        public async Task<IActionResult> UpdateDepartment(Guid id, [FromBody] UpdateDepartmentRequest request)
        {
            try
            {
                var dept = await _adminUserService.UpdateDepartmentAsync(id, request.Name, request.MacroDepartment, request.IsActive);
                return Ok(dept);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
        }

        [HttpDelete("/api/v1/admin/departments/{id}")]
        public async Task<IActionResult> DeleteDepartment(Guid id)
        {
            try
            {
                await _adminUserService.DeleteDepartmentAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
        }

        [HttpGet("workspaces")]
        public async Task<IActionResult> GetWorkspaces()
        {
            var workspaces = await _adminUserService.GetWorkspacesAsync();
            return Ok(workspaces);
        }

        [HttpPost("workspaces")]
        public async Task<IActionResult> CreateWorkspace([FromBody] CreateWorkspaceRequest request)
        {
            try
            {
                var ws = await _adminUserService.CreateWorkspaceAsync(request.Name, request.RoutePath);
                return Ok(ws);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPut("workspaces/{id}")]
        public async Task<IActionResult> UpdateWorkspace(Guid id, [FromBody] UpdateWorkspaceRequest request)
        {
            try
            {
                var ws = await _adminUserService.UpdateWorkspaceAsync(id, request.Name, request.RoutePath, request.IsActive);
                return Ok(ws);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpDelete("workspaces/{id}")]
        public async Task<IActionResult> DeleteWorkspace(Guid id)
        {
            try
            {
                await _adminUserService.DeleteWorkspaceAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
        }

        [HttpPost("{id}/workspaces")]
        public async Task<IActionResult> SetUserWorkspaces(Guid id, [FromBody] SetUserWorkspacesRequest request)
        {
            try
            {
                await _adminUserService.SetUserWorkspaceAccessesAsync(id, request.WorkspaceIds);
                return Ok(new { Message = "User workspace accesses updated successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
        }

        [HttpGet("/api/v1/admin/modalities")]
        public async Task<IActionResult> GetAllModalities()
        {
            var modalities = await _adminUserService.GetAllModalitiesAsync();
            var dtos = new System.Collections.Generic.List<ModalityMasterDto>();
            foreach (var m in modalities)
            {
                dtos.Add(new ModalityMasterDto
                {
                    ModalityId = m.ModalityId,
                    Code = m.Code,
                    Name = m.Name,
                    DepartmentId = m.DepartmentId,
                    DepartmentName = m.DepartmentMaster?.Name ?? string.Empty,
                    IsActive = m.IsActive
                });
            }
            return Ok(dtos);
        }

        [HttpPost("/api/v1/admin/modalities")]
        public async Task<IActionResult> CreateModality([FromBody] CreateModalityRequest request)
        {
            try
            {
                var modality = await _adminUserService.CreateModalityAsync(request.Code, request.Name, request.DepartmentId);
                return Ok(new ModalityMasterDto
                {
                    ModalityId = modality.ModalityId,
                    Code = modality.Code,
                    Name = modality.Name,
                    DepartmentId = modality.DepartmentId,
                    DepartmentName = modality.DepartmentMaster?.Name ?? string.Empty,
                    IsActive = modality.IsActive
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpDelete("/api/v1/admin/modalities/{id}")]
        public async Task<IActionResult> DeleteModality(Guid id)
        {
            try
            {
                await _adminUserService.DeleteModalityAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}
