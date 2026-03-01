using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;

namespace SynOS.Services.Assignment
{
    public class WorkRoutingEngine : IWorkRoutingEngine
    {
        private readonly SynOSDbContext _db;
        private readonly ILogger<WorkRoutingEngine> _logger;

        public WorkRoutingEngine(SynOSDbContext db, ILogger<WorkRoutingEngine> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<WorkAssignment> AssignAsync(WorkType workType, Guid sourceId, Guid branchId, string department, string? role = null)
        {
            _logger.LogInformation("Attempting to assign work {WorkType} for source {SourceId} in {Department} at Branch {BranchId}", workType, sourceId, department, branchId);

            // 1. Find potential resources (Online & Active & Same Branch)
            var candidates = await _db.OperationalResources
                .Where(r => r.IsOnline && r.IsActive && r.Department == department && r.BranchId == branchId)
                .Where(r => string.IsNullOrEmpty(role) || r.Role == role)
                .ToListAsync();

            OperationalResource? selectedResource = null;

            if (candidates.Any())
            {
                // 2. DERIVED LOAD CALCULATION
                // We fetch the load for all candidates in one go
                var candidateIds = candidates.Select(c => c.OperationalResourceId).ToList();
                var loadCounts = await _db.WorkAssignments
                    .Where(a => a.AssignedResourceId.HasValue && candidateIds.Contains(a.AssignedResourceId.Value))
                    .Where(a => a.Status == WorkAssignmentStatus.Assigned || a.Status == WorkAssignmentStatus.InProgress)
                    .GroupBy(a => a.AssignedResourceId)
                    .Select(g => new { ResourceId = g.Key, Count = g.Count() })
                    .ToListAsync();

                // 3. LEAST-LOAD POLICY
                selectedResource = candidates
                    .OrderBy(c => loadCounts.FirstOrDefault(l => l.ResourceId == c.OperationalResourceId)?.Count ?? 0)
                    .ThenBy(c => c.LastHeartbeat ?? DateTime.MinValue) // Tie-breaker: oldest heartbeat (fairness)
                    .First();
            }

            // 4. CREATE ASSIGNMENT
            var assignment = new WorkAssignment
            {
                AssignmentId = Guid.NewGuid(),
                WorkType = workType,
                SourceReferenceId = sourceId,
                Department = department,
                RequiredRole = role,
                AssignedResourceId = selectedResource?.OperationalResourceId,
                Status = selectedResource != null ? WorkAssignmentStatus.Assigned : WorkAssignmentStatus.PendingAssignment,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _db.WorkAssignments.Add(assignment);
            await _db.SaveChangesAsync();

            if (selectedResource == null)
            {
                _logger.LogWarning("No active resource found for {WorkType} in {Department}. Created PendingAssignment.", workType, department);
            }
            else
            {
                _logger.LogInformation("Work {WorkType} assigned to {ResourceId} ({Station})", workType, selectedResource.OperationalResourceId, selectedResource.PhysicalStation);
            }

            return assignment;
        }

        public async Task ProcessPendingAssignmentsAsync(Guid operationalResourceId)
        {
            var resource = await _db.OperationalResources.FindAsync(operationalResourceId);
            if (resource == null || !resource.IsOnline || !resource.IsActive) return;

            // Find pending assignments that match this resource's profile
            var pending = await _db.WorkAssignments
                .Where(a => a.Status == WorkAssignmentStatus.PendingAssignment)
                .Where(a => a.Department == resource.Department)
                .Where(a => string.IsNullOrEmpty(a.RequiredRole) || a.RequiredRole == resource.Role)
                .OrderBy(a => a.CreatedAt)
                .ToListAsync();

            foreach (var assignment in pending)
            {
                // In a high-volume multi-threaded environment, we'd need a lock or atomic update here.
                assignment.AssignedResourceId = resource.OperationalResourceId;
                assignment.Status = WorkAssignmentStatus.Assigned;
                
                _logger.LogInformation("Auto-assigned pending work {WorkType} ({SourceId}) to newly available resource {ResourceId}", 
                    assignment.WorkType, assignment.SourceReferenceId, resource.OperationalResourceId);
            }

            if (pending.Any())
            {
                await _db.SaveChangesAsync();
            }
        }

        public async Task UpdateResourceStatusAsync(Guid userId, Guid branchId, Guid sessionId, bool isOnline, bool isActive, string? station = null)
        {
            var resource = await _db.OperationalResources.FirstOrDefaultAsync(r => r.UserId == userId);
            
            if (resource == null)
            {
                _logger.LogError("OperationalResource not found for user {UserId}", userId);
                return;
            }

            // ENFORCE Option A: Single Operational Session
            if (resource.ActiveSessionId.HasValue && sessionId != Guid.Empty && resource.ActiveSessionId.Value != sessionId)
            {
                _logger.LogWarning("Rejecting status update for User {UserId}. Multi-session conflict. Given: {GivenSession}, Active: {ActiveSession}", userId, sessionId, resource.ActiveSessionId);
                throw new UnauthorizedAccessException("SessionExpiredOperationalContext");
            }

            // Support Staff Rotation: Update branch context if it changed
            if (resource.BranchId != branchId)
            {
                _logger.LogInformation("Updating branch context for User {UserId} from {OldBranch} to {NewBranch}", userId, resource.BranchId, branchId);
                resource.BranchId = branchId;
            }

            resource.IsOnline = isOnline;
            resource.IsActive = isActive;
            resource.LastHeartbeat = DateTime.UtcNow;
            if (station != null) resource.PhysicalStation = station;

            await _db.SaveChangesAsync();
            
            if (isOnline && isActive)
            {
                await ProcessPendingAssignmentsAsync(resource.OperationalResourceId);
            }
        }
    }
}
