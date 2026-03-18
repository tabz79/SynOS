using System;

namespace SynOS.Services.Security
{
    public interface IUserContext
    {
        Guid CurrentUserId { get; }
        Guid CurrentBranchId { get; }
        Guid CurrentSessionId { get; } // ADDED for Option A Phase 1A
        string CurrentRole { get; }
        string CurrentMode { get; } // ADDED for Phase 1B
        string UserName { get; }
        string DepartmentCode { get; } // ADDED for Department Workbench
        bool IsAuthenticated { get; }
    }
}
