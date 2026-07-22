using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;
using SynOS.Models.Enums;
using SynOS.Services.Operational;
using SynOS.Models.Entities.CostAttribution;
using SynOS.Services.CostAttribution;
using SynOS.Models.Events.CostAttribution;

namespace SynOS.Services
{
    public class TubeConsumptionService : ITubeConsumptionService
    {
        private readonly SynOSDbContext _context;
        private readonly IOperationalEventWriter _eventWriter;
        private readonly INotifier _notifier; // ADDED
        private readonly IConfiguration _config;
        private readonly ICostAttributionPolicyResolver _policyResolver;
        private readonly ICostAttributionUsageFactWriter _factWriter;
        private readonly ILogger<TubeConsumptionService> _logger;

        public TubeConsumptionService(
            SynOSDbContext context, 
            IOperationalEventWriter eventWriter, 
            INotifier notifier, 
            IConfiguration config, 
            ICostAttributionPolicyResolver policyResolver,
            ICostAttributionUsageFactWriter factWriter,
            ILogger<TubeConsumptionService> logger)
        {
            _context = context;
            _eventWriter = eventWriter;
            _notifier = notifier; // ADDED
            _config = config;
            _policyResolver = policyResolver;
            _factWriter = factWriter;
            _logger = logger;
        }

        public async Task ConsumeStockForSpecimenAsync(Guid specimenId, Guid consumedByUserId)
        {
            if (_context.Database.CurrentTransaction != null)
            {
                // Participate in existing transaction
                _logger.LogInformation("ConsumeStockForSpecimenAsync: Participating in existing transaction for Specimen {SpecimenId}", specimenId);
                await ConsumeStockInternalAsync(specimenId, consumedByUserId);
            }
            else
            {
                // Start a new transaction with execution strategy
                var strategy = _context.Database.CreateExecutionStrategy();
                await strategy.ExecuteAsync(async () =>
                {
                    using (var transaction = await _context.Database.BeginTransactionAsync())
                    {
                        try
                        {
                            await ConsumeStockInternalAsync(specimenId, consumedByUserId);
                            await transaction.CommitAsync();
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Tube consumption failed for Specimen {SpecimenId}", specimenId);
                            // Swallow to not block clinical flow
                        }
                    }
                });
            }
        }

