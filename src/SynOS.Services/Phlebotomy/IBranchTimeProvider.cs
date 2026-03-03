using System;

namespace SynOS.Services.Phlebotomy
{
    public interface IBranchTimeProvider
    {
        /// <summary>
        /// Gets the current local date for a specific branch.
        /// </summary>
        DateOnly GetLocalDate(Guid branchId);
    }
}
