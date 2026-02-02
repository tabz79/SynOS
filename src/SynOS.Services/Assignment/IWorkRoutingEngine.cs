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
        Task<WorkAssignment> AssignAsync(WorkType workType, Guid sourceId, string department, string? role = null);

        /// <summary>
        /// Attempts to auto-assign any pending assignments when a resource becomes available.
        /// </summary>
        Task ProcessPendingAssignmentsAsync(Guid operationalResourceId);

        /// <summary>
        /// Updates the status and heartbeat of an operational resource.
        /// </summary>
        Task UpdateResourceStatusAsync(Guid userId, bool isOnline, bool isActive, string? station = null);
    }
}
