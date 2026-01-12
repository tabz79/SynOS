using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Payroll;

namespace SynOS.Services.Payroll.Calculation
{
    public interface IPayrollCalculationLogic
    {
        Task<PayrollCalculationResult> CalculateAsync(PayrollCalculationContext context);
    }
}
