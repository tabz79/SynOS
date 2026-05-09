using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;

namespace SynOS.Services
{
    public interface IPurchasingService
    {
        Task<ImsSupplier> CreateSupplierAsync(SupplierCreateDto dto);
        Task<ImsPurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrderCreateDto dto);
        Task<ImsPOItem> AddPOItemAsync(Guid poId, POItemCreateDto dto);
        Task<ImsPurchaseOrder> ApprovePurchaseOrderAsync(Guid poId);
        Task<ImsConsumableLot> ReceiveStockAsync(Guid poItemId, ReceiveStockDto dto, Guid userId);

        // GET methods for retrieval
        Task<ImsSupplier> GetSupplierByIdAsync(Guid supplierId);
        Task<IEnumerable<ImsSupplier>> GetAllSuppliersAsync();
        Task<ImsPurchaseOrder> GetPurchaseOrderByIdAsync(Guid poId);
        Task<IEnumerable<ImsPurchaseOrder>> GetAllPurchaseOrdersAsync();
        Task<IEnumerable<ImsPOItem>> GetPurchaseOrderItemsAsync(Guid poId);
    }
}