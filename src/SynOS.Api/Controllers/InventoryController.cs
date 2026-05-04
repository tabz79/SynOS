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

        public InventoryController(IInventoryService inventoryService)
        {
            _inventoryService = inventoryService;
        }

        [HttpGet("stock")]
        [Authorize(Roles = "Admin,InventoryManager")]
        public async Task<ActionResult<IEnumerable<InventoryStockDto>>> GetStockLedger()
        {
            var stock = await _inventoryService.GetStockLedgerAsync();
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
        public async Task<ActionResult<InventoryDashboardDto>> GetDashboard()
        {
            var metrics = await _inventoryService.GetDashboardMetricsAsync();
            return Ok(metrics);
        }
    }
}