        private async Task<bool> ConsumeStockInternalAsync(Guid specimenId, Guid consumedByUserId)
        {
            // 1. Idempotency Check
            var referenceId = specimenId.ToString();
            if (await _context.ImsStockMovements.AnyAsync(m => m.ReferenceId == referenceId && m.MovementType == StockMovementType.Consumption))
            {
                _logger.LogInformation("Stock consumption for SpecimenId {SpecimenId} has already been processed.", specimenId);
                return true;
            }

            // 2. Load Specimen, Orders, Tests, Visit
            var specimen = await _context.Specimens
                .Include(s => s.Visit)
                .Include(s => s.Orders).ThenInclude(o => o.Test) // Need Test for Tube Map
                .FirstOrDefaultAsync(s => s.SpecimenId == specimenId);

            if (specimen == null || !specimen.Orders.Any())
            {
                _logger.LogError("Could not process tube consumption: Specimen {SpecimenId} not found or has no orders.", specimenId);
                return false;
            }

            // 3. Determine Branch
            Guid branchId;
            if (specimen.Visit?.BranchId == null || specimen.Visit.BranchId == Guid.Empty)
            {
                branchId = DbInitializer.DefaultBranchId;
                _logger.LogWarning("Visit BranchId for Specimen {SpecimenId} is null. Using Default {DefaultBranchId}.", specimenId, branchId);
            }
            else
            {
                branchId = specimen.Visit.BranchId.Value;
            }

            // 4. Resolve Tube via FIRST Test (Assumption: All tests in specimen use same/compatible tube)
            var firstTest = specimen.Orders.First().Test;

            var tubeMap = await _context.ImsTestTubeMaps
                .FirstOrDefaultAsync(m => m.TestId == firstTest.TestId);

            if (tubeMap == null)
            {
                _logger.LogWarning("No tube mapping for Test {TestName} ({TestId}). Consumption skipped for Specimen {SpecimenId}.", firstTest.TestName, firstTest.TestId, specimenId);
                return false;
            }

            // 5. Get Valuation Method and Active Lots
            var valuationMethod = _config.GetValue<string>("Inventory:ValuationMethod") ?? "FIFO";
            var query = _context.ImsTubeLots
                .Where(lot => lot.TubeId == tubeMap.TubeId &&
                              lot.BranchId == branchId &&
                              lot.CurrentQuantity > 0 &&
                              lot.ExpiryDate >= DateTimeOffset.UtcNow);

            if (valuationMethod.Equals("LIFO", StringComparison.OrdinalIgnoreCase))
            {
                query = query.OrderByDescending(lot => lot.ReceivedAt).ThenByDescending(lot => lot.LotId);
            }
            else
            {
                query = query.OrderBy(lot => lot.ReceivedAt).ThenBy(lot => lot.LotId);
            }

            var activeLots = await query.ToListAsync();
            var quantityToConsume = tubeMap.QuantityPerSample;

            var avail = activeLots.Sum(l => l.CurrentQuantity);
            bool hasShortage = !activeLots.Any() || avail < quantityToConsume;

            if (hasShortage)
            {
                _logger.LogWarning("Insufficient stock for Tube {TubeId} at Branch {BranchId}. Required: {Required}, Avail: {Available}. Proceeding with negative stock.",
                   tubeMap.TubeId, branchId, quantityToConsume, avail);

                // Emit Warning Event and Notifier (but do NOT abort!)
                await _eventWriter.WriteEventAsync(BranchEventType.INVENTORY_SHORTAGE, branchId.ToString(), specimenId.ToString(), specimen.Visit?.Token ?? "UNKNOWN", $"INVENTORY ALERT: Insufficient stock for {tubeMap.TubeId}. Proceeding with negative stock.", "System", null, false, specimenId, "Specimen");
                await _notifier.NotifyInventoryShortageAsync(branchId.ToString(), specimenId.ToString(), tubeMap.TubeId.ToString(), quantityToConsume, (int)avail);
            }

            bool isNestedTx = _context.Database.CurrentTransaction != null;
            IDbContextTransaction? transaction = isNestedTx ? null : await _context.Database.BeginTransactionAsync();
            try
            {
                // 6. Deduction with Cost Attribution
                var remaining = quantityToConsume;
                foreach (var lot in activeLots)
                {
                    if (remaining <= 0) break;
                    var deduct = Math.Min(lot.CurrentQuantity, remaining);

                    var unitCost = lot.CostPerUnit ?? 0;
                    var totalCost = unitCost * (decimal)deduct;
                    var accuracyFlag = lot.CostPerUnit.HasValue ? null : "Estimated";

                    lot.CurrentQuantity -= deduct;
                    remaining -= deduct;

                    // Movement Log
                    var movement = new ImsStockMovement
                    {
                        MovementId = Guid.NewGuid(),
                        TubeId = tubeMap.TubeId,
                        TubeLotId = lot.LotId,
                        Quantity = (int)deduct,
                        MovementType = StockMovementType.Consumption,
                        MovedAt = DateTimeOffset.UtcNow,
                        RecordedByUserId = consumedByUserId,
                        ReferenceType = MovementReferenceType.Sample,
                        ReferenceId = specimenId.ToString()
                    };
                    await _context.ImsStockMovements.AddAsync(movement);

                    // ATOMIC COST ATTRIBUTION: Create UsageFacts for each order in the specimen
                    foreach (var order in specimen.Orders)
                    {
                        var policyVersion = await _policyResolver.ResolvePolicyVersionAsync(
                            order.TestId,
                            tubeMap.TubeId,
                            branchId,
                            DateTimeOffset.UtcNow
                        );

                        if (policyVersion != null)
                        {
                            var triggerEvent = new CostingTriggerEvent
                            {
                                SourceEventId = specimenId,
                                SourceEventType = CostAttribution_SourceEventType.TestExecution,
                                TestId = order.TestId,
                                BranchId = branchId,
                                OccurredAt = DateTimeOffset.UtcNow
                            };

                            await _factWriter.WriteUsageFactAsync(policyVersion, triggerEvent, unitCost, totalCost, accuracyFlag);
                        }
                    }
                }

                // If lot deduction did not fulfill entire quantity, deduct remaining from fallback lot
                if (remaining > 0)
                {
                    ImsTubeLot targetLot;
                    if (activeLots.Any())
                    {
                        targetLot = activeLots.First();
                    }
                    else
                    {
                        // No active lots at all, find any lot or create one
                        var anyLot = await _context.ImsTubeLots
                            .FirstOrDefaultAsync(l => l.TubeId == tubeMap.TubeId && l.BranchId == branchId);
                        
                        if (anyLot != null)
                        {
                            targetLot = anyLot;
                        }
                        else
                        {
                            targetLot = new ImsTubeLot
                            {
                                LotId = Guid.NewGuid(),
                                TubeId = tubeMap.TubeId,
                                BranchId = branchId,
                                LotNumber = "AUTO-NEG-" + DateTime.UtcNow.ToString("yyyyMMdd"),
                                ExpiryDate = DateTimeOffset.UtcNow.AddYears(1),
                                CurrentQuantity = 0,
                                ReceivedAt = DateTimeOffset.UtcNow,
                                CostPerUnit = 0.00m
                            };
                            await _context.ImsTubeLots.AddAsync(targetLot);
                        }
                    }

                    targetLot.CurrentQuantity -= remaining;

                    // Movement Log
                    var movement = new ImsStockMovement
                    {
                        MovementId = Guid.NewGuid(),
                        TubeId = tubeMap.TubeId,
                        TubeLotId = targetLot.LotId,
                        Quantity = remaining,
                        MovementType = StockMovementType.Consumption,
                        MovedAt = DateTimeOffset.UtcNow,
                        RecordedByUserId = consumedByUserId,
                        ReferenceType = MovementReferenceType.Sample,
                        ReferenceId = specimenId.ToString()
                    };
                    await _context.ImsStockMovements.AddAsync(movement);

                    // ATOMIC COST ATTRIBUTION: Create UsageFacts for each order in the specimen
                    foreach (var order in specimen.Orders)
                    {
                        var policyVersion = await _policyResolver.ResolvePolicyVersionAsync(
                            order.TestId,
                            tubeMap.TubeId,
                            branchId,
                            DateTimeOffset.UtcNow
                        );

                        if (policyVersion != null)
                        {
                            var triggerEvent = new CostingTriggerEvent
                            {
                                SourceEventId = specimenId,
                                SourceEventType = CostAttribution_SourceEventType.TestExecution,
                                TestId = order.TestId,
                                BranchId = branchId,
                                OccurredAt = DateTimeOffset.UtcNow
                            };

                            await _factWriter.WriteUsageFactAsync(policyVersion, triggerEvent, targetLot.CostPerUnit ?? 0, (targetLot.CostPerUnit ?? 0) * remaining, targetLot.CostPerUnit.HasValue ? null : "Estimated");
                        }
                    }
                }

                await _context.SaveChangesAsync();
                if (!isNestedTx && transaction != null)
                {
                    await transaction.CommitAsync();
                }
                _logger.LogInformation("Consumed {Quantity} tubes for Specimen {SpecimenId}", quantityToConsume, specimenId);
                return true;
            }
            catch (Exception ex)
            {
                if (!isNestedTx && transaction != null)
                {
                    await transaction.RollbackAsync();
                }
                _logger.LogError(ex, "Failed to consume stock for Specimen {SpecimenId} due to an error.", specimenId);
                return false;
            }
        }
        
