using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.IMS
{
    public class StockSummaryDto
    {
        public List<StockItemDto> StockItems { get; set; } = new List<StockItemDto>();
    }

    public class StockItemDto
    {
        public Guid TubeId { get; set; }
        public string TubeCode { get; set; }
        public string TubeName { get; set; }
        public int CurrentQuantity { get; set; }
        public int AlertQuantity { get; set; }
        public bool IsBelowAlertThreshold { get; set; }
    }

    public class LowStockAlertDto
    {
        public Guid TubeId { get; set; }
        public string TubeCode { get; set; }
        public string TubeName { get; set; }

        public int CurrentQuantity { get; set; }
        public int AlertQuantity { get; set; }
    }

    public class ConsumableSummaryDto
    {
        public Guid ConsumableId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public string UnitOfMeasure { get; set; }
        public int LowStockThreshold { get; set; }
        public bool IsActive { get; set; }
    }

    public class InventoryStockDto
    {
        public Guid ItemId { get; set; }
        public string ItemName { get; set; }
        public string ItemCode { get; set; }
        public decimal TotalQuantity { get; set; }
        public string Unit { get; set; }
        public string BranchName { get; set; }
        public Guid BranchId { get; set; }
        public string Status { get; set; } // Healthy, Low, Critical
        public string Category { get; set; }
        public string ServiceArea { get; set; }
        public string? Modality { get; set; }
    }

    public class InventoryLotDto
    {
        public Guid LotId { get; set; }
        public string LotNumber { get; set; }
        public decimal Quantity { get; set; }
        public DateTimeOffset? ExpiryDate { get; set; }
        public DateTimeOffset ReceivedAt { get; set; }
        public bool IsExpired => ExpiryDate.HasValue && ExpiryDate < DateTimeOffset.UtcNow;
    }

    public class StockMovementDto
    {
        public Guid MovementId { get; set; }
        public string ItemName { get; set; }
        public string ItemCode { get; set; }
        public string LotNumber { get; set; }
        public string MovementType { get; set; }
        public decimal Quantity { get; set; }
        public string BranchName { get; set; }
        public string RecordedBy { get; set; }
        public DateTimeOffset MovedAt { get; set; }
        public string Reference { get; set; }
    }

    public class InventoryDashboardDto
    {
        public int PendingRequestsCount { get; set; }
        public int FulfilledTodayCount { get; set; }
        public int TotalStockItems { get; set; }
        public int CriticalStockCount { get; set; }
        public int LowStockCount { get; set; }
    }
}
