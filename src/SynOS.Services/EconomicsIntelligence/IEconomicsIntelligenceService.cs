using System;
using System.Threading.Tasks;
using SynOS.Models.ReadModels.Economics;
using SynOS.Models.DTOs.Economics;

namespace SynOS.Services.EconomicsIntelligence
{
    /// <summary>
    /// Interface for the Economics Intelligence Service.
    /// This service provides read-only interpretations of economic data derived from truth engines.
    /// It performs no writes and is designed to be disposable and rebuildable.
    /// </summary>
    public interface IEconomicsIntelligenceService
    {
        /// <summary>
        /// Retrieves the attributed cost for a specific economic event.
        /// </summary>
        /// <param name="eventId">The unique identifier for the economic event (e.g., OrderId).</param>
        /// <returns>An EconomicEventCostView projection.</returns>
        Task<EconomicEventCostView> GetCostForEventAsync(Guid eventId);

        /// <summary>
        /// Retrieves the attributed revenue for a specific economic event.
        /// </summary>
        /// <param name="eventId">The unique identifier for the economic event (e.g., OrderId).</param>
        /// <returns>An EconomicEventRevenueView projection.</returns>
        Task<EconomicEventRevenueView> GetRevenueForEventAsync(Guid eventId);

        /// <summary>
        /// Retrieves the cash-based operational margin (Strict Facts: Movement vs Movement)
        /// </summary>
        Task<EconomicEventMarginView> GetCashMarginForEventAsync(Guid eventId);

        /// <summary>
        /// Retrieves the accrual-based operational margin (Obligations vs Recognized Revenue)
        /// </summary>
        Task<EconomicEventMarginView> GetAccrualMarginForEventAsync(Guid eventId);

        /// <summary>
        /// Retrieves the net operational position for the lab over a specific time period.
        /// Factors in Revenue, Consumables, Outsourced Tests, Referrals, Payroll, and Overhead.
        /// </summary>
        Task<LabProfitabilitySummaryDto> GetLabProfitabilitySummaryAsync(DateTime start, DateTime end, Guid? branchId = null);

        /// <summary>
        /// Retrieves a list of revenue facts for a given time period.
        /// </summary>
        Task<IEnumerable<object>> GetRevenueFactsAsync(DateTime start, DateTime end);

        /// <summary>
        /// Retrieves pending referral commission payables.
        /// </summary>
        Task<IEnumerable<object>> GetReferralPayablesAsync();

        /// <summary>
        /// Retrieves a summary of receivables grouped by partner.
        /// </summary>
        Task<IEnumerable<PartnerReceivableSummaryDto>> GetPartnerReceivablesSummaryAsync();

        /// <summary>
        /// Retrieves revenue trends for daily, weekly, and monthly buckets.
        /// </summary>
        Task<object> GetRevenueTrendsAsync(int days = 30);
        
        /// <summary>
        /// Retrieves a unified list of expenses (SpendFacts only) for a given time period.
        /// </summary>
        Task<IEnumerable<ExpenseFactDto>> GetExpenseFactsAsync(DateTime start, DateTime end);

        /// <summary>
        /// Retrieves a combined history of outflows (SpendFacts) and inflows (RevenueFacts).
        /// </summary>
        Task<IEnumerable<object>> GetSettlementHistoryAsync(string category = null);

        /// <summary>
        /// Retrieves a summary of vendor liabilities grouped by vendor.
        /// </summary>
        Task<IEnumerable<VendorPayableSummaryDto>> GetVendorPayablesSummaryAsync();
        
        /// <summary>
        /// Retrieves workforce cost summary (Liability + Actual Spend).
        /// </summary>
        Task<object> GetWorkforceBurnSummaryAsync(DateTime start, DateTime end);
        
        /// <summary>
        /// Retrieves pending statutory liabilities (PF, ESI, TDS).
        /// </summary>
        Task<object> GetComplianceLiabilitySummaryAsync();
    }
}
