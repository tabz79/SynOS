using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;

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
            // Use an execution strategy to handle transactions and potential retries.
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using (var transaction = await _context.Database.BeginTransactionAsync())
                {
                    try
                    {
                        // 1. Idempotency Check: See if consumption already happened for this sample.
                        var existingConsumption = await _context.ImsTubeConsumptions
                            .FirstOrDefaultAsync(c => c.SampleId == sampleId);

                        if (existingConsumption != null)
                        {
                            _logger.LogInformation("Stock consumption for SampleId {SampleId} has already been processed.", sampleId);
                            return; // Already processed, exit safely.
                        }

                        // 2. Load the sample and its required test information.
                        var sample = await _context.Samples
                            .Include(s => s.Order)
                                .ThenInclude(o => o.Test)
                            .Include(s => s.Order)
                                .ThenInclude(o => o.Visit) // Need visit to find the branch
                            .FirstOrDefaultAsync(s => s.SampleId == sampleId);

                        if (sample == null || sample.Order == null || sample.Order.Test == null || sample.Order.Visit == null)
                        {
                            _logger.LogError("Could not process tube consumption for SampleId {SampleId}: Sample, Order, Test, or Visit not found.", sampleId);
                            return;
                        }

                        // This is a placeholder as BranchId is not explicitly used by IMS for consumption at this stage.
                        // All stock operations are implicitly for a single branch.
                        // TODO: If multi-branch support is added, this will need to derive BranchId from the Visit or user context.
                        // Guid branchId = Guid.Parse("A0000000-0000-0000-0000-000000000001"); // Implicit single branch
                        
                        // 3. Resolve the required tube from the TestTubeMap
                        var tubeMap = await _context.ImsTestTubeMaps
                            .FirstOrDefaultAsync(m => m.TestId == sample.Order.Test.TestId);

                        if (tubeMap == null)
                        {
                            _logger.LogWarning("No tube mapping found for TestId {TestId} ({TestCode}). Skipping stock consumption.", sample.Order.Test.TestId, sample.Order.Test.TestCode);
                            return;
                        }

                        // 4. Find the stock record for the tube (implicitly single branch for now).
                        var tubeStock = await _context.ImsTubeStocks
                            .FirstOrDefaultAsync(s => s.TubeId == tubeMap.TubeId /* && s.BranchId == branchId */); // BranchId removed for implicit single branch

                        if (tubeStock == null)
                        {
                            _logger.LogError("No stock record found for TubeId {TubeId}. Cannot consume stock.", tubeMap.TubeId /* , branchId */);
                            // In a real system, you might auto-create a stock record here, but for now we fail.
                            return;
                        }

                        // 5. Reduce stock quantity
                        int quantityToConsume = tubeMap.QuantityPerSample;
                        
                        if (tubeStock.CurrentQuantity < quantityToConsume)
                        {
                            _logger.LogWarning("Stock for TubeId {TubeId} is insufficient. Current: {CurrentQuantity}, Required: {RequiredQuantity}. Proceeding with consumption, stock will be negative.",
                                tubeStock.TubeId /* , branchId */, tubeStock.CurrentQuantity, quantityToConsume);
                        }

                        tubeStock.CurrentQuantity -= quantityToConsume;

                        // 6. Create the consumption record (the truth log)
                        var consumptionRecord = new Models.Entities.IMS.ImsTubeConsumption
                        {
                            ConsumptionId = Guid.NewGuid(),
                            SampleId = sampleId,
                            TubeId = tubeMap.TubeId,
                            Quantity = quantityToConsume,
                            ConsumedAt = DateTimeOffset.UtcNow,
                            ConsumedByUserId = consumedByUserId
                        };
                        
                        await _context.ImsTubeConsumptions.AddAsync(consumptionRecord);

                        // 7. Save all changes
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        _logger.LogInformation("Successfully consumed {Quantity} of TubeId {TubeId} for SampleId {SampleId}. New stock count: {NewStockCount}",
                            quantityToConsume, tubeMap.TubeId, sampleId /* , branchId */, tubeStock.CurrentQuantity);

                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "An error occurred during tube stock consumption for SampleId {SampleId}. Rolling back transaction.", sampleId);
                        await transaction.RollbackAsync();
                        throw; // Re-throw to indicate that the operation failed.
                    }
                }
            });
        }
    }
}
