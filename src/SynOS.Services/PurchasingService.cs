using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Services.SpendEngine;
using SynOS.Models.Enums;

namespace SynOS.Services
{
    public class PurchasingService : IPurchasingService
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;

        public PurchasingService(SynOSDbContext context, ISpendFactWriter spendFactWriter)
        {
            _context = context;
            _spendFactWriter = spendFactWriter;
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

            // This now needs to check against Consumables
            var consumable = await _context.ImsConsumables.FirstOrDefaultAsync(c => c.LegacyTubeId == dto.TubeId && c.IsActive);
            if (consumable == null)
            {
                throw new KeyNotFoundException($"Active consumable for legacy tube ID '{dto.TubeId}' not found.");
            }

            var poItem = new ImsPOItem
            {
                POItemId = Guid.NewGuid(),
                POId = poId,
                TubeId = dto.TubeId, // Keep legacy TubeId for now
                OrderedQuantity = dto.OrderedQuantity,
                UnitPrice = dto.UnitPrice,
                TaxRate = dto.TaxRate
            };
            
            await _context.ImsPOItems.AddAsync(poItem);
            await _context.SaveChangesAsync();
            return poItem;
        }

        public async Task<ImsConsumableLot> ReceiveStockAsync(Guid poItemId, ReceiveStockDto dto, Guid userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            var poItem = await _context.ImsPOItems.FindAsync(poItemId);
            if (poItem == null)
            {
                throw new KeyNotFoundException($"Purchase Order Item with ID '{poItemId}' not found.");
            }
            
            var consumable = await _context.ImsConsumables.FirstOrDefaultAsync(c => c.LegacyTubeId == poItem.TubeId);
            if (consumable == null)
            {
                throw new InvalidOperationException($"Could not find a matching Consumable for the legacy TubeId '{poItem.TubeId}' on POItem '{poItemId}'.");
            }

            if ((poItem.ReceivedQuantity + dto.Quantity) > poItem.OrderedQuantity)
            {
                throw new InvalidOperationException($"Receiving {dto.Quantity} units would exceed the ordered quantity of {poItem.OrderedQuantity}. {poItem.ReceivedQuantity} units have already been received.");
            }

            var newLot = new ImsConsumableLot
            {
                LotId = Guid.NewGuid(),
                ConsumableId = consumable.ConsumableId,
                BranchId = dto.BranchId,
                BatchNumber = dto.BatchNumber,
                ExpiryDate = dto.ExpiryDate ?? DateTimeOffset.MaxValue,
                Quantity = (int)dto.Quantity,
                ReceivedAt = DateTimeOffset.UtcNow,
                IsActive = true,
                CostPerUnit = poItem.UnitPrice
            };

            var movement = new ImsStockMovement
            {
                MovementId = Guid.NewGuid(),
                ConsumableId = consumable.ConsumableId,
                ConsumableLotId = newLot.LotId,
                Quantity = newLot.Quantity,
                MovementType = StockMovementType.Receive,
                ReferenceType = MovementReferenceType.Manual,
                ReferenceId = poItem.POId.ToString(),
                RecordedByUserId = userId,
                MovedAt = DateTimeOffset.UtcNow
            };

            poItem.ReceivedQuantity += (int)dto.Quantity;
            
            await _context.ImsConsumableLots.AddAsync(newLot);
            await _context.ImsStockMovements.AddAsync(movement);

            // EMIT SPEND FACT (Revised Plan Fix)
            var spendAmount = dto.Quantity * poItem.UnitPrice;
            var spendFact = new SpendFact(
                Guid.NewGuid(),
                Guid.Empty, // No specific PayeeId available here, could be SupplierId if mapped
                spendAmount,
                "INR",
                PaymentMethod.BankTransfer,
                poItem.POId.ToString(),
                DateTime.UtcNow,
                DateTime.UtcNow,
                "IMS-PURCHASING",
                "IMS",
                Guid.Empty,
                Guid.Empty,
                Guid.Empty
            );
            await _spendFactWriter.CreateSpendFactAsync(spendFact);

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
