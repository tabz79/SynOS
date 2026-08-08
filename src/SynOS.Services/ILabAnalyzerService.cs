using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface ILabAnalyzerService
    {
        Task<LabAnalyzer> CreateAnalyzerAsync(CreateLabAnalyzerDto dto, Guid currentUserId);
        Task<LabAnalyzer> UpdateAnalyzerAsync(Guid analyzerId, UpdateLabAnalyzerDto dto, Guid currentUserId);
        Task<LabAnalyzer?> GetAnalyzerAsync(Guid analyzerId);
        Task<IReadOnlyList<LabAnalyzer>> GetAnalyzersAsync();
        Task<LabAnalyzerResultInbox> EnqueueManualResultAsync(Guid analyzerId, ManualAnalyzerResultDto dto, Guid currentUserId, string? statusOverride = null, string? errorMessage = null);
        
        Task<bool> DeleteAnalyzerAsync(Guid analyzerId, Guid currentUserId);
        Task<AnalyzerListener?> GetAnalyzerListenerAsync(Guid analyzerId);
        Task<AnalyzerListener> SaveAnalyzerListenerAsync(Guid analyzerId, AnalyzerListener listenerConfig);

        // Optional: Get inbox items (for debugging/testing as per prompt)
        Task<IReadOnlyList<LabAnalyzerResultInbox>> GetInboxItemsAsync(Guid analyzerId, int limit = 50);
    }
}
