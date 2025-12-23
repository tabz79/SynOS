using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Revenue;

namespace SynOS.Services.Revenue
{
    /// <summary>
    /// Interface for the write-only Revenue Fact Writer.
    /// This service is responsible for persisting immutable RevenueFacts.
    /// It returns only the ID of the declared fact, not the fact entity itself.
    /// </summary>
    public interface IRevenueFactWriter
    {
        /// <summary>
        /// Declares and persists a new immutable RevenueFact.
        /// </summary>
        /// <param name="command">The command containing the details of the revenue fact.</param>
        /// <returns>The Guid of the newly created RevenueFact.</returns>
        Task<Guid> DeclareRevenueFactAsync(DeclareRevenueFactCommand command);
    }
}
