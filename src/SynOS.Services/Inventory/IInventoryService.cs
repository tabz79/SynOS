using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;

namespace SynOS.Services.Inventory
{
    public interface IInventoryService
    {
        Task<IEnumerable<InventoryStockDto>> GetStockLedgerAsync();
        Task<IEnumerable<InventoryLotDto>> GetItemLotsAsync(Guid itemId, Guid branchId);
        Task<IEnumerable<ImsInventoryItem>> GetItemsAsync();
        Task ReceiveStockAsync(ReceiveStockDto dto, Guid recordedByUserId);
        Task<IEnumerable<StockMovementDto>> GetMovementHistoryAsync();
        Task<InventoryDashboardDto> GetDashboardMetricsAsync();
        Task CreateOpeningStockEntryAsync(OpeningStockDto dto, Guid recordedByUserId);
        Task CreateOpeningStockBulkAsync(IEnumerable<OpeningStockDto> entries, Guid recordedByUserId);
        Task<ImsInventoryItem> CreateItemAsync(CreateItemDto dto);
        Task<IEnumerable<ImsSupplier>> GetSuppliersAsync();
    }
}
