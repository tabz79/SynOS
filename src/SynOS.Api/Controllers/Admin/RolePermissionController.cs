using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Governance;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/roles")]
    [Authorize(Roles = "Admin")]
    public class RolePermissionController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public RolePermissionController(SynOSDbContext context)
        {
            _context = context;
        }

        // --- Matrix Endpoints ---

        [HttpGet("matrix")]
        public async Task<IActionResult> GetPermissionsMatrix()
        {
            var roles = await _context.Roles
                .Select(r => new { r.RoleId, r.Name })
                .ToListAsync();

            var capabilities = await _context.Capabilities
                .Select(c => new { c.CapabilityId, c.Name, c.Module, c.Action })
                .ToListAsync();

            var mappings = await _context.RoleCapabilities
                .Select(m => new { m.RoleId, m.CapabilityId })
                .ToListAsync();

            return Ok(new
            {
                roles,
                capabilities,
                mappings
            });
        }

        [HttpPost("matrix")]
        public async Task<IActionResult> UpdateRoleCapabilities([FromBody] UpdateRoleCapabilitiesRequest request)
        {
            if (request == null || request.RoleId == Guid.Empty)
            {
                return BadRequest("Invalid role capability update request.");
            }

            var roleExists = await _context.Roles.AnyAsync(r => r.RoleId == request.RoleId);
            if (!roleExists)
            {
                return NotFound("Role not found.");
            }

            // Remove existing mappings for this role
            var existing = await _context.RoleCapabilities
                .Where(rc => rc.RoleId == request.RoleId)
                .ToListAsync();
            _context.RoleCapabilities.RemoveRange(existing);

            // Add new mappings
            if (request.CapabilityIds != null)
            {
                foreach (var capId in request.CapabilityIds)
                {
                    var capExists = await _context.Capabilities.AnyAsync(c => c.CapabilityId == capId);
                    if (capExists)
                    {
                        _context.RoleCapabilities.Add(new RoleCapability
                        {
                            RoleCapabilityId = Guid.NewGuid(),
                            RoleId = request.RoleId,
                            CapabilityId = capId
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Role capabilities updated successfully." });
        }

        // --- Department Scope / Policy Endpoints ---

        [HttpGet("department-policies")]
        public async Task<IActionResult> GetDepartmentPolicies()
        {
            var policies = await _context.RoleDepartmentConfigs
                .Include(p => p.DepartmentMaster)
                .Select(p => new
                {
                    p.ConfigId,
                    p.RoleName,
                    p.DepartmentId,
                    DepartmentName = p.DepartmentMaster != null ? p.DepartmentMaster.Name : "Unknown",
                    DepartmentCode = p.DepartmentMaster != null ? p.DepartmentMaster.Code : "UNK",
                    p.OperatingHoursStart,
                    p.OperatingHoursEnd,
                    p.DefaultTATHours,
                    p.CanSearchAll,
                    p.CreatedAt
                })
                .ToListAsync();

            return Ok(policies);
        }

        [HttpPost("department-policies")]
        public async Task<IActionResult> SaveDepartmentPolicy([FromBody] SaveDepartmentPolicyRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var deptExists = await _context.DepartmentMasters.AnyAsync(d => d.DepartmentId == request.DepartmentId);
            if (!deptExists)
            {
                return BadRequest("Referenced department not found.");
            }

            RoleDepartmentConfig? config = null;

            if (request.ConfigId.HasValue && request.ConfigId.Value != Guid.Empty)
            {
                config = await _context.RoleDepartmentConfigs.FindAsync(request.ConfigId.Value);
            }

            // Check duplicate mapping: RoleName + DepartmentId
            if (config == null)
            {
                var exists = await _context.RoleDepartmentConfigs
                    .AnyAsync(c => c.RoleName.ToLower() == request.RoleName.Trim().ToLower() && c.DepartmentId == request.DepartmentId);
                
                if (exists)
                {
                    return Conflict("A policy mapping already exists for this Role and Department combination.");
                }

                config = new RoleDepartmentConfig
                {
                    ConfigId = Guid.NewGuid(),
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.RoleDepartmentConfigs.Add(config);
            }

            config.RoleName = request.RoleName.Trim();
            config.DepartmentId = request.DepartmentId;
            config.OperatingHoursStart = request.OperatingHoursStart;
            config.OperatingHoursEnd = request.OperatingHoursEnd;
            config.DefaultTATHours = request.DefaultTATHours;
            config.CanSearchAll = request.CanSearchAll;
            config.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(config);
        }

        [HttpDelete("department-policies/{id}")]
        public async Task<IActionResult> DeleteDepartmentPolicy(Guid id)
        {
            var config = await _context.RoleDepartmentConfigs.FindAsync(id);
            if (config == null)
            {
                return NotFound("Department policy mapping not found.");
            }

            _context.RoleDepartmentConfigs.Remove(config);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    public class UpdateRoleCapabilitiesRequest
    {
        public Guid RoleId { get; set; }
        public List<Guid> CapabilityIds { get; set; } = new();
    }

    public class SaveDepartmentPolicyRequest
    {
        public Guid? ConfigId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public Guid DepartmentId { get; set; }
        public string OperatingHoursStart { get; set; } = "08:00";
        public string OperatingHoursEnd { get; set; } = "20:00";
        public int DefaultTATHours { get; set; } = 24;
        public bool CanSearchAll { get; set; } = false;
    }
}
