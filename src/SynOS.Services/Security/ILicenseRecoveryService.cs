using System.Threading;
using System.Threading.Tasks;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services.Security
{
    public interface ILicenseRecoveryService
    {
        /// <summary>
        /// Decrypts stored LicenseKey and validates against Control Tower.
        /// Thread-safe single-flight execution with 60-second caching threshold.
        /// Updates database profile and MiddlewareSyncHealth state.
        /// </summary>
        Task<bool> TriggerSelfHealingRecoveryAsync(SynOSDbContext dbContext, LabProfile? profile, CancellationToken stoppingToken = default);

        /// <summary>
        /// Validates a raw unencrypted license key string against Control Tower,
        /// encrypts and persists it in LabProfiles, reloads config, and updates MiddlewareSyncHealth state.
        /// </summary>
        Task<bool> ValidateKeyAndSyncProfileAsync(string rawLicenseKey, SynOSDbContext dbContext, LabProfile profile, CancellationToken stoppingToken = default);

        /// <summary>
        /// Decrypts and returns the active plaintext license key for outbound API calls.
        /// </summary>
        string GetEffectiveLicenseKey(LabProfile? profile);
    }
}
