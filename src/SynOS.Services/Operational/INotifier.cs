using System;
using System.Threading.Tasks;

namespace SynOS.Services.Operational
{
    public interface INotifier 
    {
        Task NotifyActionQueueDeltaAsync(string branchId, string visitId);
        Task NotifyRealitySummaryUpdateAsync(string branchId, Guid? targetUserId = null);
    }
}
