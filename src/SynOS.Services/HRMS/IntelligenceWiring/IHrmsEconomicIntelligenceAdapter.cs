using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.HRMS.IntelligenceWiring;

namespace SynOS.Services.HRMS.IntelligenceWiring
{
    /// <summary>
    /// Provides read-only access to labor cost facts for the Economic Intelligence layer.
    /// Focuses on accrual-based liability.
    /// </summary>
    public interface IHrmsEconomicIntelligenceAdapter
    {
        Task<List<PayrollCostFact>> GetPayrollCostFactsAsync(DateTime from, DateTime to);
        Task<List<StatutoryBurdenFact>> GetStatutoryBurdenFactsAsync(DateTime from, DateTime to);
    }
}
