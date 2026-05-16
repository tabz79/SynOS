using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.HR;
using SynOS.Services.EconomicsIntelligence;
using SynOS.Services.HR;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/staff")]
    public class StaffController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IEconomicsIntelligenceService _economicsIntelligence;
        private readonly IEmployeeAdminService _employeeAdmin;

        public StaffController(SynOSDbContext context, IEconomicsIntelligenceService economicsIntelligence, IEmployeeAdminService employeeAdmin)
        {
            _context = context;
            _economicsIntelligence = economicsIntelligence;
            _employeeAdmin = employeeAdmin;
        }

        [HttpGet]
        public async Task<IActionResult> GetStaff()
        {
            var staff = await _context.Employees
                .Include(e => e.User)
                .OrderBy(e => e.LastName)
                .ToListAsync();
            return Ok(staff);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetEmployee(Guid id)
        {
            var emp = await _context.Employees.FindAsync(id);
            if (emp == null) return NotFound();
            return Ok(emp);
        }

        [HttpPost]
        public async Task<IActionResult> CreateEmployee([FromBody] Employee employee)
        {
            employee.EmployeeId = Guid.NewGuid();
            employee.CreatedAt = DateTime.UtcNow;
            employee.UpdatedAt = DateTime.UtcNow;
            
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetEmployee), new { id = employee.EmployeeId }, employee);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] Employee employee)
        {
            if (id != employee.EmployeeId) return BadRequest();
            
            employee.UpdatedAt = DateTime.UtcNow;
            _context.Entry(employee).State = EntityState.Modified;
            
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Employees.Any(e => e.EmployeeId == id)) return NotFound();
                throw;
            }
            
            return NoContent();
        }

        [HttpGet("burn-summary")]
        public async Task<IActionResult> GetBurnSummary([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            var summary = await _economicsIntelligence.GetWorkforceBurnSummaryAsync(start, end);
            return Ok(summary);
        }

        [HttpGet("compliance-liability")]
        public async Task<IActionResult> GetComplianceLiability()
        {
            var summary = await _economicsIntelligence.GetComplianceLiabilitySummaryAsync();
            return Ok(summary);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(Guid id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- Identity-Workforce Governance Endpoints ---

        [HttpGet("pending-access")]
        public async Task<IActionResult> GetPendingAccess()
        {
            var pending = await _employeeAdmin.GetEmployeesPendingAccessAsync();
            return Ok(pending);
        }

        [HttpPost("{id}/provision-access")]
        public async Task<IActionResult> ProvisionAccess(Guid id, [FromBody] ProvisionAccessRequest request)
        {
            try
            {
                await _employeeAdmin.ProvisionUserFromEmployeeAsync(id, request.Username, request.Email, request.Password, request.Roles);
                return Ok(new { Message = "Access provisioned successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPatch("{id}/deactivate-access")]
        public async Task<IActionResult> DeactivateAccess(Guid id)
        {
            await _employeeAdmin.DeactivateUserAccessAsync(id);
            return NoContent();
        }

        [HttpPatch("{id}/reactivate-access")]
        public async Task<IActionResult> ReactivateAccess(Guid id)
        {
            await _employeeAdmin.ReactivateUserAccessAsync(id);
            return NoContent();
        }

        [HttpPost("sync-seeded-users")]
        public async Task<IActionResult> SyncSeededUsers()
        {
            await _employeeAdmin.SyncEmployeesFromUsersAsync();
            return Ok(new { Message = "Seeded users synced to workforce registry." });
        }
    }

    public class ProvisionAccessRequest
    {
        public string Username { get; set; }
        public string? Email { get; set; }
        public string Password { get; set; }
        public List<string> Roles { get; set; }
    }
}
