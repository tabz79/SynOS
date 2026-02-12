using System;
using System.Threading.Tasks;
using SynOS.Models.Enums;
using SynOS.Models.ReadModels; // ADDED

namespace SynOS.Services.Operational
{
    public interface IOperationalEventWriter
    {
        /// <summary>
        /// Records an operational event. This is fire-and-forget (logged on failure)
        /// to ensure core transactions are never blocked by situational awareness logging.
        /// </summary>
        Task WriteEventAsync(
            BranchEventType eventType,
            string branchId,
            string visitId,
            string tokenId,
            string summaryText,
            string actorType = "System",
            string? actorName = null,
            bool saveChanges = true,
            Guid? sourceId = null,
            string? sourceType = null,
            TimelineVisibility visibility = TimelineVisibility.Hide,
            Guid? intentId = null,
            string? metadata = null);
    }
}
