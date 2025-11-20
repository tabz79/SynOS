using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class EditLockService : IEditLockService
    {
        private readonly SynOSDbContext _context;

        public EditLockService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<(AcquireLockResponseDto, LockedByInfo)> AcquireLockAsync(string entityType, Guid entityId, Guid userId)
        {
            if (string.IsNullOrWhiteSpace(entityType))
                throw new ArgumentException(nameof(entityType));

            var now = DateTimeOffset.UtcNow;

            // 1) Look for an existing active, non-expired lock for this entity
            var existingLock = await _context.EditLocks
                .Include(l => l.LockedBy)
                .FirstOrDefaultAsync(l =>
                    l.EntityType == entityType &&
                    l.EntityId == entityId &&
                    l.Status == EditLockStatus.Active &&
                    l.ExpiresAt > now);

            if (existingLock != null)
            {
                // If the existing lock belongs to the same user, refresh it
                if (existingLock.LockedByUserId == userId)
                {
                    existingLock.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(5);
                    await _context.SaveChangesAsync();

                    return (new AcquireLockResponseDto { LockId = existingLock.LockId, ExpiresAt = existingLock.ExpiresAt }, null);
                }

                // Active lock by another user
                var lockedByInfo = new LockedByInfo
                {
                    Name = existingLock.LockedBy?.Name,
                    ExpiresAt = existingLock.ExpiresAt
                };
                return (null, lockedByInfo);
            }

            // 2) No active lock found - create one in a transaction to avoid races
            using (var tx = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // Double-check inside transaction in case another thread created it
                    var existingTx = await _context.EditLocks
                        .Include(l => l.LockedBy)
                        .Where(l =>
                            l.EntityType == entityType &&
                            l.EntityId == entityId &&
                            l.Status == EditLockStatus.Active &&
                            l.ExpiresAt > now)
                        .FirstOrDefaultAsync();

                    if (existingTx != null)
                    {
                        var lockedBy = new LockedByInfo
                        {
                            Name = existingTx.LockedBy?.Name,
                            ExpiresAt = existingTx.ExpiresAt
                        };

                        await tx.RollbackAsync();
                        return (null, lockedBy);
                    }

                    // Create the lock entity
                    var newLock = new EditLock
                    {
                        LockId = Guid.NewGuid(),
                        EntityType = entityType,
                        EntityId = entityId,
                        LockedByUserId = userId,
                        LockedAt = now,
                        ExpiresAt = now.AddMinutes(5),
                        Status = EditLockStatus.Active
                    };

                    _context.EditLocks.Add(newLock);
                    await _context.SaveChangesAsync();

                    await tx.CommitAsync();

                    var response = new AcquireLockResponseDto
                    {
                        LockId = newLock.LockId,
                        ExpiresAt = newLock.ExpiresAt
                    };

                    return (response, null);
                }
                catch (DbUpdateException)
                {
                    // Likely a unique index race — find existing active lock and return conflict
                    await tx.RollbackAsync();

                    var existingAfter = await _context.EditLocks
                        .Include(l => l.LockedBy)
                        .Where(l =>
                            l.EntityType == entityType &&
                            l.EntityId == entityId &&
                            l.Status == EditLockStatus.Active &&
                            l.ExpiresAt > now)
                        .FirstOrDefaultAsync();

                    if (existingAfter != null)
                    {
                        var lockedBy = new LockedByInfo
                        {
                            Name = existingAfter.LockedBy?.Name,
                            ExpiresAt = existingAfter.ExpiresAt
                        };

                        return (null, lockedBy);
                    }

                    // Unknown DB error — rethrow to let higher layers log/handle it
                    throw;
                }
            }
        }

        public async Task<bool> ReleaseLockAsync(Guid lockId, Guid userId)
        {
            var editLock = await _context.EditLocks.FirstOrDefaultAsync(l => l.LockId == lockId);

            if (editLock == null || editLock.LockedByUserId != userId)
            {
                // Lock not found or user is not the owner
                return false;
            }

            if (editLock.Status != EditLockStatus.Active)
            {
                // Lock is not active
                return false;
            }

            editLock.Status = EditLockStatus.Released;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<LockStatusDto> GetLockStatusAsync(string entityType, Guid entityId)
        {
            var now = DateTimeOffset.UtcNow;

            var existingLock = await _context.EditLocks
                .Include(l => l.LockedBy)
                .FirstOrDefaultAsync(l =>
                    l.EntityType == entityType &&
                    l.EntityId == entityId &&
                    l.Status == EditLockStatus.Active &&
                    l.ExpiresAt > now);

            if (existingLock != null)
            {
                return new LockStatusDto
                {
                    IsLocked = true,
                    LockedBy = new LockedByInfo
                    {
                        Name = existingLock.LockedBy?.Name,
                        ExpiresAt = existingLock.ExpiresAt
                    }
                };
            }

            return new LockStatusDto { IsLocked = false };
        }

        public async Task ExpireLocksAsync()
        {
            var expiredLocks = await _context.EditLocks
                .Where(l => l.Status == EditLockStatus.Active && l.ExpiresAt <= DateTimeOffset.UtcNow)
                .ToListAsync();

            foreach (var editLock in expiredLocks)
            {
                editLock.Status = EditLockStatus.Expired;
            }

            await _context.SaveChangesAsync();
        }
    }
}
