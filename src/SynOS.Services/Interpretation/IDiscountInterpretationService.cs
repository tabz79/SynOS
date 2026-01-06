using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SynOS.Models.Entities.Revenue;
using SynOS.Services.Interpretation.Dto;

namespace SynOS.Services.Interpretation
{
    public interface IDiscountInterpretationService
    {
        Task<IReadOnlyList<DiscountFact>> GetDiscountFactsForPeriodAsync(
            DateTime from,
            DateTime to,
            CancellationToken cancellationToken = default);

        Task<DiscountSummaryDto> GetDiscountSummaryAsync(
            DateTime from,
            DateTime to,
            CancellationToken cancellationToken = default);
    }
}
