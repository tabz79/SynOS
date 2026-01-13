using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.HRMS.IntelligenceWiring;

namespace SynOS.Services.HRMS.IntelligenceWiring
{
    /// <summary>
    /// Provides read-only access to labor disbursement facts for the Business Intelligence layer.
    /// Focuses on cash outflow and liquidity impact.
    /// </summary>
    public interface IHrmsBusinessIntelligenceAdapter
    {
        Task<List<LaborDisbursementFact>> GetLaborDisbursementFactsAsync(DateTime from, DateTime to);
    }
}
