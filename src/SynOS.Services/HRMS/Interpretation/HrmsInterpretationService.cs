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

            for (var d = startDate; d <= endDate; d = d.AddDays(1))
            {
                var dayStatus = new DailyStatus { Date = DateOnly.FromDateTime(d) };
                
                var leave = leaves.FirstOrDefault(l => l.StartTime.Date <= d.Date && l.EndTime.Date >= d.Date); 
                if (leave != null)
                {
                    dayStatus.IsLeave = true;
                    dayStatus.Status = "Leave";
                    dayStatus.LeaveType = leave.LeaveType.ToString();
                    view.TotalLeaveDays++;
                }
                else
                {
                    var daySessions = sessions.Where(s => s.StartTime.Date == d.Date).ToList();
                    if (daySessions.Any())
                    {
                        dayStatus.Status = "Present";
                        dayStatus.WorkedHours = (decimal)daySessions.Sum(s => (s.EndTime - s.StartTime).TotalHours);
                        view.TotalPresentDays++;
                    }
                    else
                    {
                        dayStatus.Status = "Absent"; 
                        view.TotalAbsentDays++;
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

            var payEvents = await _context.PayrollFacts.AsNoTracking()
                .Where(f => f.EmployeeId == employeeId)
                .Select(f => f.PayrollRunId)
                .Distinct()
                .Join(_context.PayrollRuns, id => id, r => r.PayrollRunId, (id, r) => new TimelineEvent
                {
                    Timestamp = r.CompletedAt ?? r.CreatedAt, 
                    SourceModule = "Payroll",
                    EventType = "RunIncluded",
                    Description = r.Status.ToString(),
                    FactId = r.PayrollRunId
                })
                .ToListAsync();
            view.Events.AddRange(payEvents);

            var spendEvents = await _context.SpendFacts.AsNoTracking()
                .Where(s => s.PayeeId == employeeId)
                .Select(s => new TimelineEvent
                {
                    Timestamp = s.RecordedAt,
                    SourceModule = "Spend",
                    EventType = "Payment",
                    Description = $"{s.Amount} {s.Currency}",
                    FactId = s.SpendFactId
                })
                .ToListAsync();
            view.Events.AddRange(spendEvents);

            view.Events = view.Events.OrderBy(e => e.Timestamp).ToList();
            return view;
        }
    }
}