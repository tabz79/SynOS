using System;
using System.Threading.Tasks;
using SynOS.Models.Entities.Time;
using SynOS.Models.Enums;

namespace SynOS.Services.Time
{
    public interface ITimeFactWriter
    {
        Task<ClockEventFact> RecordClockEventAsync(Guid employeeId, DateTime effectiveTimestamp, Guid authorId, ClockActionType action, Guid locationId);
        Task<ManualWorkSessionAssertionFact> AssertManualWorkSessionAsync(Guid employeeId, DateTime assertiveStartTime, DateTime assertiveEndTime, Guid authorId, string reasonCode);
        Task<WorkSessionBoundaryFact> AssertWorkSessionBoundaryAsync(Guid employeeId, DateTime startTime, DateTime endTime, Guid authorId, Guid? pairedClockEventFactId);
        Task<OvertimeMarkerFact> MarkOvertimeAsync(Guid employeeId, DateTime startTime, DateTime endTime, Guid authorId);
        Task<ShiftAttributionFact> AttributeShiftAsync(Guid workSessionBoundaryFactId, string shiftType, Guid authorId);
    }
}
