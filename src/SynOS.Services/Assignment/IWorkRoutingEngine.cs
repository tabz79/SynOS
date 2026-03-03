using System;
using System.Threading.Tasks;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;

namespace SynOS.Services.Assignment
{
    public interface IWorkRoutingEngine
    {
        /// <summary>
        /// Assigns a work item to the best available resource based on policy.
        /// If no resource is available, creates a pending assignment (NULL resource).
        /// </summary>
        Task<WorkAssignment> AssignAsync(WorkType workType, Guid sourceId, Guid branchId, string department, string? role = null);

        /// <summary>
        /// Attempts to auto-assign any pending assignments when a resource becomes available.
        /// </summary>
        Task ProcessPendingAssignmentsAsync(Guid operationalResourceId);

        /// <summary>
        /// Updates the status, heartbeat, and branch context of an operational resource.
        /// </summary>
        Task UpdateResourceStatusAsync(Guid userId, Guid branchId, Guid sessionId, bool isOnline, bool isActive, string? station = null);

        /// <summary>
        /// Creates a work assignment in PendingClaim state without attempting auto-assignment.
        /// </summary>
        Task<WorkAssignment> CreateUnclaimedWorkAssignmentAsync(WorkType workType, Guid sourceId, Guid branchId, string department, string? role = null);
    }
}