        public async Task ConsumeStockOnSampleCollectedAsync(Guid sampleId, Guid consumedByUserId)
        {
             // DEPRECATED
             await Task.CompletedTask;
        }

        public async Task<IEnumerable<NearExpiryLotDto>> GetNearExpiryAlertsAsync(Guid? branchId, int days)
        {
            var expiryThreshold = DateTimeOffset.UtcNow.AddDays(days);
            
            var query = _context.ImsTubeLots
                .Where(lot => lot.ExpiryDate <= expiryThreshold && lot.CurrentQuantity > 0);

            if (branchId.HasValue)
            {
                query = query.Where(lot => lot.BranchId == branchId.Value);
            }

            return await query
                .Include(lot => lot.Tube)
                .Select(lot => new NearExpiryLotDto
                {
                    LotId = lot.LotId,
                    TubeName = lot.Tube.Name,
                    LotNumber = lot.LotNumber,
                    ExpiryDate = lot.ExpiryDate,
                    CurrentQuantity = lot.CurrentQuantity
                })
                .ToListAsync();
        }

                public async Task RecordWastageAsync(WastageRequestDto dto, Guid userId)
                {
                    // Attempt to resolve as ImsInventoryLot first
                    var inventoryLot = await _context.ImsInventoryLots.FindAsync(dto.LotId);

                    if (inventoryLot != null)
                    {
                        if (inventoryLot.ItemId != dto.ConsumableId)
                        {
                            throw new InvalidOperationException("Lot does not belong to the specified consumable.");
                        }

                        if (inventoryLot.CurrentQuantity < dto.Quantity)
                        {
                            throw new InvalidOperationException($"Cannot record wastage of {dto.Quantity} units. Only {inventoryLot.CurrentQuantity} available in lot {inventoryLot.BatchNumber}.");
                        }

                        inventoryLot.CurrentQuantity -= dto.Quantity;

                        var movement = new ImsStockMovement
                        {
                            MovementId = Guid.NewGuid(),
                            ConsumableId = inventoryLot.ItemId,
                            InventoryLotId = inventoryLot.LotId,
                            Quantity = dto.Quantity,
                            MovementType = StockMovementType.Wastage,
                            ReferenceType = MovementReferenceType.Manual,
                            ReasonCode = dto.ReasonCode,
                            RecordedByUserId = userId,
                            MovedAt = DateTimeOffset.UtcNow
                        };

                        await _context.ImsStockMovements.AddAsync(movement);
                        _logger.LogInformation("Recorded wastage of {Quantity} from InventoryLot {LotNumber}. Reason: {Reason}", dto.Quantity, inventoryLot.BatchNumber, dto.ReasonCode);
                    }
                    else
                    {
                        // If not an InventoryLot, attempt to resolve as a legacy ImsTubeLot
                        var tubeLot = await _context.ImsTubeLots.FindAsync(dto.LotId);

                        if (tubeLot == null)
                        {
                            throw new KeyNotFoundException($"Lot with ID '{dto.LotId}' not found in either IMS_InventoryLots or legacy TubeLots.");
                        }

        

                        if (tubeLot.CurrentQuantity < dto.Quantity)

                        {

                            throw new InvalidOperationException($"Cannot record wastage of {dto.Quantity} units. Only {tubeLot.CurrentQuantity} available in lot {tubeLot.LotNumber}.");

                        }

                        tubeLot.CurrentQuantity -= dto.Quantity;

        

                        var movement = new ImsStockMovement

                        {

                            MovementId = Guid.NewGuid(),

                            TubeId = tubeLot.TubeId,

                            TubeLotId = tubeLot.LotId,

                            Quantity = dto.Quantity,

                            MovementType = StockMovementType.Wastage,

                            ReferenceType = MovementReferenceType.Manual,

                            ReasonCode = dto.ReasonCode,

                            RecordedByUserId = userId,

                            MovedAt = DateTimeOffset.UtcNow

                        };

                        await _context.ImsStockMovements.AddAsync(movement);

                        _logger.LogInformation("Recorded wastage of {Quantity} from legacy TubeLot {LotNumber}. Reason: {Reason}", dto.Quantity, tubeLot.LotNumber, dto.ReasonCode);

                    }

        

                    await _context.SaveChangesAsync();

                }

