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
                var branch = await _context.Branches.FirstOrDefaultAsync(b => b.BranchId == branchId.Value);
                var branchName = branch?.Name ?? "Branch";

                var query = from item in _context.ImsInventoryItems
                            join consumable in _context.ImsConsumables on item.ItemCode equals consumable.Code into metaJoin
                            from meta in metaJoin.DefaultIfEmpty()
                            join lot in _context.ImsInventoryLots.Where(l => l.IsActive && l.BranchId == branchId.Value) on item.ItemId equals lot.ItemId into lotJoin
                            from lot in lotJoin.DefaultIfEmpty()
                            group lot by new 
                            { 
                                item.ItemId, 
                                item.ItemCode, 
                                ItemName = item.Name, 
                                item.ServiceArea,
                                item.Modality,
                                meta.UnitOfMeasure, 
                                meta.LowStockThreshold,
                                meta.Category
                            } into g
                            select new InventoryStockDto
                            {
                                ItemId = g.Key.ItemId,
                                ItemName = g.Key.ItemName,
                                ItemCode = g.Key.ItemCode,
                                TotalQuantity = g.Sum(l => l != null ? l.CurrentQuantity : 0),
                                Unit = g.Key.UnitOfMeasure ?? "PCS",
                                BranchName = branchName,
                                BranchId = branchId.Value,
                                Category = g.Key.Category ?? "General",
                                ServiceArea = g.Key.ServiceArea ?? "Laboratory",
                                Modality = g.Key.Modality,
                                Status = g.Sum(l => l != null ? l.CurrentQuantity : 0) <= 0 ? "Critical" :
                                         g.Sum(l => l != null ? l.CurrentQuantity : 0) <= g.Key.LowStockThreshold ? "Low" : "Healthy"
                            };

                return await query
                    .OrderBy(d => d.ItemName)
                    .ToListAsync();
            }
            else
            {
                var emptyGuid = Guid.Empty;
                var query = from item in _context.ImsInventoryItems
                            join consumable in _context.ImsConsumables on item.ItemCode equals consumable.Code into metaJoin
                            from meta in metaJoin.DefaultIfEmpty()
                            join lot in _context.ImsInventoryLots.Where(l => l.IsActive) on item.ItemId equals lot.ItemId into lotJoin
                            from lot in lotJoin.DefaultIfEmpty()
                            group lot by new 
                            { 
                                item.ItemId, 
                                item.ItemCode, 
                                ItemName = item.Name, 
                                item.ServiceArea,
                                item.Modality,
                                meta.UnitOfMeasure, 
                                meta.LowStockThreshold,
                                meta.Category
                            } into g
                            select new InventoryStockDto
                            {
                                ItemId = g.Key.ItemId,
                                ItemName = g.Key.ItemName,
                                ItemCode = g.Key.ItemCode,
                                TotalQuantity = g.Sum(l => l != null ? l.CurrentQuantity : 0),
                                Unit = g.Key.UnitOfMeasure ?? "PCS",
                                BranchName = "All Branches",
                                BranchId = emptyGuid,
                                Category = g.Key.Category ?? "General",
                                ServiceArea = g.Key.ServiceArea ?? "Laboratory",
                                Modality = g.Key.Modality,
                                Status = g.Sum(l => l != null ? l.CurrentQuantity : 0) <= 0 ? "Critical" :
                                         g.Sum(l => l != null ? l.CurrentQuantity : 0) <= g.Key.LowStockThreshold ? "Low" : "Healthy"
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
                ImsPOItem? poItem = null;
                ImsPurchaseOrder? purchaseOrder = null;

                if (dto.POItemId.HasValue)
                {
                    poItem = await _context.ImsPOItems
                        .Include(pi => pi.PurchaseOrder)
                            .ThenInclude(po => po.Supplier)
                        .FirstOrDefaultAsync(pi => pi.POItemId == dto.POItemId.Value);
                }
                else if (dto.POId.HasValue)
                {
                    poItem = await _context.ImsPOItems
                        .Include(pi => pi.PurchaseOrder)
                            .ThenInclude(po => po.Supplier)
                        .FirstOrDefaultAsync(pi => pi.POId == dto.POId.Value && pi.TubeId == dto.ItemId);
                }

                if (poItem != null)
                {
                    purchaseOrder = poItem.PurchaseOrder;
                    poItem.ReceivedQuantity += (int)dto.Quantity;
                }

                var supplierId = dto.SupplierId ?? purchaseOrder?.SupplierId;
                var unitCost = dto.UnitCost > 0 ? dto.UnitCost : (poItem?.UnitPrice ?? 0);

                // 1. Create a new Inventory Lot for this receipt
                var lot = new ImsInventoryLot
                {
                    LotId = Guid.NewGuid(),
                    ItemId = dto.ItemId,
                    BatchNumber = dto.BatchNumber,
                    CurrentQuantity = dto.Quantity,
                    ContainerSize = dto.Quantity,
                    UnitCostSnapshot = unitCost,
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
                    ReferenceId = purchaseOrder != null ? purchaseOrder.POId.ToString() : lot.LotId.ToString()
                };

                _context.ImsStockMovements.Add(movement);

                // 3. CREATE VENDOR PAYABLE (Bridge to Finance)
                if (supplierId.HasValue && unitCost > 0)
                {
                    var supplierName = purchaseOrder?.Supplier?.Name;
                    if (string.IsNullOrEmpty(supplierName))
                    {
                        var supplier = await _context.ImsSuppliers.FindAsync(supplierId.Value);
                        supplierName = supplier?.Name ?? "Unknown Supplier";
                    }

                    var totalAmount = dto.Quantity * unitCost;

                    var vendorPayable = new VendorPayable
                    {
                        VendorPayableId = Guid.NewGuid(),
                        VendorId = supplierId,
                        VendorName = supplierName,
                        Amount = totalAmount,
                        ReferenceType = purchaseOrder != null ? "PO" : "MANUAL-GRN",
                        ReferenceId = purchaseOrder?.POId ?? lot.LotId,
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
                Name = dto.Name,
                ServiceArea = string.IsNullOrWhiteSpace(dto.ServiceArea) ? "Laboratory" : dto.ServiceArea,
                Modality = string.IsNullOrWhiteSpace(dto.Modality) ? null : dto.Modality
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
