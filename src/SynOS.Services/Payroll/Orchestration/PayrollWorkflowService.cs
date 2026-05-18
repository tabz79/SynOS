using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Payroll;
using SynOS.Models.Entities.Payroll;
using SynOS.Models.Enums;
using SynOS.Services.Payroll.Calculation;
using SynOS.Services.Payroll.Facts;
using SynOS.Services.Payroll.Orchestration.Exceptions;
using SynOS.Services.SpendEngine;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Entities.Payables; // ADDED
using System.Text.Json; // For ProvisionalResultData serialization
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities;
using SynOS.Services;

namespace SynOS.Services.Payroll.Orchestration
{
    public class PayrollWorkflowService : IPayrollWorkflowService
    {
        private readonly SynOSDbContext _context;
        private readonly IPayrollCalculationLogic _calculationLogic;
        private readonly IPayrollFactWriter _factWriter;
        private readonly ISpendFactWriter _spendFactWriter;
        private readonly IUserService _userService;

        public PayrollWorkflowService(
            SynOSDbContext context,
            IPayrollCalculationLogic calculationLogic,
            IPayrollFactWriter factWriter,
            ISpendFactWriter spendFactWriter,
            IUserService userService)
        {
            _context = context;
            _calculationLogic = calculationLogic;
            _factWriter = factWriter;
            _spendFactWriter = spendFactWriter;
            _userService = userService;
        }

        public async Task<PayrollPeriod> CreatePayrollPeriodAsync(DateTime startDate, DateTime endDate)
        {
            if (startDate >= endDate)
            {
                throw new PayrollOrchestrationException("Payroll period start date must be before end date.");
            }

            // Check for existing period in the same month/year
            var existingMonthPeriod = await _context.PayrollPeriods
                .AsNoTracking()
                .AnyAsync(pp => pp.StartDate.Year == startDate.Year && pp.StartDate.Month == startDate.Month);

            if (existingMonthPeriod)
            {
                throw new PayrollOrchestrationException($"A payroll period already exists for {startDate:MMMM yyyy}.");
            }

            // Check for overlapping periods
            var overlappingPeriod = await _context.PayrollPeriods
                .AsNoTracking()
                .AnyAsync(pp => 
                    (startDate < pp.EndDate && endDate > pp.StartDate));

            if (overlappingPeriod)
            {
                throw new PayrollOrchestrationException("New payroll period overlaps with an existing period.");
            }

            var newPeriod = new PayrollPeriod
            {
                PayrollPeriodId = Guid.NewGuid(),
                StartDate = startDate,
                EndDate = endDate,
                Status = PayrollPeriodStatus.Open
            };

            _context.PayrollPeriods.Add(newPeriod);
            await _context.SaveChangesAsync();
            return newPeriod;
        }

        public async Task LockPayrollPeriodAsync(Guid payrollPeriodId)
        {
            var period = await _context.PayrollPeriods.FindAsync(payrollPeriodId);
            if (period == null)
            {
                throw new PayrollOrchestrationException($"Payroll Period with ID '{payrollPeriodId}' not found.");
            }
            if (period.Status != PayrollPeriodStatus.Open)
            {
                throw new PayrollOrchestrationException($"Payroll Period with ID '{payrollPeriodId}' is not in Open status and cannot be locked.");
            }

            period.Status = PayrollPeriodStatus.Locked;
            await _context.SaveChangesAsync();
        }

