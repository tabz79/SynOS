using System.Threading.Tasks;
using SynOS.Models.Dtos;

namespace SynOS.Services
{
    public interface ICatalogProvisioningService
    {
        /// <summary>
        /// Provision catalog changes to legacy runtime tables.
        /// </summary>
        /// <param name="dryRun">If true, calculates changes but does not commit them.</param>
        /// <param name="expectedVersionHash">The catalog hash from the preview stage to prevent race conditions.</param>
        /// <returns>A result containing impact statistics and status.</returns>
        Task<CatalogProvisioningResultDto> ProvisionAsync(bool dryRun, string? expectedVersionHash = null);

        /// <summary>
        /// Generates a deterministic hash of the current catalog state.
        /// </summary>
        Task<string> GetCatalogVersionHashAsync();
    }
}
