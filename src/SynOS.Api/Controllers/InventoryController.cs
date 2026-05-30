using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;
using SynOS.Services.Inventory;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/inventory")]
    [Authorize]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;
        private readonly SynOS.Services.Security.IUserContext _userContext;

        public InventoryController(IInventoryService inventoryService, SynOS.Services.Security.IUserContext userContext)
        {
            _inventoryService = inventoryService;
            _userContext = userContext;
        }

        [HttpGet("stock")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult<IEnumerable<InventoryStockDto>>> GetStockLedger([FromQuery] Guid? branchId, [FromQuery] bool isConsolidated = false)
        {
            Guid? effectiveBranchId = branchId ?? _userContext.CurrentBranchId;
            if (isConsolidated && (_userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin"))
            {
                effectiveBranchId = null;
            }
            var stock = await _inventoryService.GetStockLedgerAsync(effectiveBranchId);
            return Ok(stock);
        }

        [HttpGet("stock/{itemId}/lots")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult<IEnumerable<InventoryLotDto>>> GetItemLots(Guid itemId, [FromQuery] Guid branchId)
        {
            var lots = await _inventoryService.GetItemLotsAsync(itemId, branchId);
            return Ok(lots);
        }

        [HttpGet("items")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult<IEnumerable<ImsInventoryItem>>> GetItems()
        {
            var items = await _inventoryService.GetItemsAsync();
            return Ok(items);
        }

        [HttpPost("receive")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult> ReceiveStock([FromBody] ReceiveStockDto dto)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            await _inventoryService.ReceiveStockAsync(dto, userId);
            return Ok(new { message = "Stock received successfully" });
        }

        [HttpGet("history")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult<IEnumerable<StockMovementDto>>> GetHistory()
        {
            var history = await _inventoryService.GetMovementHistoryAsync();
            return Ok(history);
        }

        [HttpGet("dashboard")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult<InventoryDashboardDto>> GetDashboard([FromQuery] Guid? branchId, [FromQuery] bool isConsolidated = false)
        {
            Guid? effectiveBranchId = branchId ?? _userContext.CurrentBranchId;
            if (isConsolidated && (_userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin"))
            {
                effectiveBranchId = null;
            }
            var metrics = await _inventoryService.GetDashboardMetricsAsync(effectiveBranchId);
            return Ok(metrics);
        }

        [HttpPost("opening-stock/single")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult> CreateOpeningStockSingle([FromBody] OpeningStockDto dto)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            await _inventoryService.CreateOpeningStockEntryAsync(dto, userId);
            return Ok(new { message = "Opening stock entry created successfully" });
        }

        [HttpPost("opening-stock/bulk")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult> CreateOpeningStockBulk([FromBody] IEnumerable<OpeningStockDto> entries)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            await _inventoryService.CreateOpeningStockBulkAsync(entries, userId);
            return Ok(new { message = "Bulk opening stock entries created successfully" });
        }

        [HttpPost("items")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult<ImsInventoryItem>> CreateItem([FromBody] CreateItemDto dto)
        {
            var item = await _inventoryService.CreateItemAsync(dto);
            return Ok(item);
        }

        [HttpGet("suppliers")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult<IEnumerable<ImsSupplier>>> GetSuppliers()
        {
            var suppliers = await _inventoryService.GetSuppliersAsync();
            return Ok(suppliers);
        }
    }
}
