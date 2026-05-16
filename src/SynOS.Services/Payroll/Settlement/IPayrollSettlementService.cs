using System;
using System.Threading.Tasks;
using SynOS.Models.Enums;

namespace SynOS.Services.Payroll.Settlement
{
    public interface IPayrollSettlementService
    {
        Task SettleSalaryAsync(Guid employeePayableId, decimal amount, PaymentMethod method, string reference);
        Task BulkSettleAsync(Guid payrollRunId, PaymentMethod method);
    }
}
