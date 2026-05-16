using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Leave;
using SynOS.Models.Entities.Time;
using SynOS.Models.Enums;

namespace SynOS.Services.HRMS
{
    public class HrmsOperationService : IHrmsOperationService
    {
        private readonly SynOSDbContext _context;

        public HrmsOperationService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<LeaveRequest> SubmitLeaveRequestAsync(LeaveRequest request)
        {
            request.LeaveRequestId = Guid.NewGuid();
            request.Status = "Pending";
            request.AppliedAt = DateTime.UtcNow;

            _context.LeaveRequests.Add(request);
            await _context.SaveChangesAsync();
            return request;
        }

        public async Task<bool> ReviewLeaveRequestAsync(Guid requestId, string status, string? supervisorNote, Guid actionedByUserId)
        {
            var request = await _context.LeaveRequests.FindAsync(requestId);
            if (request == null) return false;

            request.Status = status;
            request.SupervisorNote = supervisorNote;
            request.ActionedByUserId = actionedByUserId;
            request.ActionedAt = DateTime.UtcNow;

            if (status == "Approved")
            {
                var employee = await _context.Employees.FindAsync(request.EmployeeId);
                if (employee != null)
                {
                    // Calculate used quota for the month of the leave
                    var monthStart = new DateTime(request.StartDate.Year, request.StartDate.Month, 1);
                    var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                    
                    var usedQuota = await _context.LeaveFacts
                        .Where(l => l.EmployeeId == request.EmployeeId && l.IsPaid && l.StartTime >= monthStart && l.StartTime <= monthEnd)
                        .ToListAsync();
                    
                    int alreadyUsed = usedQuota.Sum(l => (l.EndTime.Date - l.StartTime.Date).Days + 1);
                    int remainingQuota = Math.Max(0, employee.MonthlyPaidLeaveQuota - alreadyUsed);

                    // 1. Create LeaveFact (Historical Truth)
                    var requestedDays = (request.EndDate.Date - request.StartDate.Date).Days + 1;
                    
                    // Note: Simplified logic: if the WHOLE request is within quota, it's paid. 
                    // For a truly granular "split" request (e.g. 2 days paid, 1 day unpaid), 
                    // we would need multiple LeaveFacts or a more complex schema.
                    // For now, we'll split at the AttendanceLog level (daily truth).
                    
                    var leaveFact = new LeaveFact
                    {
                        LeaveFactId = Guid.NewGuid(),
                        EmployeeId = request.EmployeeId,
                        LeaveType = request.LeaveType,
                        StartTime = request.StartDate,
                        EndTime = request.EndDate,
                        IsPaid = request.LeaveType != LeaveType.LossOfPay && remainingQuota >= requestedDays,
                        ApprovalTimestamp = DateTime.UtcNow,
                        AuthorId = actionedByUserId,
                        RecordedTimestamp = DateTime.UtcNow
                    };
                    _context.LeaveFacts.Add(leaveFact);

                    // 2. Create Attendance Exceptions (Daily Truth for Payroll)
                    int availableForThisRequest = remainingQuota;
                    for (var date = request.StartDate.Date; date <= request.EndDate.Date; date = date.AddDays(1))
                    {
                        bool isPaidDay = request.LeaveType != LeaveType.LossOfPay && availableForThisRequest > 0;
                        if (isPaidDay) availableForThisRequest--;

                        var exception = new AttendanceLog
                        {
                            AttendanceId = Guid.NewGuid(),
                            EmployeeId = request.EmployeeId,
                            ClockIn = date, 
                            Status = isPaidDay ? "PaidLeave" : "UnpaidLeave",
                            Source = "LeaveSystem",
                            EntrySourceId = actionedByUserId.ToString(),
                            Notes = $"Auto-generated from approved leave {requestId}. Quota Status: {(isPaidDay ? "Paid" : "LOP")}",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.AttendanceLogs.Add(exception);
                    }
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkAttendanceExceptionAsync(Guid employeeId, DateTime date, string status, string? notes, Guid authorId)
        {
            // Check if exception already exists for this date
            var existing = await _context.AttendanceLogs
                .FirstOrDefaultAsync(l => l.EmployeeId == employeeId && l.ClockIn.Date == date.Date);

            if (existing != null)
            {
                existing.Status = status;
                existing.Notes = notes;
                existing.EntrySourceId = authorId.ToString();
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var exception = new AttendanceLog
                {
                    AttendanceId = Guid.NewGuid(),
                    EmployeeId = employeeId,
                    ClockIn = date.Date,
                    Status = status,
                    Source = "Manual",
                    EntrySourceId = authorId.ToString(),
                    Notes = notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.AttendanceLogs.Add(exception);
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
