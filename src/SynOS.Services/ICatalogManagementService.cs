using System.Threading.Tasks;
using SynOS.Models.Dtos;
using SynOS.Models.Entities.Catalog;

namespace SynOS.Services
{
    public interface ICatalogManagementService
    {
        /// <summary>
        /// Safely updates a catalog test and automatically triggers provisioning.
        /// Performs a deterministic rollback if provisioning fails.
        /// </summary>
        Task<CatalogManagementResultDto> UpdateTestAsync(CatalogTest test);

        /// <summary>
        /// Safely updates a catalog parameter and automatically triggers provisioning.
        /// Performs a deterministic rollback if provisioning fails.
        /// </summary>
        Task<CatalogManagementResultDto> UpdateParameterAsync(CatalogParameter parameter);
        
        // Note: Additional methods for Departments, Specimens, etc. can be added following the same pattern.
    }

    public class CatalogManagementResultDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public CatalogProvisioningResultDto? ProvisioningResult { get; set; }
    }
}
