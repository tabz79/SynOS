using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Operations;

namespace SynOS.Services.Phlebotomy
{
    public class AccessionNumberGenerator : IAccessionNumberGenerator
    {
        private readonly SynOSDbContext _db;
        private readonly IBranchTimeProvider _timeProvider;

        public AccessionNumberGenerator(SynOSDbContext db, IBranchTimeProvider timeProvider)
        {
            _db = db;
            _timeProvider = timeProvider;
        }

        public async Task<string> GenerateAsync(Guid branchId, string branchCode)
        {
            // Determine branch-local date.
            var localDate = _timeProvider.GetLocalDate(branchId);

            int sequence = 0;
            bool saved = false;

            while (!saved)
            {
                var counter = await _db.AccessionCounters
                    .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Date == localDate);

                if (counter == null)
                {
                    // Attempt to create the first record of the day
                    counter = new AccessionCounter
                    {
                        BranchId = branchId,
                        Date = localDate,
                        LastSequence = 1
                    };

                    try
                    {
                        _db.AccessionCounters.Add(counter);
                        await _db.SaveChangesAsync();
                        sequence = 1;
                        saved = true;
                    }
                    catch (DbUpdateException) // PK violation if another thread inserted it
                    {
                        // Clear tracker to ensure fresh reload on next loop iteration
                        _db.ChangeTracker.Clear();
                        continue; 
                    }
                }
                else
                {
                    // Increment existing counter
                    counter.LastSequence++;
                    
                    try
                    {
                        await _db.SaveChangesAsync(); // Optimistic concurrency via RowVersion
                        sequence = counter.LastSequence;
                        saved = true;
                    }
                    catch (DbUpdateConcurrencyException)
                    {
                        // Clear tracker and retry
                        _db.ChangeTracker.Clear();
                        continue;
                    }
                }
            }

            // Format: {branchCode}{yyMMdd}{6-digit-sequence}
            return $"{branchCode.ToUpper()}{localDate:yyMMdd}{sequence:D6}";
        }
    }
}
