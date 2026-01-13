using System;
using System.Threading.Tasks;
using SynOS.Data;
using SynOS.Models.Entities.Compliance;
using SynOS.Services.Compliance.Exceptions;

namespace SynOS.Services.Compliance
{
    public class StatutoryObligationFactWriter : IStatutoryObligationFactWriter
    {
        private readonly SynOSDbContext _context;

        public StatutoryObligationFactWriter(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task CreateStatutoryObligationFactAsync(StatutoryObligationFact fact)
        {
            if (fact.SourceFactId == Guid.Empty)
            {
                throw new ComplianceEngineViolationException("StatutoryObligationFact must have a valid SourceFactId.");
            }

            if (fact.Amount < 0)
            {
                throw new ComplianceEngineViolationException("StatutoryObligationFact amount cannot be negative.");
            }

            // Enforce immutability of record time
            fact.RecordedAt = DateTime.UtcNow;

            // Ensure ID is set
            if (fact.StatutoryObligationFactId == Guid.Empty)
            {
                fact.StatutoryObligationFactId = Guid.NewGuid();
            }

            _context.Add(fact); // Using generic Add or DbContext.Set<T>().Add is fine.
                                // But I should probably add the DbSet to context first?
                                // Ah, I haven't added DbSet<StatutoryObligationFact> to SynOSDbContext.cs yet!
                                // The dry run plan had "Files I will MODIFY: SynOSDbContext.cs".
                                // I haven't done that yet for Module 7.
            
            // I'll use generic Add for now, but I must update DbContext next.
            // Actually, I should update DbContext BEFORE creating the writer to be safe, but generic Add works if entity is configured.
            
            await _context.SaveChangesAsync();
        }
    }
}
