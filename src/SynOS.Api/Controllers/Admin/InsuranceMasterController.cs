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

        [HttpGet("claims")]
        public async Task<IActionResult> GetClaims([FromQuery] Guid? companyId)
        {
            var query = _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Invoices)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .AsNoTracking()
                .Where(v => v.InsuranceCompanyId != null || v.PaymentCollectionModel == "Insurance");

            if (companyId.HasValue)
            {
                query = query.Where(v => v.InsuranceCompanyId == companyId.Value);
            }

            var visits = await query
                .OrderByDescending(v => v.CreatedAt)
                .Take(100)
                .ToListAsync();

            var companyIds = visits.Where(v => v.InsuranceCompanyId.HasValue).Select(v => v.InsuranceCompanyId!.Value).Distinct().ToList();
            var companies = await _context.InsuranceCompanies
                .Where(c => companyIds.Contains(c.InsuranceCompanyId))
                .ToDictionaryAsync(c => c.InsuranceCompanyId, c => c.Name);

            var claims = visits.Select(v =>
            {
                var invoice = v.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                var grossAmount = invoice != null ? invoice.GrossAmount : v.Orders.Where(o => o.Status != SynOS.Models.Enums.OrderStatus.Cancelled).Sum(o => o.Price);
                var coPay = v.InsuranceCoPayAmount;
                var claimDue = Math.Max(0m, grossAmount - coPay);
                var compName = v.InsuranceCompanyId.HasValue && companies.ContainsKey(v.InsuranceCompanyId.Value)
                    ? companies[v.InsuranceCompanyId.Value]
                    : "Empanelled Insurer";
                var patName = !string.IsNullOrWhiteSpace(v.Patient?.DisplayName)
                    ? v.Patient.DisplayName
                    : $"{v.Patient?.FirstName} {v.Patient?.LastName}".Trim();

                var testNames = v.Orders.Where(o => o.Status != SynOS.Models.Enums.OrderStatus.Cancelled && o.Test != null).Select(o => o.Test.TestName).ToList();
                var testsSummary = string.Join(", ", testNames);

                return new
                {
                    VisitId = v.VisitId,
                    Token = v.Token,
                    VisitToken = v.Token,
                    InvoiceNumber = invoice != null ? $"INV-{invoice.InvoiceId.ToString().Substring(0, 8).ToUpper()}" : v.Token,
                    PatientName = !string.IsNullOrWhiteSpace(patName) ? patName : "Unknown Patient",
                    PatientMrn = v.Patient?.MRN ?? "",
                    InsuranceCompanyId = v.InsuranceCompanyId,
                    InsuranceCompanyName = compName,
                    PolicyNumber = v.PolicyNumber ?? "N/A",
                    PreAuthApprovalNumber = v.PreAuthApprovalNumber ?? "PENDING",
                    GrossAmount = grossAmount,
                    CoPayAmount = coPay,
                    ClaimAmount = claimDue,
                    Status = invoice?.Status ?? v.Status.ToString(),
                    TestsSummary = testsSummary,
                    Tests = testNames,
                    CreatedAt = v.CreatedAt,
                    OccurredAt = v.CreatedAt,
                    Date = v.CreatedAt
                };
            }).ToList();

            return Ok(claims);
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
