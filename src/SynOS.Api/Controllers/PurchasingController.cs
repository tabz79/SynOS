using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;
using SynOS.Services;
using SynOS.Data;
using Microsoft.EntityFrameworkCore;

namespace SynOS.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/purchasing")]
    public class PurchasingController : ControllerBase
    {
        private readonly IPurchasingService _purchasingService;
        private readonly SynOSDbContext _context;

        public PurchasingController(IPurchasingService purchasingService, SynOSDbContext context)
        {
            _purchasingService = purchasingService;
            _context = context;
        }

        [HttpGet("po")]
        public async Task<ActionResult<IEnumerable<ImsPurchaseOrder>>> GetAllPurchaseOrders()
        {
            try
            {
                var pos = await _purchasingService.GetAllPurchaseOrdersAsync();
                return Ok(pos);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("po/{id}")]
        public async Task<ActionResult<ImsPurchaseOrder>> GetPurchaseOrder(Guid id)
        {
            try
            {
                var po = await _purchasingService.GetPurchaseOrderByIdAsync(id);
                if (po == null) return NotFound();
                return Ok(po);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("po")]
        public async Task<ActionResult<ImsPurchaseOrder>> CreatePurchaseOrder(PurchaseOrderCreateDto dto)
        {
            try
            {
                var po = await _purchasingService.CreatePurchaseOrderAsync(dto);
                return CreatedAtAction(nameof(GetPurchaseOrder), new { id = po.POId }, po);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("po/{id}/items")]
        public async Task<ActionResult<IEnumerable<ImsPOItem>>> GetPOItems(Guid id)
        {
            try
            {
                var items = await _purchasingService.GetPurchaseOrderItemsAsync(id);
                return Ok(items);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("po/{id}/items")]
        public async Task<ActionResult<ImsPOItem>> AddPOItem(Guid id, POItemCreateDto dto)
        {
            try
            {
                var item = await _purchasingService.AddPOItemAsync(id, dto);
                return Ok(item);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("po/{id}/approve")]
        public async Task<ActionResult<ImsPurchaseOrder>> ApprovePO(Guid id)
        {
            try
            {
                var po = await _purchasingService.ApprovePurchaseOrderAsync(id);
                return Ok(po);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("po/{id}/print")]
        [AllowAnonymous]
        public async Task<ActionResult> GetPrintablePO(Guid id)
        {
            var po = await _context.ImsPurchaseOrders
                .Include(p => p.Supplier)
                .Include(p => p.POItems)
                    .ThenInclude(i => i.Tube)
                .FirstOrDefaultAsync(p => p.POId == id);

            if (po == null) return NotFound();

            return Ok(po);
        }
    }
}
