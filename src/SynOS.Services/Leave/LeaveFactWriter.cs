using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Leave;
using SynOS.Models.Entities.Payroll;
using SynOS.Models.Enums;
using SynOS.Services.Leave.Exceptions;

namespace SynOS.Services.Leave
{
    public class LeaveFactWriter : ILeaveFactWriter
    {
        private readonly SynOSDbContext _context;

        public LeaveFactWriter(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task CreateLeaveFactAsync(LeaveFact newLeaveFact)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Guard: Mandatory Fields (Explicit check for non-default values)
                if (newLeaveFact.AuthorId == Guid.Empty)
                {
                    throw new LeaveEngineViolationException("AuthorId is required and cannot be empty.");
                }

                if (newLeaveFact.ApprovalTimestamp == default)
                {
                    throw new LeaveEngineViolationException("A valid ApprovalTimestamp is required.");
                }

                // Guard: Finalized Payroll Period Overlap
                // StartTime and EndTime must not overlap with any period that is already finalized
                var isInsideFinalizedPeriod = await _context.PayrollPeriods
                    .AnyAsync(pp => pp.Status == PayrollPeriodStatus.Finalized &&
                                    newLeaveFact.StartTime < pp.EndDate &&
                                    newLeaveFact.EndTime > pp.StartDate);

                if (isInsideFinalizedPeriod)
                {
                    throw new LeaveEngineViolationException("Cannot record leave facts that overlap with a finalized payroll period.");
                }

                // Guard: Overlap Logic (Excluding Cancelled Facts)
                // 1. Collect all OriginalLeaveFactIds from LeaveCancellationFacts (Unfiltered by employee)
                var cancelledLeaveFactIds = await _context.LeaveCancellationFacts
                    .Select(cf => cf.OriginalLeaveFactId)
                    .ToListAsync();

                // 2. Detect overlap only against LeaveFacts whose ID is NOT in the cancelled set
                var hasOverlap = await _context.LeaveFacts
                    .AnyAsync(lf => lf.EmployeeId == newLeaveFact.EmployeeId &&
                                    !cancelledLeaveFactIds.Contains(lf.LeaveFactId) &&
                                    newLeaveFact.StartTime < lf.EndTime &&
                                    newLeaveFact.EndTime > lf.StartTime);

                if (hasOverlap)
                {
                    throw new LeaveEngineViolationException("An active leave record already exists for the specified time range.");
                }

                // Persistence
                newLeaveFact.RecordedTimestamp = DateTime.UtcNow;
                _context.LeaveFacts.Add(newLeaveFact);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task CancelLeaveFactAsync(Guid originalLeaveFactId, Guid authorId)
        {
            // Guard: Existence
            var originalFact = await _context.LeaveFacts
                .AsNoTracking()
                .FirstOrDefaultAsync(lf => lf.LeaveFactId == originalLeaveFactId);

            if (originalFact == null)
            {
                throw new LeaveEngineViolationException("The targeted LeaveFact does not exist.");
            }

            // Guard: Duplicate Cancellation (Strict Idempotency)
            var alreadyCancelled = await _context.LeaveCancellationFacts
                .AnyAsync(cf => cf.OriginalLeaveFactId == originalLeaveFactId);

            if (alreadyCancelled)
            {
                throw new LeaveEngineViolationException("LeaveFact has already been cancelled.");
            }

            // Creation of Cancellation Fact
            var cancellationFact = new LeaveCancellationFact
            {
                LeaveCancellationFactId = Guid.NewGuid(),
                OriginalLeaveFactId = originalLeaveFactId,
                AuthorId = authorId,
                RecordedTimestamp = DateTime.UtcNow
            };

            _context.LeaveCancellationFacts.Add(cancellationFact);
            await _context.SaveChangesAsync();
        }
    }
}