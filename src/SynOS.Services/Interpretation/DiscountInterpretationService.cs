using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Revenue;
using SynOS.Services.Interpretation.Dto;

namespace SynOS.Services.Interpretation
{
    public class DiscountInterpretationService : IDiscountInterpretationService
    {
        private readonly SynOSDbContext _context;

        public DiscountInterpretationService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<DiscountFact>> GetDiscountFactsForPeriodAsync(
            DateTime from,
            DateTime to,
            CancellationToken cancellationToken = default)
        {
            return await _context.DiscountFacts
                .AsNoTracking()
                .Where(df => df.AppliedAt >= from && df.AppliedAt <= to)
                .OrderBy(df => df.AppliedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task<DiscountSummaryDto> GetDiscountSummaryAsync(
            DateTime from,
            DateTime to,
            CancellationToken cancellationToken = default)
        {
            var discountFacts = await GetDiscountFactsForPeriodAsync(from, to, cancellationToken);

            var totalDiscountAmount = discountFacts.Sum(df => df.DiscountAmount);
            var discountCount = discountFacts.Count;

            return new DiscountSummaryDto
            {
                TotalDiscountAmount = totalDiscountAmount,
                DiscountCount = discountCount
            };
        }
    }
}
