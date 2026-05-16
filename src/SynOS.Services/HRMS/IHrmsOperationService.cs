using System;
using System.Threading.Tasks;
using SynOS.Models.Entities.Leave;

namespace SynOS.Services.HRMS
{
    public interface IHrmsOperationService
    {
        Task<LeaveRequest> SubmitLeaveRequestAsync(LeaveRequest request);
        Task<bool> ReviewLeaveRequestAsync(Guid requestId, string status, string? supervisorNote, Guid actionedByUserId);
        Task<bool> MarkAttendanceExceptionAsync(Guid employeeId, DateTime date, string status, string? notes, Guid authorId);
    }
}
