using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Processing;

namespace SynOS.Services.Operational
{
    public interface IProcessingService
    {
        Task<IEnumerable<ProcessingQueueItemDto>> GetQueueAsync();
        Task<ProcessingResult> ClaimAssignmentAsync(Guid processingAssignmentId);
        Task<ProcessingResult> CompleteAssignmentAsync(Guid processingAssignmentId);
    }

    public enum ProcessingResult
    {
        Success,
        NotFound,
        Conflict,
        InvalidBranch,
        InvalidDepartment,
        NotOperationalMode,
        NoOperationalResource,
        Unauthorized,
        InvalidState
    }
}
