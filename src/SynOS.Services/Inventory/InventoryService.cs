using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Enums.Payables;

namespace SynOS.Services.Inventory
{
    public class InventoryService : IInventoryService
    {
        private readonly SynOSDbContext _context;

        public InventoryService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<InventoryStockDto>> GetStockLedgerAsync(Guid? branchId = null)
        {
            if (branchId.HasValue)
            {
                var query = from lot in _context.ImsInventoryLots
                            join item in _context.ImsInventoryItems on lot.ItemId equals item.ItemId
                            join branch in _context.Branches on lot.BranchId equals branch.BranchId
                            join consumable in _context.ImsConsumables on item.ItemCode equals consumable.Code into metaJoin
                            from meta in metaJoin.DefaultIfEmpty()
                            where lot.IsActive && lot.BranchId == branchId.Value
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
                    .ToListAsync();
            }
            else
            {
                var query = from lot in _context.ImsInventoryLots
                            join item in _context.ImsInventoryItems on lot.ItemId equals item.ItemId
                            join consumable in _context.ImsConsumables on item.ItemCode equals consumable.Code into metaJoin
                            from meta in metaJoin.DefaultIfEmpty()
                            where lot.IsActive
                            group lot by new 
                            { 
                                item.ItemId, 
                                item.ItemCode, 
                                ItemName = item.Name, 
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
                                BranchName = "All Branches",
                                BranchId = Guid.Empty,
                                Status = g.Sum(l => l.CurrentQuantity) <= 0 ? "Critical" :
                                         g.Sum(l => l.CurrentQuantity) <= g.Key.LowStockThreshold ? "Low" : "Healthy"
                            };

                return await query
                    .OrderBy(d => d.ItemName)
                    .ToListAsync();
            }
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
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
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

                // 3. CREATE VENDOR PAYABLE (Bridge to Finance)
                if (dto.SupplierId.HasValue && dto.UnitCost > 0)
                {
                    var supplier = await _context.ImsSuppliers.FindAsync(dto.SupplierId.Value);
                    var totalAmount = dto.Quantity * dto.UnitCost;

                    var vendorPayable = new VendorPayable
                    {
                        VendorPayableId = Guid.NewGuid(),
                        VendorId = dto.SupplierId,
                        VendorName = supplier?.Name ?? "Unknown Supplier",
                        Amount = totalAmount,
                        ReferenceType = "MANUAL-GRN",
                        ReferenceId = lot.LotId,
                        Status = VendorPayableStatus.Pending,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.VendorPayables.AddAsync(vendorPayable);
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

        public async Task<InventoryDashboardDto> GetDashboardMetricsAsync(Guid? branchId = null)
        {
            var today = DateTimeOffset.UtcNow.Date;

            var pendingRequestsQuery = _context.ImsStockRequests.AsNoTracking().Where(r => r.Status == ImsRequestStatus.Pending);
            var fulfilledTodayQuery = _context.ImsStockRequests.AsNoTracking().Where(r => r.Status == ImsRequestStatus.Fulfilled && r.FulfilledAt >= today);

            if (branchId.HasValue)
            {
                pendingRequestsQuery = pendingRequestsQuery.Where(r => r.BranchId == branchId.Value);
                fulfilledTodayQuery = fulfilledTodayQuery.Where(r => r.BranchId == branchId.Value);
            }

            var pendingRequests = await pendingRequestsQuery.CountAsync();
            var fulfilledToday = await fulfilledTodayQuery.CountAsync();

            var ledger = await GetStockLedgerAsync(branchId);
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

        public async Task CreateOpeningStockEntryAsync(OpeningStockDto dto, Guid recordedByUserId)
        {
            // 1. Create the new Inventory Lot
            var lot = new ImsInventoryLot
            {
                LotId = Guid.NewGuid(),
                ItemId = dto.ConsumableId, // ConsumableId in DTO maps to ItemId in Lot
                BatchNumber = string.IsNullOrWhiteSpace(dto.BatchNumber) ? "OPEN-BAL" : dto.BatchNumber,
                CurrentQuantity = dto.Quantity,
                ContainerSize = dto.Quantity,
                UnitCostSnapshot = 0, // Opening balance usually doesn't capture cost in simple flows
                ExpiryDate = dto.ExpiryDate,
                BranchId = dto.BranchId,
                ReceivedAt = DateTimeOffset.UtcNow,
                IsActive = true
            };

            _context.ImsInventoryLots.Add(lot);

            // 2. Log as OpeningBalance movement
            var movement = new ImsStockMovement
            {
                MovementId = Guid.NewGuid(),
                InventoryLotId = lot.LotId,
                MovementType = StockMovementType.OpeningBalance,
                Quantity = (int)dto.Quantity,
                MovedAt = DateTimeOffset.UtcNow,
                RecordedByUserId = recordedByUserId,
                ReferenceType = MovementReferenceType.Other,
                ReferenceId = "Initial Onboarding"
            };

            _context.ImsStockMovements.Add(movement);

            await _context.SaveChangesAsync();
        }

        public async Task CreateOpeningStockBulkAsync(IEnumerable<OpeningStockDto> entries, Guid recordedByUserId)
        {
            foreach (var entry in entries)
            {
                // We reuse the single logic for consistency, but wrap in a single SaveChanges if needed.
                // For bulk performance with 100s of items, we'll do them in a single transaction.
                var lot = new ImsInventoryLot
                {
                    LotId = Guid.NewGuid(),
                    ItemId = entry.ConsumableId,
                    BatchNumber = string.IsNullOrWhiteSpace(entry.BatchNumber) ? "OPEN-BAL" : entry.BatchNumber,
                    CurrentQuantity = entry.Quantity,
                    ContainerSize = entry.Quantity,
                    ExpiryDate = entry.ExpiryDate,
                    BranchId = entry.BranchId,
                    ReceivedAt = DateTimeOffset.UtcNow,
                    IsActive = true
                };

                _context.ImsInventoryLots.Add(lot);

                var movement = new ImsStockMovement
                {
                    MovementId = Guid.NewGuid(),
                    InventoryLotId = lot.LotId,
                    MovementType = StockMovementType.OpeningBalance,
                    Quantity = (int)entry.Quantity,
                    MovedAt = DateTimeOffset.UtcNow,
                    RecordedByUserId = recordedByUserId,
                    ReferenceType = MovementReferenceType.Other,
                    ReferenceId = "Bulk Onboarding"
                };

                _context.ImsStockMovements.Add(movement);
            }

            await _context.SaveChangesAsync();
        }

        public async Task<ImsInventoryItem> CreateItemAsync(CreateItemDto dto)
        {
            // 1. Create the Abstract Identity
            var item = new ImsInventoryItem
            {
                ItemId = Guid.NewGuid(),
                ItemCode = string.IsNullOrWhiteSpace(dto.ItemCode) ? Guid.NewGuid().ToString().Substring(0, 8).ToUpper() : dto.ItemCode,
                Name = dto.Name
            };

            _context.ImsInventoryItems.Add(item);

            // 2. Create the Consumable Metadata
            var consumable = new ImsConsumable
            {
                ConsumableId = item.ItemId, // Linked by ID
                Code = item.ItemCode,
                Name = item.Name,
                UnitOfMeasure = dto.UnitOfMeasure ?? "units",
                LowStockThreshold = (int)dto.LowStockThreshold,
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "General" : dto.Category,
                IsActive = true
            };

            _context.ImsConsumables.Add(consumable);

            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<IEnumerable<ImsSupplier>> GetSuppliersAsync()
        {
            return await _context.ImsSuppliers
                .Where(s => s.IsActive)
                .OrderBy(s => s.Name)
                .ToListAsync();
        }
    }
}
