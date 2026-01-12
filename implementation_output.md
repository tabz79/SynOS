### Output for Payroll Workflow Orchestration Service (V1)

**1. Corrected `PayrollRunStatus.cs`**
File: `src/SynOS.Models/Enums/PayrollRunStatus.cs`
```csharp
namespace SynOS.Models.Enums
{
    public enum PayrollRunStatus
    {
        Draft,
        Processing,
        Calculated,
        Finalized,
        Voided
    }
}
```

**2. Corrected `PayrollWorkflowService.cs`**
File: `src/SynOS.Services/Payroll/Orchestration/PayrollWorkflowService.cs`
```csharp
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
using System.Text.Json; // For ProvisionalResultData serialization

namespace SynOS.Services.Payroll.Orchestration
{
    public class PayrollWorkflowService : IPayrollWorkflowService
    {
        private readonly SynOSDbContext _context;
        private readonly IPayrollCalculationLogic _calculationLogic;
        private readonly IPayrollFactWriter _factWriter;

        public PayrollWorkflowService(
            SynOSDbContext context,
            IPayrollCalculationLogic calculationLogic,
            IPayrollFactWriter factWriter)
        {
            _context = context;
            _calculationLogic = calculationLogic;
            _factWriter = factWriter;
        }

        public async Task<PayrollPeriod> CreatePayrollPeriodAsync(DateTime startDate, DateTime endDate)
        {
            if (startDate >= endDate)
            {
                throw new PayrollOrchestrationException("Payroll period start date must be before end date.");
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
            if (period.Status != PayrollPeriodStatus.Locked)
            {
                throw new PayrollOrchestrationException($"Payroll Period with ID '{payrollPeriodId}' is not in Locked status. Cannot start a run.");
            }

            // Check for active runs (Draft, Processing, Calculated)
            var activeRun = await _context.PayrollRuns
                .AsNoTracking()
                .AnyAsync(pr => pr.PayrollPeriodId == payrollPeriodId &&
                                (pr.Status == PayrollRunStatus.Draft ||
                                 pr.Status == PayrollRunStatus.Processing ||
                                 pr.Status == PayrollRunStatus.Calculated));
            if (activeRun)
            {
                throw new PayrollOrchestrationException($"An active payroll run already exists for Payroll Period ID '{payrollPeriodId}'.");
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
            if (run.Status != PayrollRunStatus.Draft)
            {
                throw new PayrollOrchestrationException($"Payroll Run with ID '{payrollRunId}' is not in Draft status. Cannot execute calculation.");
            }

            run.Status = PayrollRunStatus.Processing;
            // Removed: run.CompletedAt = null; // A run is one attempt, CompletedAt is set once.
            await _context.SaveChangesAsync();

            var calculationResult = await _calculationLogic.CalculateAsync(payrollRunId);

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

            // Removed: return calculationResult;
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

            // Removed: using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Write facts
                await _factWriter.WriteFactsAsync(run, calculationResultForFactWriter);

                // Update run and period status
                run.Status = PayrollRunStatus.Finalized;
                run.CompletedAt = DateTime.UtcNow;
                run.ProvisionalResultData = null; // Clear transient data
                period.Status = PayrollPeriodStatus.Finalized;

                await _context.SaveChangesAsync();
                // Removed: await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                // Removed: transaction.Rollback();
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
    }
}
```

**3. Any interface changes required to support Fix #4**
File: `src/SynOS.Services/Payroll/Orchestration/IPayrollWorkflowService.cs`
```csharp
using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Payroll;
using SynOS.Models.Entities.Payroll;

namespace SynOS.Services.Payroll.Orchestration
{
    public interface IPayrollWorkflowService
    {
        Task<PayrollPeriod> CreatePayrollPeriodAsync(DateTime startDate, DateTime endDate);
        Task LockPayrollPeriodAsync(Guid payrollPeriodId);
        Task<PayrollRun> StartPayrollRunAsync(Guid payrollPeriodId);
        Task ExecuteCalculationAsync(Guid payrollRunId); // Changed from Task<PayrollCalculationResult>
        Task FinalizePayrollRunAsync(Guid payrollRunId);
        Task VoidPayrollRunAsync(Guid payrollRunId);
    }
}
```