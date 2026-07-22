using System;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.DTOs.IMS
{
    public class CreateStockRequestDto
    {
        public Guid ConsumableId { get; set; }
        public int Quantity { get; set; }
        public Guid BranchId { get; set; }
        public string? RequestedFromScreen { get; set; }
        public string? RequesterRole { get; set; }
    }

    public class StockRequestSummaryDto
    {
        public Guid RequestId { get; set; }
        public Guid ConsumableId { get; set; }
        public string ConsumableName { get; set; }
        public string UnitOfMeasure { get; set; }
        public int Quantity { get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; }
        public Guid RequestedByUserId { get; set; }
        public string RequestedByUserName { get; set; }
        public string? RequestedByUserRole { get; set; }
        public string? RequestedFromScreen { get; set; }
        public DateTimeOffset RequestedAt { get; set; }
        public ImsRequestStatus Status { get; set; }
    }

    public class RoleItemMappingDto
    {
        public Guid RoleId { get; set; }
        public string RoleName { get; set; }
        public Guid ConsumableId { get; set; }
        public string ConsumableName { get; set; }
    }
}
