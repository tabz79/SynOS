using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/audit-logs")]
    [Authorize(Roles = "Admin")]
    public class AuditLogController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public AuditLogController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] DateTimeOffset? startDate,
            [FromQuery] DateTimeOffset? endDate,
            [FromQuery] Guid? actorUserId,
            [FromQuery] string? resourceType,
            [FromQuery] string? action,
            [FromQuery] int limit = 50,
            [FromQuery] int offset = 0)
        {
            var query = _context.AuditLogs
                .Include(a => a.ActorUser)
                .AsNoTracking();

            if (startDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt <= endDate.Value);
            }

            if (actorUserId.HasValue)
            {
                query = query.Where(a => a.ActorUserId == actorUserId.Value);
            }

            if (!string.IsNullOrWhiteSpace(resourceType))
            {
                query = query.Where(a => a.ResourceType.ToLower() == resourceType.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(a => a.Action.ToLower() == action.Trim().ToLower());
            }

            var totalCount = await query.CountAsync();

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(a => new
                {
                    a.AuditId,
                    a.ActorUserId,
                    ActorName = a.ActorUser != null ? a.ActorUser.Name : "System",
                    ActorUsername = a.ActorUser != null ? a.ActorUser.Username : "system",
                    a.Action,
                    a.ResourceType,
                    a.ResourceId,
                    a.Payload,
                    a.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                totalCount,
                limit,
                offset,
                logs
            });
        }
    }
}
