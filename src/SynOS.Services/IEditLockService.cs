using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface IEditLockService
    {
        Task<(AcquireLockResponseDto, LockedByInfo)> AcquireLockAsync(string entityType, Guid entityId, Guid userId);
        Task<bool> ReleaseLockAsync(Guid lockId, Guid userId);
        Task<LockStatusDto> GetLockStatusAsync(string entityType, Guid entityId);
        Task ExpireLocksAsync();
    }
}
