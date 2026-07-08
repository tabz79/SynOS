using System;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IBackupService
    {
        Task<Guid> ExecuteBackupAsync(string backupType);
        Task<bool> VerifyBackupAsync(Guid backupId, string backupFilePath);
        Task<bool> ExecuteRestoreAsync(Guid backupId, string backupFilePath, Guid initiatedByUserId);
        Task<bool> RunSandboxedTestRestoreAsync(Guid backupId, string backupFilePath);
    }
}
