using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.IMS;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/finance/[controller]")]
    [Authorize]
    public class VendorsController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public VendorsController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ImsSupplier>>> GetVendors()
        {
            return await _context.ImsSuppliers
                .OrderBy(v => v.Name)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ImsSupplier>> GetVendor(Guid id)
        {
            var vendor = await _context.ImsSuppliers.FindAsync(id);
            if (vendor == null) return NotFound();
            return vendor;
        }

        [HttpPost]
        public async Task<ActionResult<ImsSupplier>> CreateVendor([FromBody] VendorCreateDto dto)
        {
            if (await _context.ImsSuppliers.AnyAsync(s => s.Name == dto.Name))
            {
                return BadRequest("A vendor with this name already exists.");
            }

            var vendor = new ImsSupplier
            {
                SupplierId = Guid.NewGuid(),
                Name = dto.Name,
                TaxId = dto.TaxId,
                Category = dto.Category,
                Email = dto.Email,
                Phone = dto.Phone,
                ContactInfo = dto.ContactInfo,
                IsActive = true
            };

            _context.ImsSuppliers.Add(vendor);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetVendor), new { id = vendor.SupplierId }, vendor);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVendor(Guid id, [FromBody] VendorCreateDto dto)
        {
            var vendor = await _context.ImsSuppliers.FindAsync(id);
            if (vendor == null) return NotFound();

            vendor.Name = dto.Name;
            vendor.TaxId = dto.TaxId;
            vendor.Category = dto.Category;
            vendor.Email = dto.Email;
            vendor.Phone = dto.Phone;
            vendor.ContactInfo = dto.ContactInfo;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVendor(Guid id)
        {
            var vendor = await _context.ImsSuppliers.FindAsync(id);
            if (vendor == null) return NotFound();

            vendor.IsActive = false; // Soft delete
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class VendorCreateDto
    {
        public string Name { get; set; }
        public string? TaxId { get; set; }
        public string? Category { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? ContactInfo { get; set; }
    }
}
