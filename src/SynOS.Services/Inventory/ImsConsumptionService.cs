using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;

namespace SynOS.Services.Inventory
{
    public class ImsConsumptionService : IImsConsumptionService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ImsConsumptionService> _logger;

        public ImsConsumptionService(SynOSDbContext context, ILogger<ImsConsumptionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ConsumeForVisitAsync(Guid visitId, Guid userId)
        {
            var visit = await _context.Visits.FindAsync(visitId);
            if (visit == null) return;

            var branchId = visit.BranchId ?? Guid.Empty;
            if (branchId == Guid.Empty) return;

            _logger.LogInformation("IMS Auto-Consumption: Recording Reception stock usage for Visit {Token}", visit.Token);

            // 1. Consume Thermal Receipt Roll (1 unit)
            await ConsumeItemAsync("RCT-RL", 1.00m, branchId, userId, visitId.ToString());

            // 2. Consume Blue Ball Pen (0.05 units per visit)
            await ConsumeItemAsync("PEN-BL", 0.05m, branchId, userId, visitId.ToString());
        }

        public async Task ConsumeForSpecimenAsync(Guid specimenId, Guid userId)
        {
            var specimen = await _context.Specimens
                .Include(s => s.Visit)
                .FirstOrDefaultAsync(s => s.SpecimenId == specimenId);

            if (specimen == null) return;

            var branchId = specimen.Visit?.BranchId ?? Guid.Empty;
            if (branchId == Guid.Empty) return;

            _logger.LogInformation("IMS Auto-Consumption: Recording Phlebotomy stock usage for Specimen {SpecimenId}", specimenId);

            // 1. Consume Syringe 5ml (1 unit)
            await ConsumeItemAsync("SYR-5ML", 1.00m, branchId, userId, specimenId.ToString());

            // 2. Consume Alcohol Swab (1 unit)
            await ConsumeItemAsync("ALC-S", 1.00m, branchId, userId, specimenId.ToString());

            // 3. Consume Gloves Nitro Large (0.02 box units = 1 pair)
            await ConsumeItemAsync("GLV-L", 0.02m, branchId, userId, specimenId.ToString());

            // 4. Consume Cotton Roll (0.05 units)
            await ConsumeItemAsync("CTN-R", 0.05m, branchId, userId, specimenId.ToString());
            
            // 5. Consume Blood Collection Tube (Purple) (1 unit)
            await ConsumeItemAsync("TUBE-EDTA", 1.00m, branchId, userId, specimenId.ToString());
        }

        public async Task ConsumeForTestAsync(Guid orderId, Guid userId)
        {
            var order = await _context.Orders
                .Include(o => o.Visit)
                .Include(o => o.Test)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null) return;

            var branchId = order.Visit?.BranchId ?? Guid.Empty;
            if (branchId == Guid.Empty) return;

            _logger.LogInformation("IMS Auto-Consumption: Recording Test Reagent stock usage for Order {OrderId} (Test: {TestName})", orderId, order.Test?.TestName);

            // Find defined mappings if any
            var mappings = await _context.ImsTestConsumableMaps
                .Where(m => m.TestId == order.TestId)
                .ToListAsync();

            if (mappings.Any())
            {
                foreach (var map in mappings)
                {
                    var consumable = await _context.ImsConsumables.FindAsync(map.ConsumableId);
                    if (consumable != null)
                    {
                        await ConsumeItemAsync(consumable.Code, map.QuantityPerTest, branchId, userId, orderId.ToString());
                    }
                }
            }
            else
            {
                // Fallback generic reagent consumption
                await ConsumeItemAsync("REAGENT-GEN", 1.00m, branchId, userId, orderId.ToString());
            }
        }

        public async Task ConsumeForPrintAsync(Guid visitId, Guid userId)
        {
            var visit = await _context.Visits.FindAsync(visitId);
            if (visit == null) return;

            var branchId = visit.BranchId ?? Guid.Empty;
            if (branchId == Guid.Empty) return;

            _logger.LogInformation("IMS Auto-Consumption: Recording Delivery/Print stock usage for Visit {Token}", visit.Token);

            // 1. Consume Printer Paper A4 (0.002 ream units = 1 sheet)
            await ConsumeItemAsync("PPR-A4", 0.002m, branchId, userId, visitId.ToString());

            // 2. Consume Blue Ball Pen (0.01 units)
            await ConsumeItemAsync("PEN-BL", 0.01m, branchId, userId, visitId.ToString());
        }

