using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;

namespace SynOS.Services.Inventory
{
    public class InventoryService : IInventoryService
    {
        private readonly SynOSDbContext _context;

        public InventoryService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<InventoryStockDto>> GetStockLedgerAsync()
        {
            var query = from lot in _context.ImsInventoryLots
                        join item in _context.ImsInventoryItems on lot.ItemId equals item.ItemId
                        join branch in _context.Branches on lot.BranchId equals branch.BranchId
                        join consumable in _context.ImsConsumables on item.ItemCode equals consumable.Code into metaJoin
                        from meta in metaJoin.DefaultIfEmpty()
                        where lot.IsActive
                        group lot by new 
                        { 
                            item.ItemId, 
                            item.ItemCode, 
                            ItemName = item.Name, 
                            branch.BranchId, 
                            BranchName = branch.Name, 
                            meta.UnitOfMeasure, 
                            meta.LowStockThreshold 
                        } into g
                        select new InventoryStockDto
                        {
                            ItemId = g.Key.ItemId,
                            ItemName = g.Key.ItemName,
                            ItemCode = g.Key.ItemCode,
                            TotalQuantity = g.Sum(l => l.CurrentQuantity),
                            Unit = g.Key.UnitOfMeasure ?? "units",
                            BranchName = g.Key.BranchName,
                            BranchId = g.Key.BranchId,
                            Status = g.Sum(l => l.CurrentQuantity) <= 0 ? "Critical" :
                                     g.Sum(l => l.CurrentQuantity) <= g.Key.LowStockThreshold ? "Low" : "Healthy"
                        };

            return await query
                .OrderBy(d => d.ItemName)
                .ThenBy(d => d.BranchName)
                .ToListAsync();
        }

        public async Task<IEnumerable<InventoryLotDto>> GetItemLotsAsync(Guid itemId, Guid branchId)
        {
            return await _context.ImsInventoryLots
                .Where(l => l.ItemId == itemId && l.BranchId == branchId && l.IsActive)
                .Select(l => new InventoryLotDto
                {
                    LotId = l.LotId,
                    LotNumber = l.BatchNumber,
                    Quantity = l.CurrentQuantity,
                    ExpiryDate = l.ExpiryDate,
                    ReceivedAt = l.ReceivedAt
                })
                .OrderBy(l => l.ExpiryDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<ImsInventoryItem>> GetItemsAsync()
        {
            return await _context.ImsInventoryItems
                .OrderBy(i => i.Name)
                .ToListAsync();
        }

        public async Task ReceiveStockAsync(ReceiveStockDto dto, Guid recordedByUserId)
        {
            // 1. Create a new Inventory Lot for this receipt
            var lot = new ImsInventoryLot
            {
                LotId = Guid.NewGuid(),
                ItemId = dto.ItemId,
                BatchNumber = dto.BatchNumber,
                CurrentQuantity = dto.Quantity,
                ContainerSize = dto.Quantity,
                UnitCostSnapshot = dto.UnitCost,
                ExpiryDate = dto.ExpiryDate,
                BranchId = dto.BranchId,
                ReceivedAt = DateTimeOffset.UtcNow,
                IsActive = true
            };

            _context.ImsInventoryLots.Add(lot);

            // 2. Log the inbound movement for audit and history
            var movement = new ImsStockMovement
            {
                MovementId = Guid.NewGuid(),
                InventoryLotId = lot.LotId,
                MovementType = StockMovementType.Receive,
                Quantity = (int)dto.Quantity,
                MovedAt = DateTimeOffset.UtcNow,
                RecordedByUserId = recordedByUserId,
                ReferenceType = MovementReferenceType.GRN,
                ReferenceId = lot.LotId.ToString() // Reference the lot we just created
            };

            _context.ImsStockMovements.Add(movement);

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<StockMovementDto>> GetMovementHistoryAsync()
        {
            return await _context.ImsStockMovements
                .Include(m => m.InventoryLot)
                    .ThenInclude(l => l.Item)
                .Include(m => m.InventoryLot)
                    .ThenInclude(l => l.Branch)
                .Include(m => m.RecordedByUser)
                .OrderByDescending(m => m.MovedAt)
                .Take(200)
                .Select(m => new StockMovementDto
                {
                    MovementId = m.MovementId,
                    ItemName = m.InventoryLot != null ? m.InventoryLot.Item.Name : "Legacy Consumable",
                    ItemCode = m.InventoryLot != null ? m.InventoryLot.Item.ItemCode : "N/A",
                    LotNumber = m.InventoryLot != null ? m.InventoryLot.BatchNumber : "N/A",
                    MovementType = m.MovementType.ToString(),
                    Quantity = m.Quantity,
                    BranchName = m.InventoryLot != null ? m.InventoryLot.Branch.Name : "Main Laboratory",
                    RecordedBy = m.RecordedByUser != null ? m.RecordedByUser.Name : "System",
                    MovedAt = m.MovedAt,
                    Reference = m.ReferenceType.HasValue ? $"{m.ReferenceType}: {m.ReferenceId}" : "Manual"
                })
                .ToListAsync();
        }

        public async Task<InventoryDashboardDto> GetDashboardMetricsAsync()
        {
            var today = DateTimeOffset.UtcNow.Date;

            var pendingRequests = await _context.ImsStockRequests
                .CountAsync(r => r.Status == ImsRequestStatus.Pending);

            var fulfilledToday = await _context.ImsStockRequests
                .CountAsync(r => r.Status == ImsRequestStatus.Fulfilled && r.FulfilledAt >= today);

            var ledger = await GetStockLedgerAsync();
            var totalItems = ledger.Count();
            var criticalCount = ledger.Count(s => s.Status == "Critical");
            var lowCount = ledger.Count(s => s.Status == "Low");

            return new InventoryDashboardDto
            {
                PendingRequestsCount = pendingRequests,
                FulfilledTodayCount = fulfilledToday,
                TotalStockItems = totalItems,
                CriticalStockCount = criticalCount,
                LowStockCount = lowCount
            };
        }
    }
}
