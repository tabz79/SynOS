using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Services.SpendEngine.Exceptions;

namespace SynOS.Services.SpendEngine
{
    public class SpendFactWriter : ISpendFactWriter
    {
        private readonly SynOSDbContext _context;

        public SpendFactWriter(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task CreateSpendFactAsync(SpendFact fact)
        {
            // Idempotency by TransactionReference
            var existingFact = await _context.SpendFacts
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.TransactionReference == fact.TransactionReference);

            if (existingFact != null)
            {
                throw new SpendEngineViolationException($"SpendFact with TransactionReference '{fact.TransactionReference}' already exists.");
            }

            // Append-only write
            _context.SpendFacts.Add(fact);
            await _context.SaveChangesAsync();
        }
    }
}
