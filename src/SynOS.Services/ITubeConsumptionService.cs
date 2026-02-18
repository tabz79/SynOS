using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.IMS;

namespace SynOS.Services
{
    public interface ITubeConsumptionService
    {
        // Task ConsumeStockOnSampleCollectedAsync(Guid sampleId, Guid consumedByUserId); // DEPRECATED
        Task ConsumeStockForSpecimenAsync(Guid specimenId, Guid consumedByUserId);
        
        Task<IEnumerable<NearExpiryLotDto>> GetNearExpiryAlertsAsync(Guid? branchId, int days);
        
        
        Task RecordWastageAsync(WastageRequestDto dto, Guid userId);
        
        Task AddStockManualAsync(LotCreateDto lotDto, Guid userId); // DTO to be created
    }
}