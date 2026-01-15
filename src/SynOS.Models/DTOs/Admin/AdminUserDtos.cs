using System;

namespace SynOS.Models.DTOs.Admin
{
    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class SetUserStatusRequest
    {
        public bool IsActive { get; set; }
    }

    public class AssignBranchRoleRequest
    {
        public Guid BranchId { get; set; }
        public Guid RoleId { get; set; }
    }
}
