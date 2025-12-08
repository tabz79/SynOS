using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Services.Security
{
    public class RadiologyAccessGuard : IRadiologyAccessGuard
    {
        private readonly SynOSDbContext _context;

        public RadiologyAccessGuard(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task EnsureCanAccessStudyAsync(Guid radiologyStudyId, Guid currentUserId)
        {
            var study = await _context.RadiologyStudies
                .AsNoTracking()
                .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == radiologyStudyId);

            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }

            var user = await _context.Users
                .AsNoTracking()
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == currentUserId);

            if (user == null)
            {
                throw new UnauthorizedAccessException("User not found.");
            }

            var userRoles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            // SuperAdmin can access anything
            if (userRoles.Contains("Admin"))
            {
                return;
            }

            // TODO: Add OrgId/BranchId checks when available on User and Study entities.
            // if (user.OrgId != study.OrgId) { throw new UnauthorizedAccessException(...); }
            // if (!user.CanAccessAllBranches && user.BranchId != study.BranchId) { throw new UnauthorizedAccessException(...); }

            var allowedRoles = new[] { "Radiologist", "XRayTech" };
            if (userRoles.Any(role => allowedRoles.Contains(role)))
            {
                // Role is sufficient for now. Add more granular checks (e.g., assignment) if needed.
                return;
            }

            throw new UnauthorizedAccessException("User does not have sufficient permissions to access this study.");
        }

        public async Task EnsureCanAccessPacsInstanceAsync(Guid instanceId, Guid currentUserId)
        {
            var instance = await _context.PacsInstances
                .AsNoTracking()
                .Select(p => new { p.InstanceId, p.RadiologyStudyId })
                .FirstOrDefaultAsync(p => p.InstanceId == instanceId);

            if (instance == null)
            {
                throw new KeyNotFoundException($"PACS instance with ID '{instanceId}' not found.");
            }

            await EnsureCanAccessStudyAsync(instance.RadiologyStudyId, currentUserId);
        }
    }
}
