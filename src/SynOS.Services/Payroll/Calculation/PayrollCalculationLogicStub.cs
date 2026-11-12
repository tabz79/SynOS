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

                // 3. Apply Adjustments (One-off Bonuses/Earnings)
                // Filter out advance adjustments to prevent double deduction with SalaryAdvances
                decimal adjEarning = 0;

                var empAdjustments = adjustments.Where(a => a.EmployeeId == employee.EmployeeId);
                foreach (var adj in empAdjustments)
                {
                    if (adj.Notes != null && adj.Notes.IndexOf("advance", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        continue; // Handled exclusively via SalaryAdvances
                    }

                    if (componentTypes.TryGetValue(adj.PayComponentId, out var type))
                    {
                        if (type == PayComponentType.Earning) adjEarning += adj.Amount;
                    }
                }

                // 4. Earned Gross Calculation:
                // Earned Gross is the contracted base salary prorated by attendance + one-off earnings.
                // Deductions (PF, ESI, TDS, advances) are applied in FinalizePayrollRunAsync against this gross base.
                decimal earnedGross = (baseSalary * prorationRatio) + adjEarning;
                if (earnedGross < 0) earnedGross = 0;

                result.ProvisionalResults.Add(new ProvisionalResultDto
                {
                    EmployeeId = employee.EmployeeId,
                    PayComponentId = Guid.Empty, 
                    Amount = Math.Round(earnedGross, 0), // Earned Gross before deductions
                    LopDays = totalDeductionDays
                });
            }

            return result;
        }
    }
}
