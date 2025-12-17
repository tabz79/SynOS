using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.IMS;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/ims")]
    [Authorize(Roles = "Admin,StoreManager")]
    public class IMSPurchasingController : ControllerBase
    {
        private readonly IPurchasingService _purchasingService;

        public IMSPurchasingController(IPurchasingService purchasingService)
        {
            _purchasingService = purchasingService;
        }

        // --- Suppliers ---
        [HttpPost("suppliers")]
        public async Task<IActionResult> CreateSupplier([FromBody] SupplierCreateDto dto)
        {
            try
            {
                var supplier = await _purchasingService.CreateSupplierAsync(dto);
                return CreatedAtAction(nameof(GetSupplier), new { supplierId = supplier.SupplierId }, supplier);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpGet("suppliers/{supplierId}")]
        public async Task<IActionResult> GetSupplier(Guid supplierId)
        {
            try
            {
                var supplier = await _purchasingService.GetSupplierByIdAsync(supplierId);
                return Ok(supplier);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("suppliers")]
        public async Task<IActionResult> GetAllSuppliers()
        {
            var suppliers = await _purchasingService.GetAllSuppliersAsync();
            return Ok(suppliers);
        }

        // --- Purchase Orders ---
        [HttpPost("purchase/orders")]
        public async Task<IActionResult> CreatePurchaseOrder([FromBody] PurchaseOrderCreateDto dto)
        {
            try
            {
                var po = await _purchasingService.CreatePurchaseOrderAsync(dto);
                return CreatedAtAction(nameof(GetPurchaseOrder), new { poId = po.POId }, po);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("purchase/orders/{poId}")]
        public async Task<IActionResult> GetPurchaseOrder(Guid poId)
        {
            try
            {
                var po = await _purchasingService.GetPurchaseOrderByIdAsync(poId);
                return Ok(po);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // --- Purchase Order Items ---
        [HttpPost("purchase/orders/{poId}/items")]
        public async Task<IActionResult> AddPOItem(Guid poId, [FromBody] POItemCreateDto dto)
        {
            try
            {
                var item = await _purchasingService.AddPOItemAsync(poId, dto);
                return Ok(item);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("purchase/orders/{poId}/items")]
        public async Task<IActionResult> GetPOItems(Guid poId)
        {
            try
            {
                var items = await _purchasingService.GetPurchaseOrderItemsAsync(poId);
                return Ok(items);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // --- Receiving ---
        [HttpPost("purchase/receive/{poItemId}")]
        public async Task<IActionResult> ReceiveStock(Guid poItemId, [FromBody] ReceiveStockDto dto)
        {
            try
            {
                var userId = Guid.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier));
                var lot = await _purchasingService.ReceiveStockAsync(poItemId, dto, userId);
                return Ok(lot);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
