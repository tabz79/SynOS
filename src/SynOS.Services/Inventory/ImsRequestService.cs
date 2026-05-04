using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;

namespace SynOS.Services.Inventory
{
    public class ImsRequestService : IImsRequestService
    {
        private readonly SynOSDbContext _context;

        public ImsRequestService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ConsumableSummaryDto>> GetAllowedItemsForRoleAsync(Guid roleId)
        {
            return await _context.ImsRoleItemMaps
                .Where(m => m.RoleId == roleId)
                .Include(m => m.Consumable)
                .Select(m => new ConsumableSummaryDto
                {
                    ConsumableId = m.ConsumableId,
                    Code = m.Consumable.Code,
                    Name = m.Consumable.Name,
                    Category = m.Consumable.Category.ToString(),
                    UnitOfMeasure = m.Consumable.UnitOfMeasure,
                    LowStockThreshold = m.Consumable.LowStockThreshold,
                    IsActive = m.Consumable.IsActive
                })
                .ToListAsync();
        }

        public async Task AddMappingAsync(Guid roleId, Guid consumableId)
        {
            var exists = await _context.ImsRoleItemMaps.AnyAsync(m => m.RoleId == roleId && m.ConsumableId == consumableId);
            if (exists) return;

            _context.ImsRoleItemMaps.Add(new ImsRoleItemMap
            {
                RoleId = roleId,
                ConsumableId = consumableId
            });
            await _context.SaveChangesAsync();
        }

        public async Task RemoveMappingAsync(Guid roleId, Guid consumableId)
        {
            var map = await _context.ImsRoleItemMaps.FirstOrDefaultAsync(m => m.RoleId == roleId && m.ConsumableId == consumableId);
            if (map == null) return;

            _context.ImsRoleItemMaps.Remove(map);
            await _context.SaveChangesAsync();
        }

        public async Task<Guid> CreateRequestAsync(CreateStockRequestDto dto, Guid requestedByUserId)
        {
            var request = new ImsStockRequest
            {
                RequestId = Guid.NewGuid(),
                ConsumableId = dto.ConsumableId,
                Quantity = dto.Quantity,
                BranchId = dto.BranchId,
                RequestedByUserId = requestedByUserId,
                RequestedAt = DateTimeOffset.UtcNow,
                Status = ImsRequestStatus.Pending
            };

            _context.ImsStockRequests.Add(request);
            await _context.SaveChangesAsync();

            return request.RequestId;
        }

        public async Task<IEnumerable<StockRequestSummaryDto>> GetPendingRequestsAsync(Guid branchId)
        {
            return await _context.ImsStockRequests
                .Include(r => r.Consumable)
                .Include(r => r.RequestedByUser)
                .Include(r => r.Branch)
                .Where(r => r.BranchId == branchId && r.Status == ImsRequestStatus.Pending)
                .Select(r => new StockRequestSummaryDto
                {
                    RequestId = r.RequestId,
                    ConsumableId = r.ConsumableId,
                    ConsumableName = r.Consumable.Name,
                    UnitOfMeasure = r.Consumable.UnitOfMeasure,
                    Quantity = r.Quantity,
                    BranchId = r.BranchId,
                    BranchName = r.Branch.Name,
                    RequestedByUserId = r.RequestedByUserId,
                    RequestedByUserName = r.RequestedByUser.Name,
                    RequestedAt = r.RequestedAt,
                    Status = r.Status
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<StockRequestSummaryDto>> GetAllPendingRequestsAsync()
        {
            return await _context.ImsStockRequests
                .Include(r => r.Consumable)
                .Include(r => r.RequestedByUser)
                .Include(r => r.Branch)
                .Where(r => r.Status == ImsRequestStatus.Pending)
                .Select(r => new StockRequestSummaryDto
                {
                    RequestId = r.RequestId,
                    ConsumableId = r.ConsumableId,
                    ConsumableName = r.Consumable.Name,
                    UnitOfMeasure = r.Consumable.UnitOfMeasure,
                    Quantity = r.Quantity,
                    BranchId = r.BranchId,
                    BranchName = r.Branch.Name,
                    RequestedByUserId = r.RequestedByUserId,
                    RequestedByUserName = r.RequestedByUser.Name,
                    RequestedAt = r.RequestedAt,
                    Status = r.Status
                })
                .ToListAsync();
        }

        public async Task FulfillRequestAsync(Guid requestId, Guid adminUserId)
        {
            var request = await _context.ImsStockRequests
                .Include(r => r.Consumable)
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null) throw new KeyNotFoundException("Request not found");
            if (request.Status != ImsRequestStatus.Pending) throw new InvalidOperationException("Request is not pending");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Mark request as fulfilled
                request.Status = ImsRequestStatus.Fulfilled;
                request.FulfilledByUserId = adminUserId;
                request.FulfilledAt = DateTimeOffset.UtcNow;

                // 2. Find the associated Inventory Item for this consumable
                var inventoryItem = await _context.ImsInventoryItems
                    .FirstOrDefaultAsync(i => i.ItemCode == request.Consumable.Code);

                if (inventoryItem == null)
                {
                    throw new InvalidOperationException($"No Inventory Item found with code {request.Consumable.Code}");
                }

                // 3. Find active lots for this item in the specific branch
                var activeLots = await _context.ImsInventoryLots
                    .Where(l => l.ItemId == inventoryItem.ItemId && l.BranchId == request.BranchId && l.IsActive && l.CurrentQuantity > 0)
                    .OrderBy(l => l.ExpiryDate) // FIFO by expiry
                    .ToListAsync();

                if (activeLots.Sum(l => l.CurrentQuantity) < request.Quantity)
                {
                    throw new InvalidOperationException("Insufficient stock in branch to fulfill request");
                }

                int remainingToDeduct = request.Quantity;

                foreach (var lot in activeLots)
                {
                    if (remainingToDeduct <= 0) break;

                    int deduction = (int)Math.Min((decimal)remainingToDeduct, lot.CurrentQuantity);
                    lot.CurrentQuantity -= deduction;
                    remainingToDeduct -= deduction;

                    // 4. Log the movement as RequestFulfillment
                    // Using the new InventoryLotId field for enterprise-grade traceability
                    var movement = new ImsStockMovement
                    {
                        MovementId = Guid.NewGuid(),
                        ConsumableId = request.ConsumableId,
                        InventoryLotId = lot.LotId, // Correctly linked to the new system
                        ConsumableLotId = null,      // Legacy field
                        Quantity = deduction,
                        MovementType = StockMovementType.RequestFulfillment,
                        ReferenceType = MovementReferenceType.StockRequest,
                        ReferenceId = request.RequestId.ToString(),
                        RecordedByUserId = adminUserId,
                        MovedAt = DateTimeOffset.UtcNow
                    };
                    _context.ImsStockMovements.Add(movement);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task IgnoreRequestAsync(Guid requestId)
        {
            var request = await _context.ImsStockRequests.FindAsync(requestId);
            if (request == null) throw new KeyNotFoundException("Request not found");
            
            request.Status = ImsRequestStatus.Ignored;
            await _context.SaveChangesAsync();
        }
    }
}
