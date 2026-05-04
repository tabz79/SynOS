using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.IMS;

namespace SynOS.Services.Inventory
{
    public interface IImsRequestService
    {
        Task<IEnumerable<ConsumableSummaryDto>> GetAllowedItemsForRoleAsync(Guid roleId);
        Task AddMappingAsync(Guid roleId, Guid consumableId);
        Task RemoveMappingAsync(Guid roleId, Guid consumableId);
        Task<Guid> CreateRequestAsync(CreateStockRequestDto dto, Guid requestedByUserId);
        Task<IEnumerable<StockRequestSummaryDto>> GetPendingRequestsAsync(Guid branchId);
        Task<IEnumerable<StockRequestSummaryDto>> GetAllPendingRequestsAsync();
        Task FulfillRequestAsync(Guid requestId, Guid adminUserId);
        Task IgnoreRequestAsync(Guid requestId);
    }
}
