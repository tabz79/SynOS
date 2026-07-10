using System;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IUpdateService
    {
        Task<bool> RunPreflightChecksAsync(string manifestJson);
        Task<UpdateReadinessReport> AssessUpdateReadinessAsync(string manifestJson);
        Task<bool> ExecuteUpdateAsync(string manifestJson);
        Task<bool> RollbackUpdateAsync(string manifestJson);
    }
}
