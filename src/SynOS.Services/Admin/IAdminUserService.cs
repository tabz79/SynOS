using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services.Admin
{
    public interface IAdminUserService
    {
        Task<User> CreateUserAsync(string username, string email, string name, string password, string? designation = null);
        Task SetUserStatusAsync(Guid userId, bool isActive);
        Task AssignBranchRoleAsync(Guid userId, Guid branchId, Guid? roleId, string? roleName = null);
        Task RemoveBranchRoleAsync(Guid userId, Guid branchId, Guid roleId);
        Task<IEnumerable<UserAdminDto>> GetAllUsersAsync();
        Task<IEnumerable<BranchDto>> GetAllBranchesAsync();
        Task<IEnumerable<RoleDto>> GetAllRolesAsync();
        Task<IEnumerable<OperationalResourceDto>> GetOperationalResourcesAsync();
        Task UpdateOperationalResourceAsync(Guid resourceId, string departmentCode);
        Task SyncOperationalResourcesAsync();
        Task UpdateUserAsync(Guid userId, string name, string username, string email, string? designation, bool isActive, string departmentCode);
        Task ResetPasswordAsync(Guid userId, string newPassword);
        Task<IEnumerable<DepartmentMaster>> GetAllDepartmentsAsync();
        Task<DepartmentMaster> CreateDepartmentAsync(string code, string name, string? macroDepartment = null);
        Task<DepartmentMaster> UpdateDepartmentAsync(Guid departmentId, string name, string? macroDepartment, bool isActive);
        Task DeleteDepartmentAsync(Guid departmentId);
        Task<IEnumerable<Workspace>> GetWorkspacesAsync();
        Task<Workspace> CreateWorkspaceAsync(string name, string routePath);
        Task<Workspace> UpdateWorkspaceAsync(Guid workspaceId, string name, string routePath, bool isActive);
        Task DeleteWorkspaceAsync(Guid workspaceId);
        Task SetUserWorkspaceAccessesAsync(Guid userId, IEnumerable<Guid> workspaceIds);
        Task<Branch> CreateBranchAsync(string code, string name);
        Task<Branch> UpdateBranchAsync(Guid branchId, string code, string name, bool isActive);
        Task DeleteBranchAsync(Guid branchId);
    }

    public class OperationalResourceDto
    {
        public Guid OperationalResourceId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string DepartmentCode { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class BranchDto
    {
        public Guid BranchId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class RoleDto
    {
        public Guid RoleId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class UserAdminDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public string? SignatureImageUrl { get; set; }
        public string? DepartmentCode { get; set; }
        public bool IsActive { get; set; }
        public List<BranchRoleDto> BranchRoles { get; set; } = new List<BranchRoleDto>();
        public List<Guid> WorkspaceIds { get; set; } = new List<Guid>();
    }

    public class BranchRoleDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
    }
}
