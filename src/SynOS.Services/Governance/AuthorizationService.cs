using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;

namespace SynOS.Services.Governance
{
    public class AuthorizationService : IAuthorizationService
    {
        private readonly SynOSDbContext _context;

        public AuthorizationService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<bool> HasCapabilityAsync(Guid userId, string capabilityName)
        {
            return await (from assignment in _context.Assignments
                          join roleCap in _context.RoleCapabilities on assignment.RoleId equals roleCap.RoleId
                          join cap in _context.Capabilities on roleCap.CapabilityId equals cap.CapabilityId
                          where assignment.UserId == userId && cap.Name == capabilityName
                          select 1).AnyAsync();
        }

        public async Task<bool> IsApprovalRequiredAsync(string actionName, decimal amount)
        {
            var rule = await _context.ApprovalRules
                .AsNoTracking()
                .Where(r => r.ActionName == actionName && amount >= r.ThresholdAmount)
                .OrderByDescending(r => r.ThresholdAmount)
                .FirstOrDefaultAsync();

            return rule != null;
        }

        public async Task<bool> CanApproveAsync(Guid userId, string actionName, decimal amount)
        {
            var rule = await _context.ApprovalRules
                .AsNoTracking()
                .Where(r => r.ActionName == actionName && amount >= r.ThresholdAmount)
                .OrderByDescending(r => r.ThresholdAmount)
                .FirstOrDefaultAsync();

            if (rule == null)
            {
                return false;
            }

            var hasRole = await _context.Assignments
                .AnyAsync(a => a.UserId == userId && a.RoleId == rule.RequiredRoleId);

            return hasRole;
        }
    }
}
