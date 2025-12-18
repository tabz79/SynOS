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

namespace SynOS.Services
{
    public class TubeConsumptionService : ITubeConsumptionService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<TubeConsumptionService> _logger;

        public TubeConsumptionService(SynOSDbContext context, ILogger<TubeConsumptionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ConsumeStockOnSampleCollectedAsync(Guid sampleId, Guid consumedByUserId)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using (var transaction = await _context.Database.BeginTransactionAsync())
                {
                    try
                    {
                        // 1. Idempotency Check
                        var referenceId = sampleId.ToString();
                        if (await _context.ImsStockMovements.AnyAsync(m => m.ReferenceId == referenceId && m.MovementType == StockMovementType.Consumption))
                        {
                            _logger.LogInformation("Stock consumption for SampleId {SampleId} has already been processed.", sampleId);
                            return;
                        }

                        // 2. Load Sample, Test, and Visit to get BranchId
                        var sample = await _context.Samples
                            .Include(s => s.Order).ThenInclude(o => o.Test)
                            .Include(s => s.Order).ThenInclude(o => o.Visit)
                            .FirstOrDefaultAsync(s => s.SampleId == sampleId);

                        if (sample?.Order?.Test == null || sample.Order.Visit == null)
                        {
                            _logger.LogError("Could not process tube consumption for SampleId {SampleId}: Sample, Order, Test, or Visit not found.", sampleId);
                            return;
                        }

                        Guid branchId;
                        // Use the Visit's BranchId if available.
                        // If Visit.BranchId is null or Guid.Empty (unassigned), fallback to the system's DefaultBranchId.
                        // This addresses the "BranchId mismatch" by ensuring a valid BranchId is always used for consumption.
                        if (sample.Order.Visit.BranchId == null || sample.Order.Visit.BranchId == Guid.Empty)
                        {
                            branchId = DbInitializer.DefaultBranchId;
                            _logger.LogWarning("Visit BranchId for SampleId {SampleId} is null or empty. Falling back to system's DefaultBranchId {DefaultBranchId} for consumption.", sampleId, branchId);
                        }
                        else
                        {
                            branchId = sample.Order.Visit.BranchId.Value;
                        }


                        // 3. Resolve required tube
                        var tubeMap = await _context.ImsTestTubeMaps
                            .FirstOrDefaultAsync(m => m.TestId == sample.Order.Test.TestId);

                        if (tubeMap == null)
                        {
                            _logger.LogWarning("No tube mapping for TestId {TestId}. Skipping stock consumption.", sample.Order.Test.TestId);
                            return;
                        }
                        
                        var quantityToConsume = tubeMap.QuantityPerSample;
                        
                        // 4. Get active lots for that tube and branch (FEFO)
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
                            _logger.LogError("Insufficient stock for TubeId {TubeId} at BranchId {BranchId}. Required: {Required}, Available: {Available}. Consumption skipped.",
                                tubeMap.TubeId, branchId, quantityToConsume, activeLots.Sum(l => l.CurrentQuantity));
                            // DO NOT throw, DO NOT roll back the overall sample collection transaction.
                            // Simply return, effectively not committing the consumption part of the transaction.
                            return;
                        }

                        // 5. FEFO Deduction Logic
                        var remainingToConsume = quantityToConsume;
                        foreach (var lot in activeLots)
                        {
                            if (remainingToConsume <= 0) break;

                            var quantityFromThisLot = Math.Min(lot.CurrentQuantity, remainingToConsume);
                            
                            lot.CurrentQuantity -= quantityFromThisLot;
                            remainingToConsume -= quantityFromThisLot;

                            var movement = new ImsStockMovement
                            {
                                MovementId = Guid.NewGuid(),
                                TubeId = tubeMap.TubeId,
                                TubeLotId = lot.LotId,
                                ConsumableId = null, // This is a legacy tube-based flow
                                ConsumableLotId = null,
                                Quantity = quantityFromThisLot,
                                MovementType = StockMovementType.Consumption,
                                ReferenceType = MovementReferenceType.Sample,
                                ReferenceId = referenceId,
                                RecordedByUserId = consumedByUserId,
                                MovedAt = DateTimeOffset.UtcNow
                            };
                            await _context.ImsStockMovements.AddAsync(movement);

                            _logger.LogInformation("Consumed {Quantity} from Lot {LotNumber} for TubeId {TubeId}. New lot quantity: {NewQuantity}",
                                quantityFromThisLot, lot.LotNumber, lot.TubeId, lot.CurrentQuantity);
                        }

                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        _logger.LogInformation("Successfully processed stock consumption for SampleId {SampleId}.", sampleId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "An error occurred during tube stock consumption for SampleId {SampleId}. Stock consumption skipped.", sampleId);
                        // Do NOT re-throw, do NOT block the overall sample collection flow.
                        // The transaction for consumption will implicitly not be committed.
                    }
                }
            });
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
            ImsConsumableLot? consumableLot = null;
            ImsTubeLot? tubeLot = null;

            // Attempt to resolve as ImsConsumableLot first
            consumableLot = await _context.ImsConsumableLots.FindAsync(dto.LotId);

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
                    TubeId = null,
                    TubeLotId = null,
                    Quantity = dto.Quantity,
                    MovementType = StockMovementType.Wastage,
                    ReferenceType = MovementReferenceType.Manual,
                    ReasonCode = dto.ReasonCode,
                    RecordedByUserId = userId,
                    MovedAt = DateTimeOffset.UtcNow
                };
                await _context.ImsStockMovements.AddAsync(movement);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Recorded wastage of {Quantity} from ConsumableLot {LotNumber}. Reason: {Reason}", dto.Quantity, consumableLot.BatchNumber, dto.ReasonCode);
            }
            else
            {
                // If not a ConsumableLot, attempt to resolve as ImsTubeLot
                tubeLot = await _context.ImsTubeLots.FindAsync(dto.LotId);

                if (tubeLot == null)
                {
                    throw new KeyNotFoundException($"Lot with ID '{dto.LotId}' not found (neither ConsumableLot nor TubeLot).");
                }
                // For TubeLots, we don't have ConsumableId in dto to check, but we need TubeId from the lot itself
                // For now, assume a TubeLot implies its own TubeId for consistency.
                // The DTO contains ConsumableId, which won't match a TubeLot directly.
                // I need to ensure the dto.ConsumableId is compatible with the tubeLot.TubeId or skip this check for legacy.

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
                    ConsumableId = null, // This is a legacy tube-based flow
                    ConsumableLotId = null,
                    Quantity = dto.Quantity,
                    MovementType = StockMovementType.Wastage,
                    ReferenceType = MovementReferenceType.Manual,
                    ReasonCode = dto.ReasonCode,
                    RecordedByUserId = userId,
                    MovedAt = DateTimeOffset.UtcNow
                };
                await _context.ImsStockMovements.AddAsync(movement);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Recorded wastage of {Quantity} from TubeLot {LotNumber}. Reason: {Reason}", dto.Quantity, tubeLot.LotNumber, dto.ReasonCode);
            }
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