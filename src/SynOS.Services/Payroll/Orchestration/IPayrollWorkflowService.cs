using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Payroll;
using SynOS.Models.Entities.Payroll;

namespace SynOS.Services.Payroll.Orchestration
{
    public interface IPayrollWorkflowService
    {
        Task<PayrollPeriod> CreatePayrollPeriodAsync(DateTime startDate, DateTime endDate);
        Task LockPayrollPeriodAsync(Guid payrollPeriodId);
        Task<PayrollRun> StartPayrollRunAsync(Guid payrollPeriodId);
        Task ExecuteCalculationAsync(Guid payrollRunId);
        Task FinalizePayrollRunAsync(Guid payrollRunId);
        Task VoidPayrollRunAsync(Guid payrollRunId);
        Task<System.Collections.Generic.List<PayrollPeriodSummaryView>> GetPeriodSummariesAsync();
        Task ProvisionAccessAsync(Guid employeeId, string initialPassword, Guid actorUserId);
    }
}
