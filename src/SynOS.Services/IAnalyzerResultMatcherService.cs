using System;
using System.Threading.Tasks;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IAnalyzerResultMatcherService
    {
        Task<LabAnalyzerResultInbox?> AutoMatchAsync(Guid inboxId, Guid currentUserId);
        Task<int> AutoMatchAllPendingAsync(Guid analyzerId, Guid currentUserId);
    }
}
