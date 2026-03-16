using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services.Admin
{
    public interface IAdminUserService
    {
        Task<User> CreateUserAsync(string email, string name, string password);
        Task SetUserStatusAsync(Guid userId, bool isActive);
        Task AssignBranchRoleAsync(Guid userId, Guid branchId, Guid? roleId, string? roleName = null);
        Task RemoveBranchRoleAsync(Guid userId, Guid branchId, Guid roleId);
        Task<IEnumerable<UserAdminDto>> GetAllUsersAsync();
        Task<IEnumerable<BranchDto>> GetAllBranchesAsync();
        Task<IEnumerable<RoleDto>> GetAllRolesAsync();
    }

    public class BranchDto
    {
        public Guid BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class RoleDto
    {
        public Guid RoleId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class UserAdminDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public List<BranchRoleDto> BranchRoles { get; set; } = new List<BranchRoleDto>();
    }

    public class BranchRoleDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
    }
}
