using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.IMS;
using SynOS.Services.Inventory;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/inventory/requests")]
    [Authorize]
    public class StockRequestController : ControllerBase
    {
        private readonly IImsRequestService _requestService;
        private readonly SynOS.Data.SynOSDbContext _context;

        public StockRequestController(IImsRequestService requestService, SynOS.Data.SynOSDbContext context)
        {
            _requestService = requestService;
            _context = context;
        }

        [HttpGet("all-items")]
        public async Task<ActionResult<IEnumerable<ConsumableSummaryDto>>> GetAllActiveItems()
        {
            var consumables = await _context.ImsConsumables
                .Where(c => c.IsActive)
                .Select(c => new ConsumableSummaryDto
                {
                    ConsumableId = c.ConsumableId,
                    Code = c.Code,
                    Name = c.Name,
                    Category = c.Category,
                    ServiceArea = "Laboratory",
                    Modality = "",
                    OriginType = "Custom",
                    DerivedFromTestName = null,
                    UnitOfMeasure = c.UnitOfMeasure,
                    LowStockThreshold = c.LowStockThreshold,
                    IsActive = c.IsActive
                })
                .ToListAsync();

            return Ok(consumables);
        }

        [HttpGet("allowed-items")]
        public async Task<ActionResult<IEnumerable<ConsumableSummaryDto>>> GetAllowedItems()
        {
            var roleIdClaim = User.FindFirst("RoleId")?.Value;
            Guid roleId = Guid.Empty;

            if (!string.IsNullOrEmpty(roleIdClaim) && Guid.TryParse(roleIdClaim, out var parsedRoleId))
            {
                roleId = parsedRoleId;
            }
            else
            {
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value ?? "Admin";
                var roleObj = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
                if (roleObj != null)
                {
                    roleId = roleObj.RoleId;
                }
            }

            if (roleId != Guid.Empty)
            {
                var items = await _requestService.GetAllowedItemsForRoleAsync(roleId);
                if (items != null && items.Any())
                {
                    return Ok(items);
                }
            }

            return await GetAllActiveItems();
        }

        [HttpGet("roles/{roleId}/mappings")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<ConsumableSummaryDto>>> GetMappings(Guid roleId)
        {
            var items = await _requestService.GetAllowedItemsForRoleAsync(roleId);
            return Ok(items);
        }

        [HttpPost("roles/{roleId}/mappings/{consumableId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddMapping(Guid roleId, Guid consumableId)
        {
            await _requestService.AddMappingAsync(roleId, consumableId);
            return Ok();
        }

        [HttpDelete("roles/{roleId}/mappings/{consumableId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RemoveMapping(Guid roleId, Guid consumableId)
        {
            await _requestService.RemoveMappingAsync(roleId, consumableId);
            return Ok();
        }

        [HttpPost]
        public async Task<ActionResult<Guid>> CreateRequest(CreateStockRequestDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized();

            var requestId = await _requestService.CreateRequestAsync(dto, Guid.Parse(userIdClaim));
            return Ok(requestId);
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Admin,Owner,InventoryManager")]
        public async Task<ActionResult<IEnumerable<StockRequestSummaryDto>>> GetPendingRequests([FromQuery] Guid? branchId)
        {
            if (branchId == null || branchId == Guid.Empty)
            {
                var allRequests = await _requestService.GetAllPendingRequestsAsync();
                return Ok(allRequests);
            }

            var requests = await _requestService.GetPendingRequestsAsync(branchId.Value);
            return Ok(requests);
        }

        [HttpPost("{id}/fulfill")]
        [Authorize(Roles = "Admin,Owner,InventoryManager")]
        public async Task<IActionResult> FulfillRequest(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized();

            await _requestService.FulfillRequestAsync(id, Guid.Parse(userIdClaim));
            return NoContent();
        }

        [HttpPost("{id}/ignore")]
        [Authorize(Roles = "Admin,Owner,InventoryManager")]
        public async Task<IActionResult> IgnoreRequest(Guid id)
        {
            await _requestService.IgnoreRequestAsync(id);
            return NoContent();
        }
    }
}
