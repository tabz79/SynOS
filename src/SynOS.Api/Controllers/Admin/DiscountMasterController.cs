using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin;
using SynOS.Services;
using SynOS.Services.Security;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/discounts")]
    [Authorize] // Auth required, roles defined on methods
    public class DiscountMasterController : ControllerBase
    {
        private readonly IDiscountService _service;
        private readonly IUserContext _userContext;

        public DiscountMasterController(IDiscountService service, IUserContext userContext)
        {
            _service = service;
            _userContext = userContext;
        }

        [HttpPost]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance")]
        public async Task<IActionResult> CreateDiscount([FromBody] CreateDiscountDto createDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _service.CreateDiscountAsync(createDto, _userContext.CurrentUserId);
                return CreatedAtAction(nameof(GetDiscount), new { id = result.DiscountDefinitionId }, result);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message }); // Code uniqueness
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance,Receptionist")]
        public async Task<IActionResult> GetDiscounts([FromQuery] bool? isActive, [FromQuery] bool? isEffective, [FromQuery] string? search)
        {
            var result = await _service.GetDiscountsAsync(isActive, isEffective, search);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance,Receptionist")]
        public async Task<IActionResult> GetDiscount(Guid id)
        {
            try
            {
                var result = await _service.GetDiscountByIdAsync(id);
                return Ok(result);
            }
            catch (System.Collections.Generic.KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance")]
        public async Task<IActionResult> UpdateDiscount(Guid id, [FromBody] UpdateDiscountDto updateDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _service.UpdateDiscountAsync(id, updateDto, _userContext.CurrentUserId);
                return Ok(result);
            }
            catch (System.Collections.Generic.KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("history")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance,Receptionist")]
        public async Task<IActionResult> GetDiscountHistory(
            [FromQuery] string? source,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? search)
        {
            var result = await _service.GetDiscountHistoryAsync(source, fromDate, toDate, search);
            return Ok(result);
        }

        [HttpGet("intelligence")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance,Receptionist")]
        public async Task<IActionResult> GetConcessionIntelligence(
            [FromQuery] string? preset,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var result = await _service.GetConcessionIntelligenceAsync(preset, fromDate, toDate);
            return Ok(result);
        }

        // ==========================================
        // DISCOUNT REASONS (PRESETS & AUTHORIZATIONS)
        // ==========================================

        [HttpGet("reasons")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance,Receptionist")]
        public async Task<IActionResult> GetDiscountReasons([FromQuery] bool? isActive, [FromQuery] string? search)
        {
            var result = await _service.GetDiscountReasonsAsync(isActive, search);
            return Ok(result);
        }

        [HttpGet("reasons/{id}")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance,Receptionist")]
        public async Task<IActionResult> GetDiscountReason(Guid id)
        {
            try
            {
                var result = await _service.GetDiscountReasonByIdAsync(id);
                return Ok(result);
            }
            catch (System.Collections.Generic.KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("reasons")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance,Receptionist")]
        public async Task<IActionResult> CreateDiscountReason([FromBody] CreateDiscountReasonDto createDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _service.CreateDiscountReasonAsync(createDto, _userContext.CurrentUserId);
                return CreatedAtAction(nameof(GetDiscountReason), new { id = result.DiscountReasonId }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("reasons/{id}")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance")]
        public async Task<IActionResult> UpdateDiscountReason(Guid id, [FromBody] UpdateDiscountReasonDto updateDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _service.UpdateDiscountReasonAsync(id, updateDto, _userContext.CurrentUserId);
                return Ok(result);
            }
            catch (System.Collections.Generic.KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("reasons/{id}")]
        [Authorize(Roles = "Admin,SystemAdmin,Accountant,FinanceManager,Finance")]
        public async Task<IActionResult> DeleteDiscountReason(Guid id)
        {
            try
            {
                var success = await _service.DeleteDiscountReasonAsync(id, _userContext.CurrentUserId);
                return Ok(new { success });
            }
            catch (System.Collections.Generic.KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