        public async Task AddStockManualAsync(LotCreateDto lotDto, Guid userId)
        {
            var newLot = new ImsTubeLot
            {
                LotId = Guid.NewGuid(),
                TubeId = lotDto.TubeId,
                BranchId = lotDto.BranchId,
                LotNumber = lotDto.LotNumber,
                ExpiryDate = lotDto.ExpiryDate,
                CurrentQuantity = lotDto.Quantity,
                ReceivedAt = DateTimeOffset.UtcNow
            };

            var movement = new ImsStockMovement
            {
                MovementId = Guid.NewGuid(),
                TubeId = newLot.TubeId,
                TubeLotId = newLot.LotId,
                ConsumableId = null, // This is a legacy tube-based flow
                ConsumableLotId = null,
                Quantity = newLot.CurrentQuantity,
                MovementType = StockMovementType.ManualAddition,
                ReferenceType = MovementReferenceType.Manual,
                ReferenceId = "Manual Stock Addition",
                RecordedByUserId = userId,
                MovedAt = DateTimeOffset.UtcNow
            };

            await _context.ImsTubeLots.AddAsync(newLot);
            await _context.ImsStockMovements.AddAsync(movement);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Manually added Lot {LotNumber} with {Quantity} units of TubeId {TubeId} for BranchId {BranchId}", 
                newLot.LotNumber, newLot.CurrentQuantity, newLot.TubeId, newLot.BranchId);
        }
    }
}