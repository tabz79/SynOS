using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;
using SynOS.Models.Enums;
using SynOS.Services.Operational;

namespace SynOS.Services
{
    public class TubeConsumptionService : ITubeConsumptionService
    {
        private readonly SynOSDbContext _context;
        private readonly IOperationalEventWriter _eventWriter;
        private readonly INotifier _notifier; // ADDED
        private readonly ILogger<TubeConsumptionService> _logger;

        public TubeConsumptionService(SynOSDbContext context, IOperationalEventWriter eventWriter, INotifier notifier, ILogger<TubeConsumptionService> logger)
        {
            _context = context;
            _eventWriter = eventWriter;
            _notifier = notifier; // ADDED
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

        private async Task ConsumeStockInternalAsync(Guid specimenId, Guid consumedByUserId)
        {
            // 1. Idempotency Check
            var referenceId = specimenId.ToString();
            if (await _context.ImsStockMovements.AnyAsync(m => m.ReferenceId == referenceId && m.MovementType == StockMovementType.Consumption))
            {
                _logger.LogInformation("Stock consumption for SpecimenId {SpecimenId} has already been processed.", specimenId);
                return;
            }

            // 2. Load Specimen, Orders, Tests, Visit
            var specimen = await _context.Specimens
                .Include(s => s.Visit)
                .Include(s => s.Orders).ThenInclude(o => o.Test) // Need Test for Tube Map
                .FirstOrDefaultAsync(s => s.SpecimenId == specimenId);

            if (specimen == null || !specimen.Orders.Any())
            {
                _logger.LogError("Could not process tube consumption: Specimen {SpecimenId} not found or has no orders.", specimenId);
                return;
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
                return;
            }

            var quantityToConsume = tubeMap.QuantityPerSample; // Usually 1

            // 5. Get active lots (FEFO)
            var activeLots = await _context.ImsTubeLots
                .Where(lot => lot.TubeId == tubeMap.TubeId &&
                              lot.BranchId == branchId &&
                              lot.CurrentQuantity > 0 &&
                              lot.ExpiryDate >= DateTimeOffset.UtcNow)
                .OrderBy(lot => lot.ExpiryDate)
                .ThenBy(lot => lot.ReceivedAt)
                .ToListAsync();

            if (!activeLots.Any() || activeLots.Sum(l => l.CurrentQuantity) < quantityToConsume)
            {
                var avail = activeLots.Sum(l => l.CurrentQuantity);
                _logger.LogWarning("Insufficient stock for Tube {TubeId} at Branch {BranchId}. Required: {Required}, Avail: {Available}. Consumption skipped.",
                   tubeMap.TubeId, branchId, quantityToConsume, avail);

                // Emit Warning Event
                await _eventWriter.WriteEventAsync(
                    BranchEventType.INVENTORY_SHORTAGE,
                    branchId.ToString(),
                    specimenId.ToString(),
                    specimen.Visit?.Token ?? "UNKNOWN",
                    $"INVENTORY ALERT: Insufficient stock for {tubeMap.TubeId}. Required: {quantityToConsume}, Available: {avail}",
                    "System",
                    null,
                    false,
                    specimenId,
                    "Specimen"
                );

                // PUSH REAL-TIME ALERT
                await _notifier.NotifyInventoryShortageAsync(branchId.ToString(), specimenId.ToString(), tubeMap.TubeId.ToString(), quantityToConsume, (int)avail);

                return;
            }

            // 6. FEFO Deduction
            var remaining = quantityToConsume;
            foreach (var lot in activeLots)
            {
                if (remaining <= 0) break;
                var deduct = Math.Min(lot.CurrentQuantity, remaining);

                lot.CurrentQuantity -= deduct;
                remaining -= deduct;

                var movement = new ImsStockMovement
                {
                    MovementId = Guid.NewGuid(),
                    TubeId = tubeMap.TubeId,
                    TubeLotId = lot.LotId,
                    Quantity = deduct,
                    MovementType = StockMovementType.Consumption,
                    ReferenceType = MovementReferenceType.Sample,
                    ReferenceId = referenceId,
                    RecordedByUserId = consumedByUserId,
                    MovedAt = DateTimeOffset.UtcNow
                };
                await _context.ImsStockMovements.AddAsync(movement);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Consumed {Quantity} tubes for Specimen {SpecimenId}", quantityToConsume, specimenId);
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

                    // Attempt to resolve as ImsConsumableLot first

                    var consumableLot = await _context.ImsConsumableLots.FindAsync(dto.LotId);

                    if (consumableLot != null)

                    {

                        if (consumableLot.ConsumableId != dto.ConsumableId)

                        {

                            throw new InvalidOperationException("Lot does not belong to the specified consumable.");

                        }

                        if (consumableLot.Quantity < dto.Quantity)

                        {

                            throw new InvalidOperationException($"Cannot record wastage of {dto.Quantity} units. Only {consumableLot.Quantity} available in lot {consumableLot.BatchNumber}.");

                        }

                        consumableLot.Quantity -= dto.Quantity;

        

                        var movement = new ImsStockMovement

                        {

                            MovementId = Guid.NewGuid(),

                            ConsumableId = consumableLot.ConsumableId,

                            ConsumableLotId = consumableLot.LotId,

                            Quantity = dto.Quantity,

                            MovementType = StockMovementType.Wastage,

                            ReferenceType = MovementReferenceType.Manual,

                            ReasonCode = dto.ReasonCode,

                            RecordedByUserId = userId,

                            MovedAt = DateTimeOffset.UtcNow

                        };

                        await _context.ImsStockMovements.AddAsync(movement);

                        _logger.LogInformation("Recorded wastage of {Quantity} from ConsumableLot {LotNumber}. Reason: {Reason}", dto.Quantity, consumableLot.BatchNumber, dto.ReasonCode);

                    }

                    else

                    {

                        // If not a ConsumableLot, attempt to resolve as a legacy ImsTubeLot

                        var tubeLot = await _context.ImsTubeLots.FindAsync(dto.LotId);

                        if (tubeLot == null)

                        {

                            throw new KeyNotFoundException($"Lot with ID '{dto.LotId}' not found in either ConsumableLots or legacy TubeLots.");

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