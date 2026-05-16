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
                // 1. Get Base Salary components from Assignment
                var assignment = await _context.PayStructureAssignments
                    .AsNoTracking()
                    .Where(psa => psa.EmployeeId == employee.EmployeeId && psa.EndDate == null)
                    .FirstOrDefaultAsync();

                decimal baseEarning = 0;
                decimal baseDeduction = 0;

                if (assignment != null)
                {
                    var components = await _context.PayStructureComponents
                        .AsNoTracking()
                        .Where(psc => psc.PayStructureId == assignment.PayStructureId)
                        .ToListAsync();

                    foreach (var comp in components)
                    {
                        if (componentTypes.TryGetValue(comp.PayComponentId, out var type))
                        {
                            if (type == PayComponentType.Earning) baseEarning += comp.BaseAmount;
                            else if (type == PayComponentType.Deduction) baseDeduction += comp.BaseAmount;
                        }
                    }
                }

                // 2. Apply Attendance Proration (Healthcare-First: Exception-Driven)
                var periodStart = context.PayrollPeriodStartDate;
                var periodEnd = context.PayrollPeriodEndDate;
                
                // Extensible: Adjusted working window for mid-month joining/resignation
                var effectiveStart = employee.JoinDate.DateTime > periodStart ? employee.JoinDate.DateTime : periodStart;
                var effectiveEnd = periodEnd; // Future: Check ResignationDate
                
                int periodTotalDays = (periodEnd - periodStart).Days + 1;
                int employeeActiveDays = Math.Max(0, (effectiveEnd.Date - effectiveStart.Date).Days + 1);
                
                // Days before joining or after resignation are treated as unpaid
                int automaticUnpaidDays = Math.Max(0, periodTotalDays - employeeActiveDays);

                var empExceptions = await _context.AttendanceLogs
                    .AsNoTracking()
                    .Where(l => l.EmployeeId == employee.EmployeeId && l.ClockIn >= periodStart && l.ClockIn <= periodEnd)
                    .ToListAsync();

                int recordedUnpaidDays = empExceptions.Count(x => x.Status == "Absent" || x.Status == "UnpaidLeave");
                int totalDeductionDays = automaticUnpaidDays + recordedUnpaidDays;
                
                decimal prorationRatio = periodTotalDays > 0 ? (decimal)(periodTotalDays - totalDeductionDays) / periodTotalDays : 0;
                if (prorationRatio < 0) prorationRatio = 0;

                // 3. Apply Adjustments
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
                var netPay = ((baseEarning - baseDeduction) * prorationRatio) + (adjEarning - adjDeduction);

                result.ProvisionalResults.Add(new ProvisionalResultDto
                {
                    EmployeeId = employee.EmployeeId,
                    PayComponentId = Guid.Empty, // Aggregated net pay result
                    Amount = Math.Round(netPay, 2)
                });
            }

            return result;
        }
    }
}
