using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Time;
using SynOS.Models.Enums;
using SynOS.Services.Time.Exceptions;

namespace SynOS.Services.Time
{
    public class TimeFactWriter : ITimeFactWriter
    {
        private readonly SynOSDbContext _context;

        public TimeFactWriter(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<ClockEventFact> RecordClockEventAsync(Guid employeeId, DateTime effectiveTimestamp, Guid authorId, ClockActionType action, Guid locationId)
        {
            await CheckTimePeriodIsLocked(effectiveTimestamp);

            var fact = new ClockEventFact
            {
                ClockEventFactId = Guid.NewGuid(),
                EmployeeId = employeeId,
                EffectiveTimestamp = effectiveTimestamp,
                RecordedTimestamp = DateTime.UtcNow,
                AuthorId = authorId,
                Action = action,
                LocationId = locationId
            };

            _context.ClockEventFacts.Add(fact);
            await _context.SaveChangesAsync();
            return fact;
        }

        public async Task<ManualWorkSessionAssertionFact> AssertManualWorkSessionAsync(Guid employeeId, DateTime assertiveStartTime, DateTime assertiveEndTime, Guid authorId, string reasonCode)
        {
            if (assertiveEndTime < assertiveStartTime)
            {
                throw new TimeEngineViolationException("End time cannot be before start time.");
            }
            await CheckTimePeriodIsLocked(assertiveStartTime);
            await CheckForOverlappingSessions(employeeId, assertiveStartTime, assertiveEndTime);

            var fact = new ManualWorkSessionAssertionFact
            {
                ManualWorkSessionAssertionFactId = Guid.NewGuid(),
                EmployeeId = employeeId,
                EffectiveTimestamp = assertiveStartTime.Date, // The day the assertion is for
                RecordedTimestamp = DateTime.UtcNow,
                AuthorId = authorId,
                AssertedStartTime = assertiveStartTime,
                AssertedEndTime = assertiveEndTime,
                ReasonCode = reasonCode
            };

            _context.ManualWorkSessionAssertionFacts.Add(fact);
            await _context.SaveChangesAsync();
            return fact;
        }

        public async Task<WorkSessionBoundaryFact> AssertWorkSessionBoundaryAsync(Guid employeeId, DateTime startTime, DateTime endTime, Guid authorId, Guid? pairedClockEventFactId)
        {
            if (endTime < startTime)
            {
                throw new TimeEngineViolationException("End time cannot be before start time.");
            }
            await CheckTimePeriodIsLocked(startTime);
            await CheckForOverlappingSessions(employeeId, startTime, endTime);

            var fact = new WorkSessionBoundaryFact
            {
                WorkSessionBoundaryFactId = Guid.NewGuid(),
                EmployeeId = employeeId,
                StartTime = startTime,
                EndTime = endTime,
                RecordedTimestamp = DateTime.UtcNow,
                AuthorId = authorId,
                PairedClockEventFactId = pairedClockEventFactId
            };

            _context.WorkSessionBoundaryFacts.Add(fact);
            await _context.SaveChangesAsync();
            return fact;
        }

        public async Task<OvertimeMarkerFact> MarkOvertimeAsync(Guid employeeId, DateTime startTime, DateTime endTime, Guid authorId)
        {
             if (endTime < startTime)
            {
                throw new TimeEngineViolationException("End time cannot be before start time.");
            }
            await CheckTimePeriodIsLocked(startTime);
            // Overlaps for markers might be permissible depending on rules, but for V1 we will be strict
            await CheckForOverlappingOvertime(employeeId, startTime, endTime);


            var fact = new OvertimeMarkerFact
            {
                OvertimeMarkerFactId = Guid.NewGuid(),
                EmployeeId = employeeId,
                EffectiveTimestamp = startTime,
                RecordedTimestamp = DateTime.UtcNow,
                AuthorId = authorId,
                StartTime = startTime,
                EndTime = endTime
            };
            
            _context.OvertimeMarkerFacts.Add(fact);
            await _context.SaveChangesAsync();
            return fact;
        }

        public async Task<ShiftAttributionFact> AttributeShiftAsync(Guid workSessionBoundaryFactId, string shiftType, Guid authorId)
        {
            var workSession = await _context.WorkSessionBoundaryFacts.AsNoTracking().FirstOrDefaultAsync(ws => ws.WorkSessionBoundaryFactId == workSessionBoundaryFactId);
            if (workSession == null)
            {
                throw new TimeEngineViolationException($"WorkSessionBoundaryFact with ID '{workSessionBoundaryFactId}' not found.");
            }
            await CheckTimePeriodIsLocked(workSession.StartTime);

            var fact = new ShiftAttributionFact
            {
                ShiftAttributionFactId = Guid.NewGuid(),
                EmployeeId = workSession.EmployeeId,
                EffectiveTimestamp = workSession.StartTime.Date,
                RecordedTimestamp = DateTime.UtcNow,
                AuthorId = authorId,
                WorkSessionBoundaryFactId = workSessionBoundaryFactId,
                ShiftType = shiftType
            };

            _context.ShiftAttributionFacts.Add(fact);
            await _context.SaveChangesAsync();
            return fact;
        }

        private async Task CheckTimePeriodIsLocked(DateTime timestamp)
        {
            var periodDate = DateOnly.FromDateTime(timestamp);
            var period = await _context.TimePeriods.FirstOrDefaultAsync(p => p.PeriodDate == periodDate);
            if (period != null && period.Status == TimePeriodStatus.Locked)
            {
                throw new TimeEngineViolationException($"The time period for date {periodDate.ToString()} is locked.");
            }
        }
        
        private async Task CheckForOverlappingSessions(Guid employeeId, DateTime start, DateTime end)
        {
            var overlappingManual = await _context.ManualWorkSessionAssertionFacts
                .AnyAsync(f => f.EmployeeId == employeeId && start < f.AssertedEndTime && end > f.AssertedStartTime);

            if (overlappingManual)
            {
                throw new TimeEngineViolationException("The asserted work session overlaps with an existing manual assertion.");
            }
            
            var overlappingBoundary = await _context.WorkSessionBoundaryFacts
                .AnyAsync(f => f.EmployeeId == employeeId && start < f.EndTime && end > f.StartTime);
                
            if (overlappingBoundary)
            {
                throw new TimeEngineViolationException("The asserted work session overlaps with an existing work session boundary.");
            }
        }
        
        private async Task CheckForOverlappingOvertime(Guid employeeId, DateTime start, DateTime end)
        {
            var overlappingOvt = await _context.OvertimeMarkerFacts
                .AnyAsync(f => f.EmployeeId == employeeId && start < f.EndTime && end > f.StartTime);

            if (overlappingOvt)
            {
                throw new TimeEngineViolationException("The overtime marker overlaps with an existing overtime marker.");
            }
        }
    }
}
