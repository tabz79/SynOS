using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs; // ADDED
using SynOS.Models.DTOs.Dashboard;
using System.Collections.Generic;

namespace SynOS.Services.Operations
{
    public interface IOperationsEngine
    {
        // Read Ports (Truth)
        Task<TodaysSummaryDto> GetDailyFulfillmentStatsAsync(Guid branchId);
        
        // Sample Lifecycle Write Authority
        Task RecordSampleCollectedAsync(Guid sampleId, Guid branchId, Guid actorId);
        Task RecordSampleRejectedAsync(Guid sampleId, Guid branchId, Guid actorId, string reason, bool requiresRecollection = false);
        // Task RecordSampleReceivedAsync(Guid sampleId, Guid branchId, Guid actorId); // Optional for now

        // Report Lifecycle Write Authority
        Task RecordReportSignedAsync(Guid reportId, Guid branchId, Guid actorId);
        Task RecordReportDeliveredAsync(Guid reportId, Guid branchId, Guid actorId);
        Task RecordResultsVerifiedAsync(Guid orderId, Guid branchId, Guid actorId, List<FinalResultDto> results); // ADDED
    }
}
