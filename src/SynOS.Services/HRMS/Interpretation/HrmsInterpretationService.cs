using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.HRMS.Interpretation;
using SynOS.Models.Enums;

namespace SynOS.Services.HRMS.Interpretation
{
    public class HrmsInterpretationService : IHrmsInterpretationService
    {
        private readonly SynOSDbContext _context;

        public HrmsInterpretationService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<PayslipView?> GetPayslipAsync(Guid payrollRunId, Guid employeeId)
        {
            var run = await _context.PayrollRuns.AsNoTracking()
                .Where(r => r.PayrollRunId == payrollRunId)
                .Join(_context.PayrollPeriods, r => r.PayrollPeriodId, p => p.PayrollPeriodId, (r, p) => new { r, p })
                .FirstOrDefaultAsync();
            
            if (run == null) return null;

            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null) return null;

            var facts = await _context.PayrollFacts.AsNoTracking()
                .Where(f => f.PayrollRunId == payrollRunId && f.EmployeeId == employeeId)
                .Join(_context.PayComponents, f => f.PayComponentId, c => c.PayComponentId, (f, c) => new { f, c })
                .ToListAsync();

            var spend = await _context.SpendFacts.AsNoTracking()
                .Where(s => s.PayrollRunId == payrollRunId && s.PayeeId == employeeId) 
                .ToListAsync();

            var view = new PayslipView
            {
                EmployeeId = employee.EmployeeId,
                EmployeeName = $"{employee.FirstName} {employee.LastName}",
                Department = employee.Department,
                Designation = employee.JobTitle,
                PayrollRunId = payrollRunId,
                PeriodStart = DateOnly.FromDateTime(run.p.StartDate),
                PeriodEnd = DateOnly.FromDateTime(run.p.EndDate),
                NetPayable = 0 
            };

            foreach (var item in facts)
            {
                var lineItem = new PayslipItem
                {
                    ComponentName = item.c.Name ?? "Unknown",
                    Amount = item.f.Amount,
                    Currency = "INR" // Default
                };

                if (item.c.ComponentType == PayComponentType.Earning)
                {
                    view.Earnings.Add(lineItem);
                    view.TotalEarnings += lineItem.Amount;
                }
                else
                {
                    view.Deductions.Add(lineItem);
                    view.TotalDeductions += lineItem.Amount;
                }
            }

            view.NetPayable = view.TotalEarnings - view.TotalDeductions;

            view.Disbursements = spend.Select(s => new PaymentProof
            {
                SpendFactId = s.SpendFactId,
                TransactionReference = s.TransactionReference,
                Amount = s.Amount,
                PaidAt = s.OccurredAt
            }).ToList();

            return view;
        }

        public async Task<PayrollBreakdownView?> GetPayrollBreakdownAsync(Guid payrollRunId)
        {
            var run = await _context.PayrollRuns.AsNoTracking()
                .Where(r => r.PayrollRunId == payrollRunId)
                .Join(_context.PayrollPeriods, r => r.PayrollPeriodId, p => p.PayrollPeriodId, (r, p) => new { r, p })
                .FirstOrDefaultAsync();

            if (run == null) return null;

            var view = new PayrollBreakdownView
            {
                PayrollRunId = payrollRunId,
                PeriodStart = DateOnly.FromDateTime(run.p.StartDate),
                PeriodEnd = DateOnly.FromDateTime(run.p.EndDate)
            };

            var breakdown = await _context.PayrollFacts.AsNoTracking()
                .Where(f => f.PayrollRunId == payrollRunId)
                .Join(_context.Employees, f => f.EmployeeId, e => e.EmployeeId, (f, e) => new { f, e })
                .Join(_context.PayComponents, x => x.f.PayComponentId, c => c.PayComponentId, (x, c) => new { x.f, x.e, c })
                .GroupBy(x => x.e.Department)
                .Select(g => new DepartmentBreakdown
                {
                    DepartmentName = g.Key,
                    EmployeeCount = g.Select(x => x.e.EmployeeId).Distinct().Count(),
                    TotalAmount = g.Sum(x => x.c.ComponentType == PayComponentType.Earning ? x.f.Amount : -x.f.Amount)
                })
                .ToListAsync();

            view.ByDepartment = breakdown;
            view.TotalLiability = breakdown.Sum(b => b.TotalAmount);

            return view;
        }

