using System;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface ITubeConsumptionService
    {
        Task ConsumeStockOnSampleCollectedAsync(Guid sampleId, Guid consumedByUserId);
        // Task<IEnumerable<LowStockAlertDto>> CheckLowStockAsync(Guid branchId); // Placeholder for now
    }
}
