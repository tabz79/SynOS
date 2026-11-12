using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.HR;
using SynOS.Models.Entities.Leave;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Entities.Payroll;
using SynOS.Models.Entities.Time;
using SynOS.Models.Enums;
using SynOS.Services.Time;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/workforce-admin")]
    public class WorkforceAdminController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ILabTimeProvider _labTimeProvider;

        public WorkforceAdminController(SynOSDbContext context, ILabTimeProvider labTimeProvider)
        {
            _context = context;
            _labTimeProvider = labTimeProvider;
        }

        // --- UNIFIED WORKFORCE & PAYROLL DASHBOARD (TODAY VS THIS MONTH/PERIOD) ---

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard(
            [FromQuery] string? preset = "this_month",
            [FromQuery] DateTime? start = null,
            [FromQuery] DateTime? end = null,
            [FromQuery] Guid? branchId = null)
        {
            var istZone = _labTimeProvider.GetLabTimeZone();
            var istNow = _labTimeProvider.GetLabNow();
            var istToday = istNow.Date;

            // Resolve date range
            DateTime rangeStart;
            DateTime rangeEnd;

            var p = (preset ?? "this_month").Trim().ToLowerInvariant().Replace("-", "_");
            switch (p)
            {
                case "today":
                    rangeStart = istToday;
                    rangeEnd = istToday.AddDays(1).AddTicks(-1);
                    break;
                case "yesterday":
                    rangeStart = istToday.AddDays(-1);
                    rangeEnd = istToday.AddTicks(-1);
                    break;
                case "this_month":
                case "month":
                    rangeStart = new DateTime(istToday.Year, istToday.Month, 1);
                    rangeEnd = rangeStart.AddMonths(1).AddTicks(-1);
                    break;
                case "this_quarter":
                case "quarter":
                    var quarter = (istToday.Month - 1) / 3 + 1;
                    var qStartMonth = (quarter - 1) * 3 + 1;
                    rangeStart = new DateTime(istToday.Year, qStartMonth, 1);
                    rangeEnd = rangeStart.AddMonths(3).AddTicks(-1);
                    break;
                case "this_year":
                case "year":
                    rangeStart = new DateTime(istToday.Year, 1, 1);
                    rangeEnd = new DateTime(istToday.Year, 12, 31, 23, 59, 59);
                    break;
                case "custom":
                    rangeStart = start ?? new DateTime(istToday.Year, istToday.Month, 1);
                    rangeEnd = end ?? istToday.AddDays(1).AddTicks(-1);
                    break;
                default:
                    rangeStart = new DateTime(istToday.Year, istToday.Month, 1);
                    rangeEnd = rangeStart.AddMonths(1).AddTicks(-1);
                    break;
            }

            // 1. Employees Master Data
            var allEmployees = await _context.Employees
                .AsNoTracking()
                .OrderBy(e => e.LastName)
                .ToListAsync();

            var activeEmployees = allEmployees.Where(e => e.IsActive).ToList();
            int activeCount = activeEmployees.Count;
            int totalCount = allEmployees.Count;

            // 2. Department Breakdown
            var deptGroups = activeEmployees
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Department) ? "Lab & Operations" : e.Department.Trim())
                .Select(g => new
                {
                    department = g.Key,
                    count = g.Count(),
                    percentage = activeCount > 0 ? Math.Round((g.Count() / (decimal)activeCount) * 100, 1) : 0
                })
                .OrderByDescending(d => d.count)
                .ToList();

            // 3. Operational Data (Today & Real-Time)
            var todayStart = istToday;
            var todayEnd = istToday.AddDays(1).AddTicks(-1);
            var yesterdayStart = istToday.AddDays(-1);
            var yesterdayEnd = istToday.AddTicks(-1);

            var todayLogs = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(l => l.ClockIn >= todayStart && l.ClockIn <= todayEnd)
                .ToListAsync();

            int todayExceptionsCount = todayLogs.Count(l => l.Status != "Present");
            var yesterdayLogs = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(l => l.ClockIn >= yesterdayStart && l.ClockIn <= yesterdayEnd)
                .ToListAsync();
            int yesterdayExceptionsCount = yesterdayLogs.Count(l => l.Status != "Present");
            int exceptionDelta = todayExceptionsCount - yesterdayExceptionsCount;

            var pendingLeaves = await _context.LeaveRequests
                .AsNoTracking()
                .Where(l => l.Status == "Pending")
                .ToListAsync();
            int pendingLeavesCount = pendingLeaves.Count;

            var allAdvances = await _context.SalaryAdvances
                .AsNoTracking()
                .ToListAsync();

            var pendingAdvancesList = allAdvances.Where(a => a.Status == "Pending").ToList();
            decimal pendingAdvancesAmount = pendingAdvancesList.Sum(a => a.Amount);
            int pendingAdvancesCount = pendingAdvancesList.Count;

            var approvedAdvancesList = allAdvances.Where(a => a.Status == "Approved").ToList();
            decimal totalActiveAdvanceBalance = approvedAdvancesList.Sum(a => a.Amount);
            int activeAdvanceEmployeesCount = approvedAdvancesList.Select(a => a.EmployeeId).Distinct().Count();

            int unlinkedStaffCount = allEmployees.Count(e => e.IsActive && e.UserId == null);

            // 4. Attendance 30-Day Trend
            var trendDays = new List<object>();
            var thirtyDaysAgo = istToday.AddDays(-29);
            var recentLogs = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(l => l.ClockIn >= thirtyDaysAgo && l.ClockIn <= todayEnd)
                .ToListAsync();

            for (int i = 29; i >= 0; i--)
            {
                var d = istToday.AddDays(-i);
                var dayExceptions = recentLogs.Count(l => l.ClockIn.Date == d.Date && l.Status != "Present");
                decimal attPct = activeCount > 0 
                    ? Math.Max(80m, Math.Round(((activeCount - dayExceptions) / (decimal)activeCount) * 100, 1))
                    : 100m;

                trendDays.Add(new
                {
                    date = d.ToString("yyyy-MM-dd"),
                    dayLabel = d.ToString("dd MMM"),
                    dayOfMonth = d.Day,
                    attendancePct = attPct,
                    exceptions = dayExceptions
                });
            }

            // 5. Payroll Periods and Payables
            var runs = await _context.PayrollRuns
                .Include(r => r.PayrollPeriod)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            // Find matching period or latest period
            var matchingPeriod = await _context.PayrollPeriods
                .Where(p => p.StartDate <= rangeEnd && p.EndDate >= rangeStart)
                .OrderByDescending(p => p.StartDate)
                .FirstOrDefaultAsync();

            var selectedRun = matchingPeriod != null
                ? runs.FirstOrDefault(r => r.PayrollPeriodId == matchingPeriod.PayrollPeriodId)
                : runs.FirstOrDefault();

            List<EmployeePayable> payables = new();
            if (selectedRun != null)
            {
                payables = await _context.EmployeePayables
                    .AsNoTracking()
                    .Where(p => p.PayrollRunId == selectedRun.PayrollRunId)
                    .ToListAsync();
            }

            decimal periodGrossObligation = payables.Any() 
                ? payables.Sum(p => p.GrossSalary)
                : activeEmployees.Sum(e => e.BaseSalary);

            decimal periodNetPayable = payables.Any()
                ? payables.Sum(p => p.NetPayable)
                : Math.Round(periodGrossObligation * 0.88m, 0);

            decimal periodAmountDisbursed = payables.Sum(p => p.AmountPaid);
            decimal periodOutstandingPayable = Math.Max(0, periodNetPayable - periodAmountDisbursed);
            decimal disbursedPct = periodNetPayable > 0 
                ? Math.Round((periodAmountDisbursed / periodNetPayable) * 100, 1) 
                : 0;
            decimal outstandingPct = periodNetPayable > 0
                ? Math.Round((periodOutstandingPayable / periodNetPayable) * 100, 1)
                : 0;

            int paidEmployeesCount = payables.Count(p => p.AmountPaid >= p.NetPayable && p.NetPayable > 0);
            int pendingEmployeesCount = payables.Count(p => p.AmountPaid < p.NetPayable);

            decimal pfTotal = payables.Sum(p => p.PFDeduction);
            decimal esiTotal = payables.Sum(p => p.ESIDeduction);
            decimal tdsTotal = payables.Sum(p => p.TDSDeduction);
            decimal totalStatutory = pfTotal + esiTotal + tdsTotal;

            // 6. 6-Month Historical Payroll Cost Trend
            var monthlyTrends = new List<object>();
            for (int m = 5; m >= 0; m--)
            {
                var targetMonthDate = istToday.AddMonths(-m);
                var mStart = new DateTime(targetMonthDate.Year, targetMonthDate.Month, 1);
                var mEnd = mStart.AddMonths(1).AddTicks(-1);

                var monthPeriod = await _context.PayrollPeriods
                    .Where(pp => pp.StartDate.Year == mStart.Year && pp.StartDate.Month == mStart.Month)
                    .FirstOrDefaultAsync();

                decimal mGross = 0;
                decimal mNet = 0;

                if (monthPeriod != null)
                {
                    var mRun = runs.FirstOrDefault(r => r.PayrollPeriodId == monthPeriod.PayrollPeriodId);
                    if (mRun != null)
                    {
                        var mPayables = await _context.EmployeePayables
                            .AsNoTracking()
                            .Where(p => p.PayrollRunId == mRun.PayrollRunId)
                            .ToListAsync();
                        if (mPayables.Any())
                        {
                            mGross = mPayables.Sum(p => p.GrossSalary);
                            mNet = mPayables.Sum(p => p.AmountPaid > 0 ? p.AmountPaid : p.NetPayable);
                        }
                    }
                }

                if (mGross == 0)
                {
                    mGross = activeEmployees.Sum(e => e.BaseSalary);
                    mNet = Math.Round(mGross * 0.88m, 0);
                }

                monthlyTrends.Add(new
                {
                    month = mStart.ToString("yyyy-MM"),
                    monthLabel = mStart.ToString("MMM yyyy"),
                    shortMonth = mStart.ToString("MMM"),
                    grossSalary = mGross,
                    netDisbursement = mNet
                });
            }

            // 7. Payroll Spend by Department
            var empDict = allEmployees.ToDictionary(e => e.EmployeeId, e => e);
            var deptPayrollMap = new Dictionary<string, decimal>();

            if (payables.Any())
            {
                foreach (var p_item in payables)
                {
                    empDict.TryGetValue(p_item.EmployeeId, out var emp);
                    var dName = emp != null && !string.IsNullOrWhiteSpace(emp.Department) ? emp.Department.Trim() : "Lab & Operations";
                    deptPayrollMap[dName] = (deptPayrollMap.TryGetValue(dName, out var curr) ? curr : 0) + p_item.GrossSalary;
                }
            }
            else
            {
                foreach (var emp in activeEmployees)
                {
                    var dName = !string.IsNullOrWhiteSpace(emp.Department) ? emp.Department.Trim() : "Lab & Operations";
                    deptPayrollMap[dName] = (deptPayrollMap.TryGetValue(dName, out var curr) ? curr : 0) + emp.BaseSalary;
                }
            }

            var payrollByDepartment = deptPayrollMap
                .Select(kv => new
                {
                    department = kv.Key,
                    amount = kv.Value,
                    percentage = periodGrossObligation > 0 ? Math.Round((kv.Value / periodGrossObligation) * 100, 1) : 0
                })
                .OrderByDescending(d => d.amount)
                .ToList();

            // 8. Salary Component Mix (50% Basic, 30% HRA, 20% Allowances)
            var componentMix = new
            {
                grossTotal = periodGrossObligation,
                basicSalary = Math.Round(periodGrossObligation * 0.50m, 0),
                basicPct = 50.0m,
                hra = Math.Round(periodGrossObligation * 0.30m, 0),
                hraPct = 30.0m,
                otherAllowances = Math.Round(periodGrossObligation * 0.20m, 0),
                allowancesPct = 20.0m
            };

            // 9. Employee Payroll Summary Table (Rows)
            var employeeSummaryRows = new List<object>();
            if (payables.Any())
            {
                foreach (var p_item in payables)
                {
                    empDict.TryGetValue(p_item.EmployeeId, out var emp);
                    var isPaid = p_item.Status == "Settled" || p_item.AmountPaid >= p_item.NetPayable;
                    employeeSummaryRows.Add(new
                    {
                        employeeId = p_item.EmployeeId,
                        name = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : "Staff Member",
                        department = emp != null && !string.IsNullOrWhiteSpace(emp.Department) ? emp.Department : "Lab & Operations",
                        grossEarned = p_item.GrossSalary,
                        lopDeduction = emp != null ? Math.Round(emp.BaseSalary * (p_item.LopDaysCount / 30m), 0) : 0,
                        pfDeduction = p_item.PFDeduction,
                        esiDeduction = p_item.ESIDeduction,
                        tdsDeduction = p_item.TDSDeduction,
                        advanceRecovery = p_item.OtherDeductions,
                        netPayable = p_item.NetPayable,
                        status = isPaid ? "Paid" : "Pending"
                    });
                }
            }
            else
            {
                foreach (var emp in activeEmployees)
                {
                    decimal gross = emp.BaseSalary;
                    decimal pf = emp.PFEnabled ? Math.Round(Math.Min(gross, 15000m) * 0.12m, 2) : 0;
                    decimal esi = (emp.ESIEnabled && gross <= 21000m) ? Math.Round(gross * 0.0075m, 2) : 0;
                    decimal tds = emp.TDSEnabled ? (emp.TDSMode == TaxCalculationMode.Percentage ? Math.Round(gross * (emp.TDSValue / 100m), 2) : emp.TDSValue) : 0;
                    decimal net = Math.Round(gross - pf - esi - tds, 0);

                    employeeSummaryRows.Add(new
                    {
                        employeeId = emp.EmployeeId,
                        name = $"{emp.FirstName} {emp.LastName}".Trim(),
                        department = !string.IsNullOrWhiteSpace(emp.Department) ? emp.Department : "Lab & Operations",
                        grossEarned = gross,
                        lopDeduction = 0m,
                        pfDeduction = pf,
                        esiDeduction = esi,
                        tdsDeduction = tds,
                        advanceRecovery = 0m,
                        netPayable = net,
                        status = "Pending"
                    });
                }
            }

            // 10. Advances Summary
            decimal advancesRecoveredThisMonth = allAdvances
                .Where(a => a.Status == "Adjusted" && (selectedRun == null || a.AdjustedInPayrollRunId == selectedRun.PayrollRunId))
                .Sum(a => a.Amount);

            var advancesSummary = new
            {
                totalActive = totalActiveAdvanceBalance + advancesRecoveredThisMonth,
                recoveredThisMonth = advancesRecoveredThisMonth,
                outstandingBalance = totalActiveAdvanceBalance
            };

            // 11. Current Run Card
            var currentRunInfo = new
            {
                payrollRunId = selectedRun?.PayrollRunId,
                periodName = matchingPeriod != null 
                    ? $"{matchingPeriod.StartDate:MMM yyyy} ({matchingPeriod.StartDate:dd MMM} - {matchingPeriod.EndDate:dd MMM})"
                    : $"{rangeStart:MMM yyyy} ({rangeStart:dd MMM} - {rangeEnd:dd MMM})",
                status = selectedRun != null ? selectedRun.Status.ToString() : (matchingPeriod != null ? matchingPeriod.Status.ToString() : "Draft"),
                employeeCount = payables.Any() ? payables.Count : activeCount,
                grossSalary = periodGrossObligation,
                netPayable = periodNetPayable,
                createdOn = selectedRun?.CreatedAt.ToString("dd MMM yyyy") ?? istToday.ToString("dd MMM yyyy"),
                finalizedOn = selectedRun?.CompletedAt?.ToString("dd MMM yyyy") ?? "--"
            };

            // 12. Recent Activity Feeds
            var recentWorkforceActivity = new List<object>();
            if (selectedRun != null && selectedRun.Status == PayrollRunStatus.Finalized)
            {
                recentWorkforceActivity.Add(new
                {
                    id = "act-1",
                    type = "payroll",
                    title = $"Payroll finalized for {currentRunInfo.periodName} ({currentRunInfo.employeeCount} employees)",
                    time = selectedRun.CompletedAt?.ToString("dd MMM, hh:mm tt") ?? "Recently",
                    status = "completed"
                });
            }

            var recentPendingLeaves = pendingLeaves.Take(2).ToList();
            foreach (var l in recentPendingLeaves)
            {
                empDict.TryGetValue(l.EmployeeId, out var emp);
                recentWorkforceActivity.Add(new
                {
                    id = $"leave-{l.LeaveRequestId}",
                    type = "leave",
                    title = $"Leave request: {emp?.FirstName} {emp?.LastName} ({l.LeaveType})",
                    time = l.AppliedAt.ToString("dd MMM, hh:mm tt"),
                    status = "pending"
                });
            }

            var recentJoiners = allEmployees
                .OrderByDescending(e => e.CreatedAt)
                .Take(2)
                .ToList();
            foreach (var j in recentJoiners)
            {
                recentWorkforceActivity.Add(new
                {
                    id = $"joiner-{j.EmployeeId}",
                    type = "joiner",
                    title = $"New joiner: {j.FirstName} {j.LastName} ({j.JobTitle})",
                    time = j.JoinDate.ToString("dd MMM, hh:mm tt"),
                    status = "info"
                });
            }

            // Build Final Unified Payload
            return Ok(new
            {
                mode = p == "today" ? "operational" : "financial",
                selectedPreset = p,
                range = new { start = rangeStart.ToString("yyyy-MM-dd"), end = rangeEnd.ToString("yyyy-MM-dd") },
                
                // Operational Dashboard (Image 1)
                operational = new
                {
                    kpis = new
                    {
                        activeEmployees = activeCount,
                        totalEmployees = totalCount,
                        newJoinersDelta = recentJoiners.Count,
                        todayExceptions = todayExceptionsCount,
                        yesterdayExceptions = yesterdayExceptionsCount,
                        exceptionDelta = exceptionDelta,
                        leaveRequests = pendingLeavesCount,
                        pendingAdvances = pendingAdvancesAmount,
                        pendingAdvancesCount = pendingAdvancesCount,
                        departments = deptGroups.Count
                    },
                    attendanceTrend = trendDays,
                    workforceByDepartment = deptGroups,
                    attentionCenter = new List<object>
                    {
                        new { id = "att-1", label = "Attendance exceptions to review", count = todayExceptionsCount, tab = "attendance" },
                        new { id = "att-2", label = "Leave requests awaiting approval", count = pendingLeavesCount, tab = "attendance" },
                        new { id = "att-3", label = "Advance requests pending", count = pendingAdvancesCount, tab = "adjustments" },
                        new { id = "att-4", label = "Employee records to complete", count = unlinkedStaffCount, tab = "identity" }
                    },
                    payrollOverview = new
                    {
                        periodName = currentRunInfo.periodName,
                        obligation = periodGrossObligation,
                        paidToDate = periodAmountDisbursed,
                        paidPct = disbursedPct,
                        outstandingPayable = periodOutstandingPayable,
                        advanceBalance = totalActiveAdvanceBalance,
                        nextPayrollDue = new DateTime(istToday.Year, istToday.Month, 1).AddMonths(1).AddDays(4).ToString("dd MMM yyyy")
                    },
                    recentActivity = recentWorkforceActivity
                },

                // Financial Dashboard (Image 2)
                financial = new
                {
                    kpis = new
                    {
                        payrollObligation = periodGrossObligation,
                        periodLabel = currentRunInfo.periodName,
                        employeeCount = currentRunInfo.employeeCount,
                        amountDisbursed = periodAmountDisbursed,
                        disbursedPct = disbursedPct,
                        paidEmployeesCount = paidEmployeesCount,
                        outstandingPayable = periodOutstandingPayable,
                        outstandingPct = outstandingPct,
                        pendingEmployeesCount = pendingEmployeesCount,
                        statutoryDeductions = totalStatutory,
                        statutoryBreakdown = $"PF: ₹{pfTotal:N0} · ESI: ₹{esiTotal:N0} · TDS: ₹{tdsTotal:N0}",
                        advanceBalance = totalActiveAdvanceBalance,
                        advanceEmployeesCount = activeAdvanceEmployeesCount
                    },
                    payrollCostTrend = monthlyTrends,
                    payrollByDepartment = payrollByDepartment,
                    salaryComponentMix = componentMix,
                    currentRun = currentRunInfo,
                    employeeSummary = employeeSummaryRows,
                    statutoryCompliance = new
                    {
                        pfTotal = pfTotal,
                        esiTotal = esiTotal,
                        tdsTotal = tdsTotal
                    },
                    advancesSummary = advancesSummary,
                    recentActivity = recentWorkforceActivity
                }
            });
        }

        // --- STATUTORY CONFIGS ---

        [HttpGet("statutory-configs")]
        public async Task<IActionResult> GetStatutoryConfigs()
        {
            var configs = await _context.StatutoryConfigs.ToListAsync();
            return Ok(configs);
        }

        [HttpPost("statutory-configs")]
        public async Task<IActionResult> UpdateStatutoryConfig([FromBody] StatutoryConfig config)
        {
            if (config.ConfigId == Guid.Empty)
            {
                config.ConfigId = Guid.NewGuid();
                config.CreatedAt = DateTime.UtcNow;
                _context.StatutoryConfigs.Add(config);
            }
            else
            {
                _context.Entry(config).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();
            return Ok(config);
        }

        // --- SALARY ADVANCES ---

        [HttpGet("advances")]
        public async Task<IActionResult> GetAdvances()
        {
            var advances = await (from a in _context.SalaryAdvances
                                  join e in _context.Employees on a.EmployeeId equals e.EmployeeId into empJoin
                                  from e in empJoin.DefaultIfEmpty()
                                  select new {
                                      a.AdvanceId,
                                      a.EmployeeId,
                                      EmployeeName = e != null ? $"{e.FirstName} {e.LastName}" : "Unknown",
                                      a.Amount,
                                      a.Status,
                                      a.Reason,
                                      a.IssuedAt,
                                      a.IssuedBy,
                                      a.AdjustedInPayrollRunId,
                                      a.CreatedAt
                                  })
                                  .OrderByDescending(a => a.CreatedAt)
                                  .ToListAsync();
            return Ok(advances);
        }

        [HttpPost("advances")]
        public async Task<IActionResult> RequestAdvance([FromBody] SalaryAdvance advance)
        {
            advance.AdvanceId = Guid.NewGuid();
            advance.CreatedAt = DateTime.UtcNow;
            advance.IssuedAt = DateTime.UtcNow;
            advance.Status = "Pending";
            
            _context.SalaryAdvances.Add(advance);
            await _context.SaveChangesAsync();
            return Ok(advance);
        }

        [HttpPost("advances/{id}/approve")]
        public async Task<IActionResult> ApproveAdvance(Guid id)
        {
            var adv = await _context.SalaryAdvances.FindAsync(id);
            if (adv == null) return NotFound();
            
            adv.Status = "Approved"; // This will be adjusted in next payroll run
            await _context.SaveChangesAsync();
            return Ok(adv);
        }

        // --- AD-HOC ADJUSTMENTS ---

        [HttpGet("adjustments")]
        public async Task<IActionResult> GetAdjustments()
        {
            var adjustments = await _context.PayrollAdjustments
                .OrderByDescending(a => a.PayrollRunId)
                .ToListAsync();
            return Ok(adjustments);
        }

        [HttpPost("adjustments")]
        public async Task<IActionResult> CreateAdjustment([FromBody] PayrollAdjustment adjustment)
        {
            adjustment.PayrollAdjustmentId = Guid.NewGuid();
            _context.PayrollAdjustments.Add(adjustment);
            await _context.SaveChangesAsync();
            return Ok(adjustment);
        }
        // --- WORKFORCE POLICIES ---
        [HttpGet("policies")]
        public async Task<IActionResult> GetPolicies()
        {
            var policies = await _context.WorkforcePolicies.ToListAsync();
            return Ok(policies);
        }

        [HttpPost("policies")]
        public async Task<IActionResult> UpdatePolicy([FromBody] WorkforcePolicy policy)
        {
            if (policy.PolicyId == Guid.Empty)
            {
                policy.PolicyId = Guid.NewGuid();
                policy.UpdatedAt = DateTime.UtcNow;
                _context.WorkforcePolicies.Add(policy);
            }
            else
            {
                policy.UpdatedAt = DateTime.UtcNow;
                _context.Entry(policy).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();
            return Ok(policy);
        }

        [HttpPost("policies/sync-quotas")]
        public async Task<IActionResult> SyncQuotas([FromBody] int quota)
        {
            var employees = await _context.Employees.ToListAsync();
            foreach (var emp in employees)
            {
                emp.MonthlyPaidLeaveQuota = quota;
                emp.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return Ok(new { Count = employees.Count });
        }
    }
}
