using System;
using System.Threading.Tasks;

namespace SynOS.Services.Operational
{
    public interface INotifier 
    {
        Task NotifyActionQueueDeltaAsync(string branchId, string visitId);
        Task NotifyRealitySummaryUpdateAsync(string branchId, Guid? targetUserId = null);
        Task NotifyAssignmentUpdateAsync(string branchId, string departmentCode, Guid assignmentId, string status, string visitId, Guid? assignedResourceId = null, string? assignedTechnicianName = null);
        Task NotifyPrintJobAsync(string branchId, string printerType, string payload);
        Task NotifyInventoryShortageAsync(string branchId, string specimenId, string tubeCode, int required, int available);
    }
}