        public async Task<PayrollRun> StartPayrollRunAsync(Guid payrollPeriodId)
        {
            var period = await _context.PayrollPeriods.FindAsync(payrollPeriodId);
            if (period == null)
            {
                throw new PayrollOrchestrationException($"Payroll Period with ID '{payrollPeriodId}' not found.");
            }

            // Check for any existing run first - Idempotent return (Draft, Calculated, Finalized, etc.)
            var existingRun = await _context.PayrollRuns
                .Where(pr => pr.PayrollPeriodId == payrollPeriodId)
                .OrderByDescending(pr => pr.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingRun != null)
            {
                return existingRun;
            }

            // Auto-lock if Open
            if (period.Status == PayrollPeriodStatus.Open)
            {
                period.Status = PayrollPeriodStatus.Locked;
                await _context.SaveChangesAsync();
            }
            else if (period.Status != PayrollPeriodStatus.Locked)
            {
                throw new PayrollOrchestrationException($"Payroll Period with ID '{payrollPeriodId}' is in {period.Status} status. Cannot start a run.");
            }

            var newRun = new PayrollRun
            {
                PayrollRunId = Guid.NewGuid(),
                PayrollPeriodId = payrollPeriodId,
                Status = PayrollRunStatus.Draft,
                CreatedAt = DateTime.UtcNow,
                CompletedAt = null // Not completed yet
            };

            _context.PayrollRuns.Add(newRun);
            await _context.SaveChangesAsync();
            return newRun;
        }

