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

        public async Task<PayrollCalculationResult> CalculateAsync(PayrollCalculationContext context)
        {
            var result = new PayrollCalculationResult();

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

            var employees = await _context.Employees
                .AsNoTracking()
                .Where(e => context.EmployeeIds.Contains(e.EmployeeId))
                .ToListAsync();

            foreach (var employee in employees)
            {
                if (!employee.IsActive)
                {
                    // This check is secondary, as the primary list is already filtered, but good for defense.
                    continue;
                }

                var coveringAssignments = await _context.PayStructureAssignments
                    .AsNoTracking()
                    .Where(psa => 
                        psa.EmployeeId == employee.EmployeeId &&
                        psa.EffectiveDate <= context.PayrollPeriodStartDate &&
                        (psa.EndDate == null || psa.EndDate >= context.PayrollPeriodEndDate))
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