        private async Task ConsumeItemAsync(string itemCode, decimal quantity, Guid branchId, Guid userId, string referenceId)
        {
            try
            {
                // 1. Resolve Inventory Item
                var item = await _context.ImsInventoryItems.FirstOrDefaultAsync(i => i.ItemCode == itemCode);
                if (item == null)
                {
                    item = new ImsInventoryItem
                    {
                        ItemId = Guid.NewGuid(),
                        ItemCode = itemCode,
                        Name = itemCode.Replace("-", " ")
                    };
                    _context.ImsInventoryItems.Add(item);
                    await _context.SaveChangesAsync();
                }

                // 2. Resolve Consumable
                var consumable = await _context.ImsConsumables.FirstOrDefaultAsync(c => c.Code == itemCode);
                if (consumable == null)
                {
                    consumable = new ImsConsumable
                    {
                        ConsumableId = Guid.NewGuid(),
                        Code = itemCode,
                        Name = item.Name,
                        Category = "Consumable",
                        UnitOfMeasure = "pcs",
                        LowStockThreshold = 10,
                        IsActive = true
                    };
                    _context.ImsConsumables.Add(consumable);
                    await _context.SaveChangesAsync();
                }

                // 3. Find active lots (IsActive holds only positive lot check, but we query any active lot structure)
                var activeLots = await _context.ImsInventoryLots
                    .Where(l => l.ItemId == item.ItemId && l.BranchId == branchId && l.IsActive && l.CurrentQuantity > 0)
                    .OrderBy(l => l.ExpiryDate)
                    .ToListAsync();

                decimal remainingToDeduct = quantity;

                foreach (var lot in activeLots)
                {
                    if (remainingToDeduct <= 0) break;

                    decimal deduct = Math.Min(lot.CurrentQuantity, remainingToDeduct);
                    lot.CurrentQuantity -= deduct;
                    remainingToDeduct -= deduct;

                    // Log stock movement
                    var movement = new ImsStockMovement
                    {
                        MovementId = Guid.NewGuid(),
                        ConsumableId = consumable.ConsumableId,
                        InventoryLotId = lot.LotId,
                        Quantity = (int)Math.Ceiling(deduct),
                        MovementType = StockMovementType.Consumption,
                        ReferenceType = MovementReferenceType.Sample,
                        ReferenceId = referenceId,
                        RecordedByUserId = userId,
                        MovedAt = DateTimeOffset.UtcNow
                    };
                    _context.ImsStockMovements.Add(movement);
                }

                // If remainingToDeduct > 0 (meaning we have insufficient stock, or no active lots with stock > 0),
                // we allow negative stock!
                if (remainingToDeduct > 0)
                {
                    // Find any active lot (even if 0 or negative) to deduct from, or create a new lot
                    var anyLot = await _context.ImsInventoryLots
                        .FirstOrDefaultAsync(l => l.ItemId == item.ItemId && l.BranchId == branchId && l.IsActive);

                    if (anyLot != null)
                    {
                        anyLot.CurrentQuantity -= remainingToDeduct;

                        var movement = new ImsStockMovement
                        {
                            MovementId = Guid.NewGuid(),
                            ConsumableId = consumable.ConsumableId,
                            InventoryLotId = anyLot.LotId,
                            Quantity = (int)Math.Ceiling(remainingToDeduct),
                            MovementType = StockMovementType.Consumption,
                            ReferenceType = MovementReferenceType.Sample,
                            ReferenceId = referenceId,
                            RecordedByUserId = userId,
                            MovedAt = DateTimeOffset.UtcNow
                        };
                        _context.ImsStockMovements.Add(movement);
                    }
                    else
                    {
                        // No lot exists at all for this item. Create a new negative-quantity lot!
                        var newLot = new ImsInventoryLot
                        {
                            LotId = Guid.NewGuid(),
                            ItemId = item.ItemId,
                            BatchNumber = "AUTO-NEG-" + DateTime.UtcNow.ToString("yyyyMMdd"),
                            CurrentQuantity = -remainingToDeduct,
                            ContainerSize = 1,
                            UnitCostSnapshot = 0.00m,
                            BranchId = branchId,
                            ExpiryDate = DateTimeOffset.UtcNow.AddYears(1),
                            IsActive = true,
                            ReceivedAt = DateTimeOffset.UtcNow
                        };
                        _context.ImsInventoryLots.Add(newLot);

                        var movement = new ImsStockMovement
                        {
                            MovementId = Guid.NewGuid(),
                            ConsumableId = consumable.ConsumableId,
                            InventoryLotId = newLot.LotId,
                            Quantity = (int)Math.Ceiling(remainingToDeduct),
                            MovementType = StockMovementType.Consumption,
                            ReferenceType = MovementReferenceType.Sample,
                            ReferenceId = referenceId,
                            RecordedByUserId = userId,
                            MovedAt = DateTimeOffset.UtcNow
                        };
                        _context.ImsStockMovements.Add(movement);
                    }
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to consume consumable {ItemCode}", itemCode);
            }
        }
    }
}
