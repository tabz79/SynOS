using System;

namespace SynOS.Models.DTOs.Admin
{
    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Designation { get; set; }
    }

    public class UpdateUserRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public bool IsActive { get; set; }
        public string DepartmentCode { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Password { get; set; } = string.Empty;
    }

    public class SetUserStatusRequest
    {
        public bool IsActive { get; set; }
    }

    public class AssignBranchRoleRequest
    {
        public Guid BranchId { get; set; }
        public Guid? RoleId { get; set; }
        public string? RoleName { get; set; }
    }

    public class CreateDepartmentRequest
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? MacroDepartment { get; set; }
    }

    public class UpdateDepartmentRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? MacroDepartment { get; set; }
        public bool IsActive { get; set; }
    }

    public class WorkspaceDto
    {
        public Guid WorkspaceId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string RoutePath { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class CreateWorkspaceRequest
    {
        public string Name { get; set; } = string.Empty;
        public string RoutePath { get; set; } = string.Empty;
    }

    public class UpdateWorkspaceRequest
    {
        public string Name { get; set; } = string.Empty;
        public string RoutePath { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class SetUserWorkspacesRequest
    {
        public System.Collections.Generic.List<Guid> WorkspaceIds { get; set; } = new System.Collections.Generic.List<Guid>();
    }

    public class CreateBranchRequest
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
    }

    public class UpdateBranchRequest
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
    }
}