        public async Task ExecuteCalculationAsync(Guid payrollRunId)
        {
            var run = await _context.PayrollRuns.FindAsync(payrollRunId);
            if (run == null)
            {
                throw new PayrollOrchestrationException($"Payroll Run with ID '{payrollRunId}' not found.");
            }
            if (run.Status != PayrollRunStatus.Draft && run.Status != PayrollRunStatus.Calculated)
            {
                throw new PayrollOrchestrationException($"Payroll Run with ID '{payrollRunId}' is in status '{run.Status}'. Cannot execute calculation.");
            }

            var period = await _context.PayrollPeriods.FindAsync(run.PayrollPeriodId);
            if (period == null)
            {
                throw new PayrollOrchestrationException($"Payroll Period with ID '{run.PayrollPeriodId}' not found for the run.");
            }

            run.Status = PayrollRunStatus.Processing;
            await _context.SaveChangesAsync();
            
            var activeEmployeeIds = await _context.Employees
                .AsNoTracking()
                .Where(e => e.IsActive)
                .Select(e => e.EmployeeId)
                .ToListAsync();

            var context = new PayrollCalculationContext
            {
                PayrollRunId = run.PayrollRunId,
                PayrollPeriodStartDate = period.StartDate,
                PayrollPeriodEndDate = period.EndDate,
                EmployeeIds = activeEmployeeIds,
                TimeFacts = new List<PayrollTimeFactPlaceholder>(), // Empty for V1
                LeaveFacts = new List<PayrollLeaveFactPlaceholder>() // Empty for V1
            };

            var calculationResult = await _calculationLogic.CalculateAsync(context);

            if (calculationResult.ValidationErrors.Any())
            {
                run.Status = PayrollRunStatus.Voided; // Business failure voids the run
                run.ProvisionalResultData = JsonSerializer.Serialize(calculationResult.ValidationErrors);
                run.CompletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
            else
            {
                run.Status = PayrollRunStatus.Calculated;
                run.ProvisionalResultData = JsonSerializer.Serialize(calculationResult.ProvisionalResults);
                run.CompletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task FinalizePayrollRunAsync(Guid payrollRunId)
        {
            var run = await _context.PayrollRuns.FindAsync(payrollRunId);
            if (run == null)
            {
                throw new PayrollOrchestrationException($"Payroll Run with ID '{payrollRunId}' not found.");
            }
            if (run.Status != PayrollRunStatus.Calculated)
            {
                throw new PayrollOrchestrationException($"Payroll Run with ID '{payrollRunId}' is not in Calculated status. Cannot finalize.");
            }
            if (string.IsNullOrWhiteSpace(run.ProvisionalResultData))
            {
                throw new PayrollOrchestrationException($"Payroll Run with ID '{payrollRunId}' has no provisional result data to finalize.");
            }

            var period = await _context.PayrollPeriods.FindAsync(run.PayrollPeriodId);
            if (period == null)
            {
                throw new PayrollOrchestrationException($"Parent Payroll Period with ID '{run.PayrollPeriodId}' not found.");
            }
            if (period.Status != PayrollPeriodStatus.Locked)
            {
                throw new PayrollOrchestrationException($"Parent Payroll Period with ID '{run.PayrollPeriodId}' is not in Locked status. Cannot finalize run.");
            }

            // Deserialize provisional results - no re-running calculation
            var provisionalResults = JsonSerializer.Deserialize<List<ProvisionalResultDto>>(run.ProvisionalResultData);
            if (provisionalResults == null)
            {
                throw new PayrollOrchestrationException($"Failed to deserialize provisional results for run '{payrollRunId}'.");
            }
            var calculationResultForFactWriter = new PayrollCalculationResult { ProvisionalResults = provisionalResults };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Write granular facts for audit/history
                await _factWriter.WriteFactsAsync(run, calculationResultForFactWriter);

                // 2. Generate Liabilities (EmployeePayables) - NO SpendFacts here
                var employeeIds = provisionalResults.Select(r => r.EmployeeId).Distinct().ToList();
                var employees = await _context.Employees
                    .Where(e => employeeIds.Contains(e.EmployeeId))
                    .ToDictionaryAsync(e => e.EmployeeId, e => e);

                // Get global fallback statutory rates (PF, ESI)
                var globalStatutoryRates = await _context.StatutoryConfigs
                    .Where(c => c.IsActive)
                    .ToListAsync();
                
                var globalPfRate = globalStatutoryRates.FirstOrDefault(r => r.ComponentName == "PF")?.EmployeeRate ?? 0.12m;
                var globalEsiRate = globalStatutoryRates.FirstOrDefault(r => r.ComponentName == "ESI")?.EmployeeRate ?? 0.0075m;

                foreach (var empId in employeeIds)
                {
                    employees.TryGetValue(empId, out var emp);
                    var empResult = provisionalResults.FirstOrDefault(r => r.EmployeeId == empId);
                    if (emp == null || empResult == null) continue;
                    
                    var grossSalary = empResult.Amount;
                    
                    // 1. Statutory Deductions (Employee-Level or Global Fallback)
                    decimal pfRate = emp.PFEnabled ? emp.PFPercentage / 100m : 0;
                    decimal esiRate = emp.ESIEnabled ? emp.ESIPercentage / 100m : 0;
                    
                    var pfDeduction = Math.Round(grossSalary * pfRate, 2);
                    var esiDeduction = Math.Round(grossSalary * esiRate, 2);
                    
                    // 2. TDS Calculation
                    decimal tdsDeduction = 0;
                    if (emp.TDSEnabled)
                    {
                        if (emp.TDSMode == TaxCalculationMode.Percentage)
                        {
                            tdsDeduction = Math.Round(grossSalary * (emp.TDSValue / 100m), 2);
                        }
                        else
                        {
                            tdsDeduction = emp.TDSValue;
                        }
                    }

                    // 3. Deduct Approved Advances
                    var advances = await _context.SalaryAdvances
                        .Where(a => a.EmployeeId == empId && a.Status == "Approved")
                        .ToListAsync();
                    var advanceDeduction = advances.Sum(a => a.Amount);

                    // 4. Final Net Calculation
                    var netPayable = grossSalary - pfDeduction - esiDeduction - tdsDeduction - advanceDeduction;

                    var payable = new EmployeePayable
                    {
                        EmployeePayableId = Guid.NewGuid(),
                        EmployeeId = empId,
                        PayrollRunId = run.PayrollRunId,
                        PayrollPeriodId = run.PayrollPeriodId,
                        GrossSalary = grossSalary,
                        PFDeduction = pfDeduction,
                        ESIDeduction = esiDeduction,
                        TDSDeduction = tdsDeduction,
                        OtherDeductions = advanceDeduction,
                        NetPayable = Math.Round(netPayable, 0), // ROUND TO NEAREST RUPEE
                        AmountPaid = 0,
                        Status = "Due",
                        Remarks = $"Generated via Payroll Run {run.PayrollRunId}",
                        
                        // Stability Snapshots (Audit Trail)
                        SnapshotBaseSalary = emp.BaseSalary,
                        SnapshotPFRate = pfRate,
                        SnapshotESIRate = esiRate,
                        SnapshotTDSMode = emp.TDSMode,
                        SnapshotTDSValue = emp.TDSValue,
                        LopDaysCount = empResult.LopDays,

                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.EmployeePayables.Add(payable);

                    // Mark advances as Adjusted
                    foreach (var adv in advances)
                    {
                        adv.Status = "Adjusted";
                        adv.AdjustedInPayrollRunId = run.PayrollRunId;
                    }
                }

                // Update run and period status
                run.Status = PayrollRunStatus.Finalized;
                run.CompletedAt = DateTime.UtcNow;
                run.ProvisionalResultData = null; // Clear transient data
                period.Status = PayrollPeriodStatus.Finalized;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new PayrollOrchestrationException($"Failed to finalize Payroll Run '{payrollRunId}'. See inner exception for details.", ex);
            }
        }

        public async Task VoidPayrollRunAsync(Guid payrollRunId)
        {
            var run = await _context.PayrollRuns.FindAsync(payrollRunId);
            if (run == null)
            {
                throw new PayrollOrchestrationException($"Payroll Run with ID '{payrollRunId}' not found.");
            }
            
            // Allow voiding from Draft, Processing, or Calculated states
            if (run.Status != PayrollRunStatus.Draft &&
                run.Status != PayrollRunStatus.Processing &&
                run.Status != PayrollRunStatus.Calculated)
            {
                throw new PayrollOrchestrationException($"Payroll Run with ID '{payrollRunId}' is in '{run.Status}' status. Only Draft, Processing, or Calculated runs can be voided.");
            }

            run.Status = PayrollRunStatus.Voided;
            run.CompletedAt = DateTime.UtcNow;
            run.ProvisionalResultData = null; // Clear transient data
            await _context.SaveChangesAsync();

            // Do NOT change the status of the parent PayrollPeriod.
        }

        public async Task<System.Collections.Generic.List<PayrollPeriodSummaryView>> GetPeriodSummariesAsync()
        {
            var periods = await _context.PayrollPeriods
                .OrderByDescending(p => p.StartDate)
                .ToListAsync();

            var summaries = new System.Collections.Generic.List<PayrollPeriodSummaryView>();

            var currentStaffCount = await _context.Employees.CountAsync(e => e.IsActive);
            var currentTotalSalary = await _context.Employees.Where(e => e.IsActive).SumAsync(e => e.BaseSalary);

            foreach (var p in periods)
            {
                var summary = new PayrollPeriodSummaryView
                {
                    PayrollPeriodId = p.PayrollPeriodId,
                    StartDate = p.StartDate,
                    EndDate = p.EndDate,
                    Status = p.Status,
                    StaffCount = currentStaffCount,
                    TotalAccrual = currentTotalSalary
                };

                // If finalized, get actuals from payables
                if (p.Status == PayrollPeriodStatus.Finalized)
                {
                    var payables = await _context.EmployeePayables
                        .Where(ep => ep.PayrollPeriodId == p.PayrollPeriodId)
                        .ToListAsync();
                    
                    if (payables.Any())
                    {
                        summary.StaffCount = payables.Count;
                        summary.TotalAccrual = payables.Sum(ep => ep.GrossSalary);
                    }
                }

                summaries.Add(summary);
            }

            return summaries;
        }

        public async Task ProvisionAccessAsync(Guid employeeId, string initialPassword, Guid actorUserId)
        {
            var emp = await _context.Employees.FindAsync(employeeId);
            if (emp == null) throw new PayrollOrchestrationException("Employee not found.");
            if (emp.UserId != null) throw new PayrollOrchestrationException("Employee already has system access.");
            if (string.IsNullOrWhiteSpace(emp.Email)) throw new PayrollOrchestrationException("Employee email is required for provisioning.");

            var dto = new CreateUserDto
            {
                Email = emp.Email,
                Name = $"{emp.FirstName} {emp.LastName}",
                Password = initialPassword,
                Role = "Staff", // Default role for operational staff
                Designation = emp.JobTitle
            };

            var user = await _userService.CreateUserAsync(dto, actorUserId);
            
            emp.UserId = user.UserId;
            emp.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
        }
    }
}
