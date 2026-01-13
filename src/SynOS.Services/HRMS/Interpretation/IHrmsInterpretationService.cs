using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.HRMS.Interpretation;

namespace SynOS.Services.HRMS.Interpretation
{
    public interface IHrmsInterpretationService
    {
        Task<PayslipView?> GetPayslipAsync(Guid payrollRunId, Guid employeeId);
        Task<PayrollBreakdownView?> GetPayrollBreakdownAsync(Guid payrollRunId);
        Task<AttendanceLeaveSummaryView?> GetAttendanceLeaveSummaryAsync(Guid employeeId, DateOnly month);
        Task<WorkforceCostView?> GetWorkforceCostAsync(DateOnly month);
        Task<AuditTimelineView?> GetEmployeeAuditTimelineAsync(Guid employeeId);
    }
}
