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

        [HttpGet("visits")]
        public async Task<IActionResult> GetVisits([FromQuery] Guid? corporateAccountId)
        {
            var query = _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Invoices)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .AsNoTracking()
                .Where(v => v.CorporateAccountId != null || v.PaymentCollectionModel == "Corporate");

            if (corporateAccountId.HasValue)
            {
                query = query.Where(v => v.CorporateAccountId == corporateAccountId.Value);
            }

            var visits = await query
                .OrderByDescending(v => v.CreatedAt)
                .Take(100)
                .ToListAsync();

            var corpIds = visits.Where(v => v.CorporateAccountId.HasValue).Select(v => v.CorporateAccountId!.Value).Distinct().ToList();
            var corps = await _context.CorporateAccounts
                .Where(c => corpIds.Contains(c.CorporateAccountId))
                .ToDictionaryAsync(c => c.CorporateAccountId, c => c.CompanyName);

            var result = visits.Select(v =>
            {
                var invoice = v.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                var grossAmount = invoice != null ? invoice.GrossAmount : v.Orders.Where(o => o.Status != SynOS.Models.Enums.OrderStatus.Cancelled).Sum(o => o.Price);
                var compName = v.CorporateAccountId.HasValue && corps.ContainsKey(v.CorporateAccountId.Value)
                    ? corps[v.CorporateAccountId.Value]
                    : "Corporate Account";
                var patName = !string.IsNullOrWhiteSpace(v.Patient?.DisplayName)
                    ? v.Patient.DisplayName
                    : $"{v.Patient?.FirstName} {v.Patient?.LastName}".Trim();

                return new
                {
                    VisitId = v.VisitId,
                    PatientName = !string.IsNullOrWhiteSpace(patName) ? patName : "Unknown Patient",
                    PatientMrn = v.Patient?.MRN ?? "",
                    CorporateAccountId = v.CorporateAccountId,
                    CompanyName = compName,
                    EmployeeId = v.EmployeeId ?? "N/A",
                    GrossAmount = grossAmount,
                    Status = invoice?.Status ?? v.Status.ToString(),
                    CreatedAt = v.CreatedAt
                };
            }).ToList();

            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCorporateAccountDto dto)
        {
            var account = await _context.CorporateAccounts.FindAsync(id);
            if (account == null) return NotFound(new { message = $"Corporate account {id} not found" });

            if (!string.IsNullOrWhiteSpace(dto.CompanyName)) account.CompanyName = dto.CompanyName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.CorporateCode)) account.CorporateCode = dto.CorporateCode.Trim().ToUpperInvariant();
            account.GstNumber = dto.GstNumber?.Trim();
            account.ContactPerson = dto.ContactPerson?.Trim();
            account.ContactEmail = dto.ContactEmail?.Trim();
            account.ContactPhone = dto.ContactPhone?.Trim();
            account.BillingAddress = dto.BillingAddress?.Trim();
            if (dto.CreditLimit.HasValue) account.CreditLimit = dto.CreditLimit.Value;
            if (dto.PaymentTermsDays.HasValue && dto.PaymentTermsDays.Value > 0) account.PaymentTermsDays = dto.PaymentTermsDays.Value;
            if (dto.IsActive.HasValue) account.IsActive = dto.IsActive.Value;
            account.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(account);
        }

        [HttpGet("{id}/rate-rules")]
        public async Task<IActionResult> GetRateRules(Guid id)
        {
            var rules = await _context.CorporateRateRules
                .Include(r => r.Test)
                    .ThenInclude(t => t.ProfileChildren)
                        .ThenInclude(pc => pc.ChildTest)
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
                    IncludedTests = r.Test.ProfileChildren.Select(pc => new
                    {
                        pc.ChildTest.TestId,
                        pc.ChildTest.TestCode,
                        pc.ChildTest.TestName
                    }).ToList(),
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

            // Sync with Test.ExtraInfo corporatePrice for bidirectional reflection with Test Master
            try
            {
                var dict = new Dictionary<string, object>();
                if (!string.IsNullOrWhiteSpace(test.ExtraInfo))
                {
                    dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(test.ExtraInfo) ?? dict;
                }
                dict["corporatePrice"] = dto.ContractedPrice;
                test.ExtraInfo = System.Text.Json.JsonSerializer.Serialize(dict);
            }
            catch {}

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("{id}/rate-rules/{ruleId}")]
        public async Task<IActionResult> DeleteRateRule(Guid id, Guid ruleId)
        {
            var rule = await _context.CorporateRateRules.FirstOrDefaultAsync(r => r.CorporateAccountId == id && r.CorporateRateRuleId == ruleId);
            if (rule == null) return NotFound(new { message = "Rate rule not found" });

            _context.CorporateRateRules.Remove(rule);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("{id}/packages")]
        public async Task<IActionResult> CreateCorporatePackage(Guid id, [FromBody] CreateCorporatePackageDto dto)
        {
            var account = await _context.CorporateAccounts.FindAsync(id);
            if (account == null) return NotFound(new { message = $"Corporate account {id} not found" });

            if (string.IsNullOrWhiteSpace(dto.PackageName))
                return BadRequest(new { message = "Package Name is required." });

            var code = !string.IsNullOrWhiteSpace(dto.PackageCode)
                ? dto.PackageCode.Trim().ToUpperInvariant()
                : $"PKG-{account.CorporateCode}-{new Random().Next(100, 999)}";

            var existingTest = await _context.Tests
                .Include(t => t.ProfileChildren)
                .FirstOrDefaultAsync(t => t.TestCode == code);

            Test packageTest;
            if (existingTest != null)
            {
                packageTest = existingTest;
                packageTest.TestName = dto.PackageName.Trim();
                packageTest.IsProfile = true;
                packageTest.Category = "CorporatePackage";
            }
            else
            {
                packageTest = new Test
                {
                    TestId = Guid.NewGuid(),
                    TestCode = code,
                    TestName = dto.PackageName.Trim(),
                    IsProfile = true,
                    Category = "CorporatePackage",
                    SpecimenTypeCode = "SER",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.Tests.Add(packageTest);
            }

            if (dto.IncludedTestIds != null && dto.IncludedTestIds.Any())
            {
                var existingMaps = await _context.ProfileMaps
                    .Where(m => m.ParentTestId == packageTest.TestId)
                    .ToListAsync();
                _context.ProfileMaps.RemoveRange(existingMaps);

                int order = 1;
                foreach (var childId in dto.IncludedTestIds)
                {
                    _context.ProfileMaps.Add(new ProfileMap
                    {
                        ProfileMapId = Guid.NewGuid(),
                        ParentTestId = packageTest.TestId,
                        ChildTestId = childId,
                        Sequence = order++
                    });
                }
            }

            var existingRule = await _context.CorporateRateRules
                .FirstOrDefaultAsync(r => r.CorporateAccountId == id && r.TestId == packageTest.TestId);

            if (existingRule != null)
            {
                existingRule.ContractedPrice = dto.ContractedPrice;
                existingRule.IsPackage = true;
                existingRule.PackageCode = code;
                existingRule.PackageName = dto.PackageName.Trim();
                existingRule.IsActive = true;
                existingRule.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                var rule = new CorporateRateRule
                {
                    CorporateRateRuleId = Guid.NewGuid(),
                    CorporateAccountId = id,
                    TestId = packageTest.TestId,
                    ContractedPrice = dto.ContractedPrice,
                    IsPackage = true,
                    PackageCode = code,
                    PackageName = dto.PackageName.Trim(),
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.CorporateRateRules.Add(rule);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, packageTestId = packageTest.TestId, packageCode = code });
        }

        [HttpPut("{id}/packages/{ruleId}")]
        public async Task<IActionResult> UpdateCorporatePackage(Guid id, Guid ruleId, [FromBody] UpdateCorporatePackageDto dto)
        {
            var rule = await _context.CorporateRateRules
                .Include(r => r.Test)
                    .ThenInclude(t => t.ProfileChildren)
                .FirstOrDefaultAsync(r => r.CorporateAccountId == id && r.CorporateRateRuleId == ruleId);

            if (rule == null) return NotFound(new { message = "Package rate rule not found" });

            if (!string.IsNullOrWhiteSpace(dto.PackageName))
            {
                rule.PackageName = dto.PackageName.Trim();
                if (rule.Test != null)
                {
                    rule.Test.TestName = dto.PackageName.Trim();
                }
            }

            if (!string.IsNullOrWhiteSpace(dto.PackageCode))
            {
                rule.PackageCode = dto.PackageCode.Trim().ToUpperInvariant();
                if (rule.Test != null)
                {
                    rule.Test.TestCode = rule.PackageCode;
                }
            }

            if (dto.ContractedPrice.HasValue && dto.ContractedPrice.Value >= 0)
            {
                rule.ContractedPrice = dto.ContractedPrice.Value;
            }

            if (dto.IncludedTestIds != null && rule.Test != null)
            {
                var existingMaps = await _context.ProfileMaps
                    .Where(m => m.ParentTestId == rule.Test.TestId)
                    .ToListAsync();
                _context.ProfileMaps.RemoveRange(existingMaps);

                int order = 1;
                foreach (var childId in dto.IncludedTestIds)
                {
                    _context.ProfileMaps.Add(new ProfileMap
                    {
                        ProfileMapId = Guid.NewGuid(),
                        ParentTestId = rule.Test.TestId,
                        ChildTestId = childId,
                        Sequence = order++
                    });
                }
            }

            rule.UpdatedAt = DateTimeOffset.UtcNow;
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

    public class UpdateCorporateAccountDto
    {
        public string? CompanyName { get; set; }
        public string? CorporateCode { get; set; }
        public string? GstNumber { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? BillingAddress { get; set; }
        public decimal? CreditLimit { get; set; }
        public int? PaymentTermsDays { get; set; }
        public bool? IsActive { get; set; }
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

    public class CreateCorporatePackageDto
    {
        [Required]
        public string PackageName { get; set; } = string.Empty;
        public string? PackageCode { get; set; }
        [Required]
        public decimal ContractedPrice { get; set; }
        public System.Collections.Generic.List<Guid> IncludedTestIds { get; set; } = new();
    }

    public class UpdateCorporatePackageDto
    {
        public string? PackageName { get; set; }
        public string? PackageCode { get; set; }
        public decimal? ContractedPrice { get; set; }
        public System.Collections.Generic.List<Guid>? IncludedTestIds { get; set; }
    }
}
