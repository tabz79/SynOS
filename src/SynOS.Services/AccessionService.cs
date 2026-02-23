using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class AccessionService : IAccessionService
    {
        private readonly SynOSDbContext _context;

        public AccessionService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateNextAccessionNumberAsync(Guid branchId, DateTime date)
        {
            // Ensure we are in a transaction (Caller Responsibility)
            if (_context.Database.CurrentTransaction == null)
            {
                // We could start one, but the contract says caller must manage it.
                // However, for robustness, we can check.
                // Or just proceed and let EF throw if UpdLock is not supported outside transaction? 
                // SQL Server supports locking hints outside explicitly begun transaction (implicit autocommit tx), 
                // but for our purpose (atomicity across multiple inserts), we need explicit tx.
                // We'll trust the caller as per contract, or throw.
                // keeping it simple for now.
            }

            var datePart = date.Date;

            // 1. Get Branch Code for formatting
            // We could cache this, but for now fetch it.
            var branch = await _context.Branches.FindAsync(branchId);
            if (branch == null) throw new InvalidOperationException($"Branch {branchId} not found.");
            var branchCode = branch.Code ?? "UNK";

            // 2. Atomic Get-Or-Create Sequence
            // First check if we already loaded or added the sequence in the current context
            var sequence = _context.AccessionSequences.Local
                .FirstOrDefault(s => s.BranchId == branchId && s.Date == datePart);

            // If not in local tracking, hit the database with UPDLOCK
            if (sequence == null)
            {
                sequence = await _context.AccessionSequences
                    .FromSqlRaw("SELECT * FROM AccessionSequences WITH (UPDLOCK, ROWLOCK) WHERE BranchId = {0} AND Date = {1}", branchId, datePart)
                    .SingleOrDefaultAsync();
            }

            int nextSeq;

            if (sequence == null)
            {
                // Create new sequence for the day
                nextSeq = 1;
                sequence = new AccessionSequence
                {
                    BranchId = branchId,
                    Date = datePart,
                    LastSequenceNumber = nextSeq
                };
                _context.AccessionSequences.Add(sequence);
            }
            else
            {
                // Increment existing
                sequence.LastSequenceNumber++;
                nextSeq = sequence.LastSequenceNumber;
                // EF Core tracks the change automatically
            }

            // Note: We do NOT call SaveChangesAsync here.
            // The caller (ReceptionFlowService) will call it to commit the transaction.
            // This ensures Accession generation and Specimen creation happen atomically.
            // Wait, if we don't save, the ID isn't persisted?
            // Correct. But the Lock is held!
            // The `FromSqlRaw` with `UPDLOCK` inside a transaction holds the lock until commit.
            // So no one else can read/write this row.
            // And any other thread trying `SELECT ... WITH (UPDLOCK)` will wait.
            // Perfect.

            // 3. Format
            // Format: CODE-YYMMDD-XXXX
            var dateStr = date.ToString("yyMMdd");
            return $"{branchCode}-{dateStr}-{nextSeq:D4}";
        }
        public async Task<string> GenerateRadiologyAccessionNumberAsync(Guid branchId)
        {
            // Reuse the same sequence logic but maybe prefix with 'RAD'?
            // Or just use the standard sequence.
            // For now, let's reuse standard sequence for simplicity in 'Big Bang'.
            // Caller needs to provide 'Date'. We'll assume Today.
            return await GenerateNextAccessionNumberAsync(branchId, DateTime.UtcNow);
        }
    }
}
