using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/insurance-companies")]
    [Authorize]
    public class InsuranceMasterController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public InsuranceMasterController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = true)
        {
            var query = _context.InsuranceCompanies.AsNoTracking();
            if (activeOnly)
            {
                query = query.Where(i => i.IsActive);
            }

            var companies = await query
                .OrderBy(i => i.Name)
                .Select(i => new
                {
                    i.InsuranceCompanyId,
                    i.Name,
                    i.Code,
                    i.TpaName,
                    i.PayerId,
                    i.ContactEmail,
                    i.ContactPhone,
                    i.Address,
                    i.PreAuthRequired,
                    i.IsActive,
                    i.CreatedAt
                })
                .ToListAsync();

            return Ok(companies);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var company = await _context.InsuranceCompanies.FindAsync(id);
            if (company == null) return NotFound(new { message = $"Insurance company {id} not found" });
            return Ok(company);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateInsuranceCompanyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Insurance Company Name is required." });

            var code = !string.IsNullOrWhiteSpace(dto.Code) 
                ? dto.Code.Trim().ToUpperInvariant() 
                : dto.Name.Substring(0, Math.Min(4, dto.Name.Length)).ToUpperInvariant() + "-" + new Random().Next(10, 99);

            var company = new InsuranceCompany
            {
                InsuranceCompanyId = Guid.NewGuid(),
                Name = dto.Name.Trim(),
                Code = code,
                TpaName = dto.TpaName?.Trim(),
                PayerId = dto.PayerId?.Trim(),
                ContactEmail = dto.ContactEmail?.Trim(),
                ContactPhone = dto.ContactPhone?.Trim(),
                Address = dto.Address?.Trim(),
                PreAuthRequired = dto.PreAuthRequired,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _context.InsuranceCompanies.Add(company);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = company.InsuranceCompanyId }, company);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateInsuranceCompanyDto dto)
        {
            var company = await _context.InsuranceCompanies.FindAsync(id);
            if (company == null) return NotFound(new { message = $"Insurance company {id} not found" });

            if (!string.IsNullOrWhiteSpace(dto.Name)) company.Name = dto.Name.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Code)) company.Code = dto.Code.Trim().ToUpperInvariant();
            company.TpaName = dto.TpaName?.Trim();
            company.PayerId = dto.PayerId?.Trim();
            company.ContactEmail = dto.ContactEmail?.Trim();
            company.ContactPhone = dto.ContactPhone?.Trim();
            company.Address = dto.Address?.Trim();
            if (dto.PreAuthRequired.HasValue) company.PreAuthRequired = dto.PreAuthRequired.Value;
            if (dto.IsActive.HasValue) company.IsActive = dto.IsActive.Value;
            company.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(company);
        }
    }

    public class CreateInsuranceCompanyDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? TpaName { get; set; }
        public string? PayerId { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public bool PreAuthRequired { get; set; } = true;
    }

    public class UpdateInsuranceCompanyDto
    {
        public string? Name { get; set; }
        public string? Code { get; set; }
        public string? TpaName { get; set; }
        public string? PayerId { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public bool? PreAuthRequired { get; set; }
        public bool? IsActive { get; set; }
    }
}
