using System.Threading.Tasks;
using SynOS.Models.DTOs.Phlebotomy;

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
        Task<CollectionPlanDto?> GetCollectionPlanAsync(Guid visitId);
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
        NoOrdersFound,
        MissingBranchConfiguration
    }
}
