using System;
using System.Threading.Tasks;

namespace SynOS.Services.Governance
{
    public interface IAuthorizationService
    {
        Task<bool> HasCapabilityAsync(Guid userId, string capabilityName);
        Task<bool> IsApprovalRequiredAsync(string actionName, decimal amount);
        Task<bool> CanApproveAsync(Guid userId, string actionName, decimal amount);
    }
}
