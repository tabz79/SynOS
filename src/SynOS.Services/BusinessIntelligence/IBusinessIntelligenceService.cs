using System;
using System.Threading.Tasks;
using SynOS.Models.Enums.BusinessIntelligence;
using SynOS.Models.ReadModels.BusinessIntelligence;

namespace SynOS.Services.BusinessIntelligence
{
    /// <summary>
    /// Interface for the Business Intelligence Service.
    /// This service provides read-only aggregations and summaries for high-level visibility.
    /// </summary>
    public interface IBusinessIntelligenceService
    {
        Task<SpendSummaryView> GetSpendSummaryAsync(DateTimeOffset from, DateTimeOffset to, string currency);
        Task<RevenueSummaryView> GetRevenueSummaryAsync(DateTimeOffset from, DateTimeOffset to, string currency);
        Task<CashflowSummaryView> GetCashflowSummaryAsync(DateTimeOffset from, DateTimeOffset to); // Remains unchanged
        Task<VolumeTrendView> GetVolumeTrendsAsync(VolumeMetricType metricType, DateTimeOffset from, DateTimeOffset to);
    }
}