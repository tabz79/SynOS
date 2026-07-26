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
using SynOS.Models.Enums;

namespace SynOS.Services
{
    public class PurchasingService : IPurchasingService
    {
        private readonly SynOSDbContext _context;
        public PurchasingService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<ImsSupplier> CreateSupplierAsync(SupplierCreateDto dto)
        {
            if (await _context.ImsSuppliers.AnyAsync(s => s.Name == dto.Name))
            {
                throw new InvalidOperationException($"A supplier with the name '{dto.Name}' already exists.");
            }

            var supplier = new ImsSupplier
            {
                SupplierId = Guid.NewGuid(),
                Name = dto.Name,
                ContactInfo = dto.ContactInfo,
                IsActive = true
            };

            await _context.ImsSuppliers.AddAsync(supplier);
            await _context.SaveChangesAsync();
            return supplier;
        }

        public async Task<ImsPurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrderCreateDto dto)
        {
            if (!await _context.ImsSuppliers.AnyAsync(s => s.SupplierId == dto.SupplierId && s.IsActive))
            {
                throw new KeyNotFoundException($"Active supplier with ID '{dto.SupplierId}' not found.");
            }

            var po = new ImsPurchaseOrder
            {
                POId = Guid.NewGuid(),
                SupplierId = dto.SupplierId,
                Status = PurchaseOrderStatus.Draft
            };

            await _context.ImsPurchaseOrders.AddAsync(po);
            await _context.SaveChangesAsync();
            return po;
        }

        public async Task<ImsPOItem> AddPOItemAsync(Guid poId, POItemCreateDto dto)
        {
            var po = await _context.ImsPurchaseOrders.FindAsync(poId);
            if (po == null)
            {
                throw new KeyNotFoundException($"Purchase Order with ID '{poId}' not found.");
            }
            if (po.Status != PurchaseOrderStatus.Draft)
            {
                throw new InvalidOperationException("Items can only be added to a Purchase Order in 'Draft' status.");
            }

            // 1. Try to find the item in the modern Inventory Registry
            var inventoryItem = await _context.ImsInventoryItems.FindAsync(dto.TubeId);
            if (inventoryItem == null)
            {
                throw new KeyNotFoundException($"Inventory item with ID '{dto.TubeId}' not found in the master registry.");
            }

            // 2. Ensure the item exists in ImsTubeMasters to satisfy the legacy DB Foreign Key constraint
            var tubeMaster = await _context.ImsTubeMasters.FindAsync(dto.TubeId);
            if (tubeMaster == null)
            {
                // Auto-shadow the item into the tube master registry for P2P compatibility
                tubeMaster = new ImsTubeMaster
                {
                    TubeId = inventoryItem.ItemId,
                    Code = inventoryItem.ItemCode,
                    Name = inventoryItem.Name,
                    UnitOfMeasure = "units",
                    IsActive = true
                };
                await _context.ImsTubeMasters.AddAsync(tubeMaster);
            }

            var poItem = new ImsPOItem
            {
                POItemId = Guid.NewGuid(),
                POId = poId,
                TubeId = dto.TubeId, 
                OrderedQuantity = dto.OrderedQuantity,
                UnitPrice = dto.UnitPrice,
                TaxRate = dto.TaxRate
            };
            
            await _context.ImsPOItems.AddAsync(poItem);
            await _context.SaveChangesAsync();
            return poItem;
        }

        public async Task<ImsPurchaseOrder> ApprovePurchaseOrderAsync(Guid poId)
        {
            var po = await _context.ImsPurchaseOrders.FindAsync(poId);
            if (po == null)
            {
                throw new KeyNotFoundException($"Purchase Order with ID '{poId}' not found.");
            }
            if (po.Status != PurchaseOrderStatus.Draft)
            {
                throw new InvalidOperationException("Only 'Draft' Purchase Orders can be approved.");
            }

            po.Status = PurchaseOrderStatus.Approved;
            await _context.SaveChangesAsync();
            return po;
        }

