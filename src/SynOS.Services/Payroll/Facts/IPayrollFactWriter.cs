using System.Threading.Tasks;
using SynOS.Models.DTOs.Payroll;
using SynOS.Models.Entities.Payroll;

namespace SynOS.Services.Payroll.Facts
{
    public interface IPayrollFactWriter
    {
        Task WriteFactsAsync(PayrollRun payrollRun, PayrollCalculationResult calculationResult);
    }
}
