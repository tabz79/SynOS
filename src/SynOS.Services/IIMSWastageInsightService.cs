using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.IMS;

namespace SynOS.Services
{
    public interface IIMSWastageInsightService
    {
        Task<IEnumerable<WastageMovementDto>> GetExpiryLossAsync();
        Task<IEnumerable<WastageMovementDto>> GetOperationalWastageAsync();
        Task<IEnumerable<WastageMovementDto>> GetCalibrationCostAsync();
        Task<IEnumerable<WastageMovementDto>> GetUnexplainedLossAsync();
    }
}