        public async Task<AttendanceLeaveSummaryView?> GetAttendanceLeaveSummaryAsync(Guid employeeId, DateOnly month)
        {
            var employee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (employee == null) return null;

            var startDate = new DateTime(month.Year, month.Month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var view = new AttendanceLeaveSummaryView
            {
                EmployeeId = employeeId,
                EmployeeName = $"{employee.FirstName} {employee.LastName}",
                Month = month
            };

            var sessions = await _context.WorkSessionBoundaryFacts.AsNoTracking()
                .Where(s => s.EmployeeId == employeeId && s.StartTime >= startDate && s.EndTime <= endDate.AddDays(1)) 
                .ToListAsync();

            var leaves = await _context.LeaveFacts.AsNoTracking()
                .Where(l => l.EmployeeId == employeeId && l.StartTime >= startDate && l.EndTime <= endDate.AddDays(1))
                .ToListAsync();

            var manualLogs = await _context.AttendanceLogs.AsNoTracking()
                .Where(l => l.EmployeeId == employeeId && l.ClockIn >= startDate && l.ClockIn <= endDate.AddDays(1))
                .ToListAsync();

            // Load Leave Policy
            var policy = await _context.WorkforcePolicies.AsNoTracking()
                .FirstOrDefaultAsync(p => p.PolicyName == "LeavePolicy");
            
            bool policyEnabled = policy?.IsEnabled ?? true;
            int defaultQuota = 2;
            
            if (policy != null && !string.IsNullOrEmpty(policy.ConfigJson))
            {
                try {
                    var config = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.Nodes.JsonObject>(policy.ConfigJson);
                    defaultQuota = config?["defaultMonthlyPaidLeave"]?.GetValue<int>() ?? 2;
                } catch { }
            }

            // If policy is enabled, we use the global default as the base, 
            // but allow employee-specific overrides IF they are lower than the default (stricter)
            // or if we decide that the employee master is the ultimate override.
            // For now, to solve the user's issue of 'dummy modal', we prioritize the global policy.
            int runningQuota = policyEnabled ? defaultQuota : 999;
            
            // If the employee has a specific quota set that is NOT 2 (meaning it might be an override), 
            // we could consider it. But for the 'System Admin' who likely has the default, 
            // we want to ensure they hit the 2-day limit.
            if (policyEnabled && employee.MonthlyPaidLeaveQuota > 0 && employee.MonthlyPaidLeaveQuota < defaultQuota)
            {
                runningQuota = employee.MonthlyPaidLeaveQuota;
            }
            var today = DateTime.Today;

            for (var d = startDate; d <= endDate; d = d.AddDays(1))
            {
                var dayStatus = new DailyStatus { Date = DateOnly.FromDateTime(d) };
                
                // 1. Check Approved Leaves (Highest Priority)
                var leave = leaves.FirstOrDefault(l => l.StartTime.Date <= d.Date && l.EndTime.Date >= d.Date); 
                if (leave != null)
                {
                    dayStatus.IsLeave = true;
                    dayStatus.LeaveType = leave.LeaveType.ToString();
                    
                    // Dynamic Quota Check: Even if DB says IsPaid, we enforce the current policy quota
                    bool canBePaid = leave.IsPaid && runningQuota > 0;
                    
                    dayStatus.RawStatus = canBePaid ? "PaidLeave" : "UnpaidLeave";
                    
                    if (canBePaid)
                    {
                        dayStatus.Status = "Leave";
                        if (d.Date > today) 
                            view.TotalPlannedLeaves++;
                        else
                            view.TotalLeaveDays++;

                        runningQuota--;
                    }
                    else
                    {
                        dayStatus.Status = "Absent";
                        view.TotalAbsentDays++;
                    }
                }
                else
                {
                    // 2. Check Manual Exceptions (AttendanceLogs)
                    var log = manualLogs.FirstOrDefault(l => l.ClockIn.Date == d.Date);

                    if (log != null)
                    {
                        dayStatus.RawStatus = log.Status;
                        dayStatus.Notes = log.Notes;

                        string effectiveStatus = log.Status;
                        // Also reconcile manual PaidLeave exceptions with running quota
                        if (effectiveStatus == "PaidLeave")
                        {
                            if (runningQuota > 0)
                            {
                                runningQuota--;
                            }
                            else
                            {
                                effectiveStatus = "UnpaidLeave";
                            }
                        }

                        dayStatus.Status = effectiveStatus switch {
                            "UnpaidLeave" => "Absent",
                            "Absent" => "Absent",
                            "PaidLeave" => "Leave",
                            "Present" => "Present",
                            _ => log.Status
                        };
                        
                        if (dayStatus.Status == "Absent") view.TotalAbsentDays++;
                        else if (dayStatus.Status == "Leave") {
                            view.TotalLeaveDays++;
                            dayStatus.IsLeave = true;
                        }
                        else if (dayStatus.Status == "Present") view.TotalPresentDays++;
                    }
                    else 
                    {
                        // 3. Check for Clock Events (Work Sessions)
                        var daySessions = sessions.Where(s => s.StartTime.Date == d.Date).ToList();
                        if (daySessions.Any())
                        {
                            dayStatus.Status = "Present";
                            dayStatus.RawStatus = "Present";
                            dayStatus.WorkedHours = (decimal)daySessions.Sum(s => (s.EndTime - s.StartTime).TotalHours);
                            view.TotalPresentDays++;
                        }
                        else
                        {
                            // 4. DEFAULT Logic
                            if (d.Date > today)
                            {
                                dayStatus.Status = "Upcoming";
                                dayStatus.RawStatus = "Upcoming";
                            }
                            else
                            {
                                // Past/Today dates default to Present unless exception/leave exists
                                dayStatus.Status = "Present"; 
                                dayStatus.RawStatus = "Present";
                                view.TotalPresentDays++;
                            }
                        }
                    }
                }
                view.DailyStatuses.Add(dayStatus);
            }

            return view;
        }

        public async Task<WorkforceCostView?> GetWorkforceCostAsync(DateOnly month)
        {
            var startDate = new DateTime(month.Year, month.Month, 1);
            var endDate = startDate.AddMonths(1);

            var runs = await _context.PayrollRuns.AsNoTracking()
                .Join(_context.PayrollPeriods, r => r.PayrollPeriodId, p => p.PayrollPeriodId, (r, p) => new { r, p })
                .Where(x => x.p.EndDate.Year == month.Year && x.p.EndDate.Month == month.Month) 
                .Select(x => x.r.PayrollRunId)
                .ToListAsync();

            var payrollCost = await _context.PayrollFacts.AsNoTracking()
                .Where(f => runs.Contains(f.PayrollRunId))
                .Join(_context.PayComponents, f => f.PayComponentId, c => c.PayComponentId, (f, c) => new { f, c })
                .Where(x => x.c.ComponentType == PayComponentType.Earning)
                .SumAsync(x => x.f.Amount);

            var contractorCost = await _context.SpendFacts.AsNoTracking()
                .Where(s => s.OccurredAt >= startDate && s.OccurredAt < endDate && s.Channel == "Supplier Payable") 
                .SumAsync(s => s.Amount);

            var statutory = await _context.StatutoryObligationFacts.AsNoTracking()
                .Where(s => s.LegalPeriodStart >= startDate && s.ObligationType == Models.Enums.Compliance.ObligationType.EmployerContribution)
                .SumAsync(s => s.Amount);

            return new WorkforceCostView
            {
                Month = month,
                PayrollCost = payrollCost,
                ContractorCost = contractorCost,
                StatutoryLiability = statutory,
                TotalCost = payrollCost + contractorCost + statutory,
                TopComponents = new System.Collections.Generic.List<CostComponent>
                {
                    new() { Category = "Payroll (Earnings)", Amount = payrollCost },
                    new() { Category = "Contractors", Amount = contractorCost },
                    new() { Category = "Statutory (Employer)", Amount = statutory }
                }
            };
        }

        public async Task<AuditTimelineView?> GetEmployeeAuditTimelineAsync(Guid employeeId)
        {
            var employee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (employee == null) return null;

            var view = new AuditTimelineView
            {
                EntityId = employeeId,
                EntityName = $"{employee.FirstName} {employee.LastName}"
            };

            var clockEvents = await _context.ClockEventFacts.AsNoTracking()
                .Where(c => c.EmployeeId == employeeId)
                .Select(c => new TimelineEvent 
                { 
                    Timestamp = c.RecordedTimestamp, 
                    SourceModule = "Time", 
                    EventType = c.Action.ToString(), 
                    FactId = c.ClockEventFactId 
                })
                .ToListAsync();
            view.Events.AddRange(clockEvents);

            var leaveEvents = await _context.LeaveFacts.AsNoTracking()
                .Where(l => l.EmployeeId == employeeId)
                .Select(l => new TimelineEvent
                {
                    Timestamp = l.RecordedTimestamp,
                    SourceModule = "Leave",
                    EventType = "LeaveRequest",
                    Description = l.LeaveType.ToString(),
                    FactId = l.LeaveFactId
                })
                .ToListAsync();
            view.Events.AddRange(leaveEvents);

            view.Events = view.Events.OrderBy(e => e.Timestamp).ToList();
            return view;
        }

        public async Task<LeaveImpactAnalysisView?> GetLeaveImpactAnalysisAsync(Guid employeeId, DateTime start, DateTime end)
        {
            var employee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (employee == null) return null;

            var monthStart = new DateTime(start.Year, start.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            var paidLogs = await _context.AttendanceLogs.AsNoTracking()
                .Where(l => l.EmployeeId == employeeId && l.Status == "PaidLeave" && l.ClockIn >= monthStart && l.ClockIn <= monthEnd)
                .ToListAsync();
            
            var policy = await _context.WorkforcePolicies.AsNoTracking()
                .FirstOrDefaultAsync(p => p.PolicyName == "LeavePolicy");
            
            bool policyEnabled = policy?.IsEnabled ?? true;
            int defaultQuota = 2;
            if (policy != null && !string.IsNullOrEmpty(policy.ConfigJson))
            {
                try {
                    var config = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.Nodes.JsonObject>(policy.ConfigJson);
                    defaultQuota = config?["defaultMonthlyPaidLeave"]?.GetValue<int>() ?? 2;
                } catch { }
            }
            
            int usedQuota = paidLogs.Count;

            int requestedDays = (int)(end.Date - start.Date).TotalDays + 1;
            int baseQuota = policyEnabled ? (employee.MonthlyPaidLeaveQuota > 0 ? employee.MonthlyPaidLeaveQuota : defaultQuota) : 0; 
            
            int remainingQuota = Math.Max(0, baseQuota - usedQuota);

            int paidDays = Math.Min(requestedDays, remainingQuota);
            int lopDays = requestedDays - paidDays;

            decimal dailyRate = CalculateDailyRate(employee.BaseSalary, DateTime.DaysInMonth(start.Year, start.Month));

            return new LeaveImpactAnalysisView
            {
                EmployeeId = employeeId,
                TotalDaysRequested = requestedDays,
                PaidDays = paidDays,
                LopDays = lopDays,
                RemainingQuotaBefore = remainingQuota,
                RemainingQuotaAfter = Math.Max(0, remainingQuota - paidDays),
                EstimatedSalaryReduction = Math.Round(lopDays * dailyRate, 2),
                Month = start.ToString("yyyy-MM")
            };
        }

        public async Task<MonthlyLopSummaryView?> GetMonthlyLopSummaryAsync(DateOnly month)
        {
            var monthStart = new DateTime(month.Year, month.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            int daysInMonth = DateTime.DaysInMonth(month.Year, month.Month);

            var employees = await _context.Employees.AsNoTracking().Where(e => e.IsActive).ToListAsync();
            var summary = new MonthlyLopSummaryView { Month = month };

            foreach (var emp in employees)
            {
                var paidLogs = await _context.AttendanceLogs.AsNoTracking()
                    .Where(l => l.EmployeeId == emp.EmployeeId && l.Status == "PaidLeave" && l.ClockIn >= monthStart && l.ClockIn <= monthEnd)
                    .ToListAsync();
                
                int paidUsed = paidLogs.Count;

                var attendanceLogs = await _context.AttendanceLogs.AsNoTracking()
                    .Where(l => l.EmployeeId == emp.EmployeeId && l.ClockIn >= monthStart && l.ClockIn <= monthEnd)
                    .ToListAsync();

                decimal lopDays = attendanceLogs.Sum(l => 
                    (l.Status == "UnpaidLeave" || l.Status == "Absent") ? 1.0m : 
                    (l.Status == "HalfDay" ? 0.5m : 0.0m));

                decimal dailyRate = CalculateDailyRate(emp.BaseSalary, daysInMonth);

                summary.Rows.Add(new EmployeeLopRow
                {
                    EmployeeId = emp.EmployeeId,
                    EmployeeName = $"{emp.FirstName} {emp.LastName}",
                    PaidLeaveUsed = paidUsed,
                    PaidLeaveQuota = emp.MonthlyPaidLeaveQuota,
                    LopDays = lopDays,
                    BaseSalary = emp.BaseSalary,
                    EstimatedDeduction = Math.Round(lopDays * dailyRate, 2)
                });
            }

            return summary;
        }

        private decimal CalculateDailyRate(decimal baseSalary, int daysInPeriod)
        {
            if (daysInPeriod <= 0) return 0;
            return baseSalary / daysInPeriod;
        }
    }
}