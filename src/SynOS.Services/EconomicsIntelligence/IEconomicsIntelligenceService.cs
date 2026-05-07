using System;
using System.Threading.Tasks;
using SynOS.Models.ReadModels.Economics;

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
        /// Retrieves the gross margin for a specific economic event.
        /// </summary>
        /// <param name="eventId">The unique identifier for the economic event (e.g., OrderId).</param>
        /// <returns>An EconomicEventMarginView projection.</returns>
        Task<EconomicEventMarginView> GetMarginForEventAsync(Guid eventId);

        /// <summary>
        /// Retrieves the net operational position for the lab over a specific time period.
        /// Factors in Revenue, Consumables, Outsourced Tests, Referrals, Payroll, and Overhead.
        /// </summary>
        Task<LabProfitabilitySummaryDto> GetLabProfitabilitySummaryAsync(DateTime start, DateTime end);
    }
}
