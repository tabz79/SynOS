using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Payroll;
using System.Collections.Generic;
using SynOS.Models.Enums;

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

            var employees = await _context.Employees
                .AsNoTracking()
                .Where(e => context.EmployeeIds.Contains(e.EmployeeId) && e.IsActive)
                .ToListAsync();

            var adjustments = await _context.PayrollAdjustments
                .AsNoTracking()
                .Where(a => a.PayrollRunId == context.PayrollRunId)
                .ToListAsync();

            var componentTypes = await _context.PayComponents
                .AsNoTracking()
                .ToDictionaryAsync(pc => pc.PayComponentId, pc => pc.ComponentType);

            foreach (var employee in employees)
            {
                // 1. [DEPRECATED] Base Salary components from Assignment - Bypassed for Simplified Phase 1
                /*
                var assignment = await _context.PayStructureAssignments
                    .AsNoTracking()
                    .Where(psa => psa.EmployeeId == employee.EmployeeId && psa.EndDate == null)
                    .FirstOrDefaultAsync();
                ...
                */
                decimal baseSalary = employee.BaseSalary;

                // 2. Apply Attendance Proration (Healthcare-First: Exception-Driven)
                var periodStart = context.PayrollPeriodStartDate;
                var periodEnd = context.PayrollPeriodEndDate;
                
                var effectiveStart = employee.JoinDate.DateTime > periodStart ? employee.JoinDate.DateTime : periodStart;
                var effectiveEnd = periodEnd; 
                
                int periodTotalDays = (periodEnd - periodStart).Days + 1;
                int employeeActiveDays = Math.Max(0, (effectiveEnd.Date - effectiveStart.Date).Days + 1);
                
                decimal automaticUnpaidDays = Math.Max(0, periodTotalDays - employeeActiveDays);

                var empExceptions = await _context.AttendanceLogs
                    .AsNoTracking()
                    .Where(l => l.EmployeeId == employee.EmployeeId && l.ClockIn >= periodStart && l.ClockIn <= periodEnd)
                    .ToListAsync();

                // HalfDay = 0.5, Absent/UnpaidLeave = 1.0
                decimal recordedUnpaidDays = empExceptions.Sum(x => 
                    (x.Status == "Absent" || x.Status == "UnpaidLeave") ? 1.0m : 
                    (x.Status == "HalfDay" ? 0.5m : 0.0m));
                
                decimal totalDeductionDays = automaticUnpaidDays + recordedUnpaidDays;
                
                decimal prorationRatio = periodTotalDays > 0 ? (decimal)(periodTotalDays - totalDeductionDays) / periodTotalDays : 0;
                if (prorationRatio < 0) prorationRatio = 0;

                // 3. Apply Adjustments (One-off Bonuses/Deductions)
                decimal adjEarning = 0;
                decimal adjDeduction = 0;

                var empAdjustments = adjustments.Where(a => a.EmployeeId == employee.EmployeeId);
                foreach (var adj in empAdjustments)
                {
                    if (componentTypes.TryGetValue(adj.PayComponentId, out var type))
                    {
                        if (type == PayComponentType.Earning) adjEarning += adj.Amount;
                        else if (type == PayComponentType.Deduction) adjDeduction += adj.Amount;
                    }
                }

                // 4. Final Calculation (Prorated Base + Full Adjustments)
                var netPay = (baseSalary * prorationRatio) + (adjEarning - adjDeduction);

                result.ProvisionalResults.Add(new ProvisionalResultDto
                {
                    EmployeeId = employee.EmployeeId,
                    PayComponentId = Guid.Empty, 
                    Amount = Math.Round(netPay, 0), // ROUND TO NEAREST RUPEE
                    LopDays = totalDeductionDays
                });
            }

            return result;
        }
    }
}
