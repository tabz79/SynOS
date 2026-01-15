using System;

namespace SynOS.Services.Security
{
    public interface IUserContext
    {
        Guid CurrentUserId { get; }
        Guid CurrentBranchId { get; }
        string CurrentRole { get; }
        bool IsAuthenticated { get; }
    }
}
