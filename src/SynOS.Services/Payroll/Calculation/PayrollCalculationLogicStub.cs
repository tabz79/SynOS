using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Payroll;
using System.Collections.Generic;

namespace SynOS.Services.Payroll.Calculation
{
    public class PayrollCalculationLogicStub : IPayrollCalculationLogic
    {
        private readonly SynOSDbContext _context;

        public PayrollCalculationLogicStub(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<PayrollCalculationResult> CalculateAsync(Guid payrollRunId)
        {
            var result = new PayrollCalculationResult();

            var payrollRun = await _context.PayrollRuns
                .AsNoTracking()
                .FirstOrDefaultAsync(pr => pr.PayrollRunId == payrollRunId);
            
            if (payrollRun == null)
            {
                result.ValidationErrors.Add(new PayrollValidationErrorDto
                {
                    EmployeeId = Guid.Empty,
                    Message = "PayrollRun not found for calculation."
                });
                return result; 
            }

            var payrollPeriod = await _context.PayrollPeriods
                .AsNoTracking()
                .FirstOrDefaultAsync(pp => pp.PayrollPeriodId == payrollRun.PayrollPeriodId);

            if (payrollPeriod == null)
            {
                result.ValidationErrors.Add(new PayrollValidationErrorDto
                {
                    EmployeeId = Guid.Empty,
                    Message = "PayrollPeriod not found for calculation."
                });
                return result;
            }

            var defaultPayComponent = await _context.PayComponents
                .AsNoTracking()
                .Where(pc => pc.IsActive)
                .OrderBy(pc => pc.PayComponentId) // Explicit ordering for determinism
                .FirstOrDefaultAsync();

            if (defaultPayComponent == null)
            {
                result.ValidationErrors.Add(new PayrollValidationErrorDto
                {
                    EmployeeId = Guid.Empty, // No specific employee, general error
                    Message = "No active PayComponent found in the system. Cannot generate provisional results."
                });
                return result; // Cannot proceed without a base component
            }

            var activeEmployees = await _context.Employees
                .AsNoTracking()
                .Where(e => e.IsActive)
                .ToListAsync();

            foreach (var employee in activeEmployees)
            {
                var coveringAssignments = await _context.PayStructureAssignments
                    .AsNoTracking()
                    .Where(psa => 
                        psa.EmployeeId == employee.EmployeeId &&
                        psa.EffectiveDate <= payrollPeriod.StartDate &&
                        (psa.EndDate == null || psa.EndDate >= payrollPeriod.EndDate))
                    .ToListAsync();

                if (coveringAssignments.Count == 1)
                {
                    result.ProvisionalResults.Add(new ProvisionalResultDto
                    {
                        EmployeeId = employee.EmployeeId,
                        PayComponentId = defaultPayComponent.PayComponentId, // Use the loaded component
                        Amount = 0
                    });
                }
                else if (coveringAssignments.Count > 1)
                {
                    result.ValidationErrors.Add(new PayrollValidationErrorDto
                    {
                        EmployeeId = employee.EmployeeId,
                        Message = "Multiple active PayStructureAssignments detected for employee."
                    });
                }
                else // Count is 0
                {
                    result.ValidationErrors.Add(new PayrollValidationErrorDto
                    {
                        EmployeeId = employee.EmployeeId,
                        Message = "No covering PayStructureAssignment found for employee."
                    });
                }
            }

            return result;
        }
    }
}