        public async Task<ImsInventoryLot> ReceiveStockAsync(Guid poItemId, ReceiveStockDto dto, Guid userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            var poItem = await _context.ImsPOItems
                .Include(pi => pi.PurchaseOrder)
                    .ThenInclude(po => po.Supplier)
                .FirstOrDefaultAsync(pi => pi.POItemId == poItemId);

            if (poItem == null)
            {
                throw new KeyNotFoundException($"Purchase Order Item with ID '{poItemId}' not found.");
            }
            
            var inventoryItem = await _context.ImsInventoryItems.FindAsync(poItem.TubeId);
            if (inventoryItem == null)
            {
                throw new InvalidOperationException("Inventory item master record not found for PO item.");
            }

            if ((poItem.ReceivedQuantity + dto.Quantity) > poItem.OrderedQuantity)
            {
                throw new InvalidOperationException($"Receiving {dto.Quantity} units would exceed the ordered quantity of {poItem.OrderedQuantity}. {poItem.ReceivedQuantity} units have already been received.");
            }

            var newLot = new ImsInventoryLot
            {
                LotId = Guid.NewGuid(),
                ItemId = inventoryItem.ItemId,
                BranchId = dto.BranchId,
                BatchNumber = dto.BatchNumber,
                ExpiryDate = dto.ExpiryDate ?? DateTimeOffset.MaxValue,
                ContainerSize = dto.Quantity,
                CurrentQuantity = dto.Quantity,
                UnitCostSnapshot = poItem.UnitPrice,
                ReceivedAt = DateTimeOffset.UtcNow,
                IsActive = true
            };

            var movement = new ImsStockMovement
            {
                MovementId = Guid.NewGuid(),
                ConsumableId = inventoryItem.ItemId,
                InventoryLotId = newLot.LotId,
                Quantity = (int)dto.Quantity,
                MovementType = StockMovementType.Receive,
                ReferenceType = MovementReferenceType.Manual,
                ReferenceId = poItem.POId.ToString(),
                RecordedByUserId = userId,
                MovedAt = DateTimeOffset.UtcNow
            };

            poItem.ReceivedQuantity += (int)dto.Quantity;
            
            await _context.ImsInventoryLots.AddAsync(newLot);
            await _context.ImsStockMovements.AddAsync(movement);

            // REMOVED: SpendFact emission here to prevent double-counting.
            // A SpendFact is only emitted when the VendorPayable is actually settled.
            var spendAmount = dto.Quantity * poItem.UnitPrice;

            // CREATE VENDOR PAYABLE (Phase 2)
            var vendorPayable = new VendorPayable
            {
                VendorPayableId = Guid.NewGuid(),
                VendorId = poItem.PurchaseOrder?.SupplierId,
                VendorName = poItem.PurchaseOrder?.Supplier?.Name,
                Amount = spendAmount,
                ReferenceType = "PO",
                ReferenceId = poItem.POId,
                Status = VendorPayableStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            await _context.VendorPayables.AddAsync(vendorPayable);

            // CREATE OVERHEAD PAYABLE FACT for Finance Expense Feed
            var overheadPayable = new SynOS.Models.Entities.Payables.OverheadPayableFact
            {
                OverheadPayableId = Guid.NewGuid(),
                Category = SynOS.Models.Enums.Payables.OverheadExpenseCategory.Logistics,
                AmountDue = spendAmount,
                Description = $"Stock Receipt: {inventoryItem.Name} (PO #{poItem.POId.ToString().Substring(0, 8)}) - {poItem.PurchaseOrder?.Supplier?.Name ?? "Supplier"}",
                DueDate = DateTime.UtcNow.AddDays(30),
                Status = VendorPayableStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            await _context.OverheadPayableFacts.AddAsync(overheadPayable);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            
            return newLot;
        }

        public async Task<ImsSupplier> GetSupplierByIdAsync(Guid supplierId)
        {
            var supplier = await _context.ImsSuppliers.FindAsync(supplierId);
            if (supplier == null)
            {
                throw new KeyNotFoundException($"Supplier with ID '{supplierId}' not found.");
            }
            return supplier;
        }

        public async Task<IEnumerable<ImsSupplier>> GetAllSuppliersAsync()
        {
            return await _context.ImsSuppliers.Where(s => s.IsActive).ToListAsync();
        }

        public async Task<ImsPurchaseOrder> GetPurchaseOrderByIdAsync(Guid poId)
        {
            var po = await _context.ImsPurchaseOrders
                .Include(p => p.Supplier)
                .Include(p => p.POItems)
                    .ThenInclude(i => i.Tube)
                .FirstOrDefaultAsync(p => p.POId == poId);

            if (po == null)
            {
                throw new KeyNotFoundException($"Purchase Order with ID '{poId}' not found.");
            }
            return po;
        }

        public async Task<IEnumerable<ImsPurchaseOrder>> GetAllPurchaseOrdersAsync()
        {
            return await _context.ImsPurchaseOrders
                .Include(p => p.Supplier)
                .Include(p => p.POItems)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<ImsPOItem>> GetPurchaseOrderItemsAsync(Guid poId)
        {
            if (!await _context.ImsPurchaseOrders.AnyAsync(p => p.POId == poId))
            {
                throw new KeyNotFoundException($"Purchase Order with ID '{poId}' not found.");
            }
            
            return await _context.ImsPOItems
                .Where(i => i.POId == poId)
                .Include(i => i.Tube)
                .ToListAsync();
        }
    }
}
