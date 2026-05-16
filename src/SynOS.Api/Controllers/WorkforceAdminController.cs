using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payroll;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/workforce-admin")]
    public class WorkforceAdminController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public WorkforceAdminController(SynOSDbContext context)
        {
            _context = context;
        }

        // --- STATUTORY CONFIGS ---

        [HttpGet("statutory-configs")]
        public async Task<IActionResult> GetStatutoryConfigs()
        {
            var configs = await _context.StatutoryConfigs.ToListAsync();
            return Ok(configs);
        }

        [HttpPost("statutory-configs")]
        public async Task<IActionResult> UpdateStatutoryConfig([FromBody] StatutoryConfig config)
        {
            if (config.ConfigId == Guid.Empty)
            {
                config.ConfigId = Guid.NewGuid();
                config.CreatedAt = DateTime.UtcNow;
                _context.StatutoryConfigs.Add(config);
            }
            else
            {
                _context.Entry(config).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();
            return Ok(config);
        }

        // --- SALARY ADVANCES ---

        [HttpGet("advances")]
        public async Task<IActionResult> GetAdvances()
        {
            var advances = await _context.SalaryAdvances
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
            return Ok(advances);
        }

        [HttpPost("advances")]
        public async Task<IActionResult> RequestAdvance([FromBody] SalaryAdvance advance)
        {
            advance.AdvanceId = Guid.NewGuid();
            advance.CreatedAt = DateTime.UtcNow;
            advance.IssuedAt = DateTime.UtcNow;
            advance.Status = "Pending";
            
            _context.SalaryAdvances.Add(advance);
            await _context.SaveChangesAsync();
            return Ok(advance);
        }

        [HttpPost("advances/{id}/approve")]
        public async Task<IActionResult> ApproveAdvance(Guid id)
        {
            var adv = await _context.SalaryAdvances.FindAsync(id);
            if (adv == null) return NotFound();
            
            adv.Status = "Approved"; // This will be adjusted in next payroll run
            await _context.SaveChangesAsync();
            return Ok(adv);
        }

        // --- AD-HOC ADJUSTMENTS ---

        [HttpGet("adjustments")]
        public async Task<IActionResult> GetAdjustments()
        {
            var adjustments = await _context.PayrollAdjustments
                .OrderByDescending(a => a.PayrollRunId)
                .ToListAsync();
            return Ok(adjustments);
        }

        [HttpPost("adjustments")]
        public async Task<IActionResult> CreateAdjustment([FromBody] PayrollAdjustment adjustment)
        {
            adjustment.PayrollAdjustmentId = Guid.NewGuid();
            _context.PayrollAdjustments.Add(adjustment);
            await _context.SaveChangesAsync();
            return Ok(adjustment);
        }
        // --- WORKFORCE POLICIES ---
        [HttpGet("policies")]
        public async Task<IActionResult> GetPolicies()
        {
            var policies = await _context.WorkforcePolicies.ToListAsync();
            return Ok(policies);
        }

        [HttpPost("policies")]
        public async Task<IActionResult> UpdatePolicy([FromBody] WorkforcePolicy policy)
        {
            if (policy.PolicyId == Guid.Empty)
            {
                policy.PolicyId = Guid.NewGuid();
                policy.UpdatedAt = DateTime.UtcNow;
                _context.WorkforcePolicies.Add(policy);
            }
            else
            {
                policy.UpdatedAt = DateTime.UtcNow;
                _context.Entry(policy).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();
            return Ok(policy);
        }

        [HttpPost("policies/sync-quotas")]
        public async Task<IActionResult> SyncQuotas([FromBody] int quota)
        {
            var employees = await _context.Employees.ToListAsync();
            foreach (var emp in employees)
            {
                emp.MonthlyPaidLeaveQuota = quota;
                emp.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return Ok(new { Count = employees.Count });
        }
    }
}
