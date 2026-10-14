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
    [Route("api/v1/corporate-accounts")]
    [Authorize]
    public class CorporateMasterController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public CorporateMasterController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = true)
        {
            var query = _context.CorporateAccounts.AsNoTracking();
            if (activeOnly)
            {
                query = query.Where(c => c.IsActive);
            }

            var accounts = await query
                .OrderBy(c => c.CompanyName)
                .Select(c => new
                {
                    c.CorporateAccountId,
                    c.CompanyName,
                    c.CorporateCode,
                    c.GstNumber,
                    c.ContactPerson,
                    c.ContactEmail,
                    c.ContactPhone,
                    c.BillingAddress,
                    c.CreditLimit,
                    c.PaymentTermsDays,
                    c.IsActive,
                    PackagesCount = c.RateRules.Count(r => r.IsActive && r.IsPackage),
                    RateRulesCount = c.RateRules.Count(r => r.IsActive)
                })
                .ToListAsync();

            return Ok(accounts);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var account = await _context.CorporateAccounts
                .Include(c => c.RateRules.Where(r => r.IsActive))
                    .ThenInclude(r => r.Test)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CorporateAccountId == id);

            if (account == null) return NotFound(new { message = $"Corporate account {id} not found" });
            return Ok(account);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCorporateAccountDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CompanyName))
                return BadRequest(new { message = "Company Name is required." });

            var code = !string.IsNullOrWhiteSpace(dto.CorporateCode)
                ? dto.CorporateCode.Trim().ToUpperInvariant()
                : dto.CompanyName.Substring(0, Math.Min(4, dto.CompanyName.Length)).ToUpperInvariant() + "-" + new Random().Next(10, 99);

            var account = new CorporateAccount
            {
                CorporateAccountId = Guid.NewGuid(),
                CompanyName = dto.CompanyName.Trim(),
                CorporateCode = code,
                GstNumber = dto.GstNumber?.Trim(),
                ContactPerson = dto.ContactPerson?.Trim(),
                ContactEmail = dto.ContactEmail?.Trim(),
                ContactPhone = dto.ContactPhone?.Trim(),
                BillingAddress = dto.BillingAddress?.Trim(),
                CreditLimit = dto.CreditLimit,
                PaymentTermsDays = dto.PaymentTermsDays > 0 ? dto.PaymentTermsDays : 30,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _context.CorporateAccounts.Add(account);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = account.CorporateAccountId }, account);
        }

        [HttpGet("{id}/rate-rules")]
        public async Task<IActionResult> GetRateRules(Guid id)
        {
            var rules = await _context.CorporateRateRules
                .Include(r => r.Test)
                .AsNoTracking()
                .Where(r => r.CorporateAccountId == id && r.IsActive)
                .Select(r => new
                {
                    r.CorporateRateRuleId,
                    r.CorporateAccountId,
                    r.TestId,
                    TestCode = r.Test.TestCode,
                    TestName = r.Test.TestName,
                    StandardPrice = r.Test.TestPricings.OrderByDescending(p => p.EffectiveFrom).Select(p => p.BasePrice).FirstOrDefault(),
                    r.ContractedPrice,
                    r.IsPackage,
                    r.PackageCode,
                    r.PackageName,
                    r.EffectiveFrom,
                    r.EffectiveTo,
                    r.IsActive
                })
                .ToListAsync();

            return Ok(rules);
        }

        [HttpPost("{id}/rate-rules")]
        public async Task<IActionResult> AddOrUpdateRateRule(Guid id, [FromBody] AddCorporateRateRuleDto dto)
        {
            var account = await _context.CorporateAccounts.FindAsync(id);
            if (account == null) return NotFound(new { message = $"Corporate account {id} not found" });

            var test = await _context.Tests.FindAsync(dto.TestId);
            if (test == null) return NotFound(new { message = $"Test {dto.TestId} not found" });

            var existing = await _context.CorporateRateRules
                .FirstOrDefaultAsync(r => r.CorporateAccountId == id && r.TestId == dto.TestId);

            if (existing != null)
            {
                existing.ContractedPrice = dto.ContractedPrice;
                existing.IsPackage = dto.IsPackage || test.IsProfile;
                existing.PackageCode = dto.PackageCode ?? (test.IsProfile ? $"PKG-{account.CorporateCode}-{test.TestCode}" : null);
                existing.PackageName = dto.PackageName ?? (test.IsProfile ? $"{account.CompanyName} ({test.TestName})" : null);
                existing.IsActive = true;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                var rule = new CorporateRateRule
                {
                    CorporateRateRuleId = Guid.NewGuid(),
                    CorporateAccountId = id,
                    TestId = dto.TestId,
                    ContractedPrice = dto.ContractedPrice,
                    IsPackage = dto.IsPackage || test.IsProfile,
                    PackageCode = dto.PackageCode ?? (test.IsProfile ? $"PKG-{account.CorporateCode}-{test.TestCode}" : null),
                    PackageName = dto.PackageName ?? (test.IsProfile ? $"{account.CompanyName} ({test.TestName})" : null),
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.CorporateRateRules.Add(rule);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }

    public class CreateCorporateAccountDto
    {
        [Required]
        public string CompanyName { get; set; } = string.Empty;
        public string? CorporateCode { get; set; }
        public string? GstNumber { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? BillingAddress { get; set; }
        public decimal? CreditLimit { get; set; }
        public int PaymentTermsDays { get; set; } = 30;
    }

    public class AddCorporateRateRuleDto
    {
        [Required]
        public Guid TestId { get; set; }
        [Required]
        public decimal ContractedPrice { get; set; }
        public bool IsPackage { get; set; } = false;
        public string? PackageCode { get; set; }
        public string? PackageName { get; set; }
    }
}
