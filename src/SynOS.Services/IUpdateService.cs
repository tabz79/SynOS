using System;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IUpdateService
    {
        Task<bool> RunPreflightChecksAsync(string manifestJson);
        Task<bool> EvaluateMaintenanceWindowAsync();
        Task<bool> ExecuteUpdateAsync(string manifestJson);
        Task<bool> RollbackUpdateAsync(string manifestJson);
    }
}
