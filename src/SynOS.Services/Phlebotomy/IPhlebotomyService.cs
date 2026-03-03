using System;
using System.Threading.Tasks;

namespace SynOS.Services.Phlebotomy
{
    public interface IPhlebotomyService
    {
        /// <summary>
        /// Atomically claims a pending work assignment for the current operational user.
        /// </summary>
        /// <param name="assignmentId">The ID of the assignment to claim.</param>
        /// <returns>A result indicating success or failure reasons (Conflict, Forbidden, etc.)</returns>
        Task<ClaimResult> ClaimAssignmentAsync(Guid assignmentId);
        Task<CollectResult> CollectAssignmentAsync(Guid assignmentId);
    }

    public enum ClaimResult
    {
        Success,
        NotFound,
        AlreadyClaimed,
        InvalidBranch,
        NotOperationalMode,
        NoOperationalResource
    }

    public enum CollectResult
    {
        Success,
        NotFound,
        NotOperationalMode,
        NoOperationalResource,
        Unauthorized,
        InvalidState,
        NoOrdersFound
    }
}
