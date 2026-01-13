using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.HRMS.IntelligenceWiring;

namespace SynOS.Services.HRMS.IntelligenceWiring
{
    public class HrmsBusinessIntelligenceAdapter : IHrmsBusinessIntelligenceAdapter
    {
        private readonly SynOSDbContext _context;

        public HrmsBusinessIntelligenceAdapter(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<List<LaborDisbursementFact>> GetLaborDisbursementFactsAsync(DateTime from, DateTime to)
        {
            // Filter by labor-related channels as defined in Spend Engine PRD
            string[] laborChannels = { "Salary Payable", "Referral / Commission Payable", "Taxes & Statutory Payable" };

            return await _context.SpendFacts.AsNoTracking()
                .Where(s => s.OccurredAt >= from && s.OccurredAt <= to && laborChannels.Contains(s.Channel))
                .Select(s => new LaborDisbursementFact
                {
                    SpendFactId = s.SpendFactId,
                    PayeeId = s.PayeeId,
                    Amount = s.Amount,
                    Currency = s.Currency,
                    Channel = s.Channel,
                    OccurredAt = s.OccurredAt,
                    TransactionReference = s.TransactionReference
                })
                .ToListAsync();
        }
    }
}
