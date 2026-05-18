using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Services.Payroll.Orchestration;
using SynOS.Services.Payroll.Settlement; // ADDED

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/payroll")]
    public class PayrollController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IPayrollWorkflowService _payrollWorkflowService;
        private readonly IPayrollSettlementService _settlementService;

        public PayrollController(SynOSDbContext context, IPayrollWorkflowService payrollWorkflowService, IPayrollSettlementService settlementService)
        {
            _context = context;
            _payrollWorkflowService = payrollWorkflowService;
            _settlementService = settlementService;
        }

        [HttpGet("periods")]
        public async Task<IActionResult> GetPeriods()
        {
            var summaries = await _payrollWorkflowService.GetPeriodSummariesAsync();
            return Ok(summaries);
        }

        [HttpPost("periods")]
        public async Task<IActionResult> CreatePeriod([FromBody] CreatePeriodRequest request)
        {
            try
            {
                var period = await _payrollWorkflowService.CreatePayrollPeriodAsync(request.StartDate, request.EndDate);
                return Ok(period);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("periods/{periodId}/lock")]
        public async Task<IActionResult> LockPeriod(Guid periodId)
        {
            try
            {
                await _payrollWorkflowService.LockPayrollPeriodAsync(periodId);
                return Ok(new { message = "Period locked successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("runs")]
        public async Task<IActionResult> GetRuns()
        {
            var runs = await _context.PayrollRuns
                .Include(r => r.PayrollPeriod)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return Ok(runs);
        }

        [HttpPost("runs")]
        public async Task<IActionResult> StartRun([FromBody] StartRunRequest request)
        {
            try
            {
                var run = await _payrollWorkflowService.StartPayrollRunAsync(request.PayrollPeriodId);
                return Ok(run);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("runs/{runId}/calculate")]
        public async Task<IActionResult> ExecuteCalculation(Guid runId)
        {
            try
            {
                await _payrollWorkflowService.ExecuteCalculationAsync(runId);
                return Ok(new { message = "Calculation completed." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("runs/{runId}/review")]
        public async Task<IActionResult> GetRunReview(Guid runId)
        {
            var run = await _context.PayrollRuns.FindAsync(runId);
            if (run == null) return NotFound();
            if (string.IsNullOrEmpty(run.ProvisionalResultData)) return BadRequest(new { message = "No calculation data available." });

            var data = System.Text.Json.JsonSerializer.Deserialize<object>(run.ProvisionalResultData);
            return Ok(data);
        }

        [HttpPost("runs/{runId}/finalize")]
        public async Task<IActionResult> FinalizeRun(Guid runId)
        {
            try
            {
                await _payrollWorkflowService.FinalizePayrollRunAsync(runId);
                return Ok(new { message = "Payroll finalized and liabilities generated." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("runs/{runId}/payables")]
        public async Task<IActionResult> GetPayablesForRun(Guid runId)
        {
            var payables = await (from p in _context.EmployeePayables
                                  join e in _context.Employees on p.EmployeeId equals e.EmployeeId into empJoin
                                  from e in empJoin.DefaultIfEmpty()
                                  where p.PayrollRunId == runId
                                  select new {
                                      p.EmployeePayableId,
                                      p.PayrollRunId,
                                      p.EmployeeId,
                                      EmployeeName = e != null ? $"{e.FirstName} {e.LastName}" : "Unknown",
                                      p.GrossSalary,
                                      p.PFDeduction,
                                      p.ESIDeduction,
                                      p.TDSDeduction,
                                      p.NetPayable,
                                      p.LopDaysCount,
                                      p.SnapshotBaseSalary,
                                      p.SnapshotPFRate,
                                      p.SnapshotESIRate,
                                      p.SnapshotTDSMode,
                                      p.SnapshotTDSValue,
                                      p.Status,
                                      PaymentMethod = "BankTransfer",
                                      PaymentReference = "",
                                      PaidAt = p.SettledAt
                                  })
                                  .ToListAsync();
            return Ok(payables);
        }

        [HttpPost("settle/{payableId}")]
        public async Task<IActionResult> SettleSalary(Guid payableId, [FromBody] SettlementRequest request)
        {
            try
            {
                await _settlementService.SettleSalaryAsync(payableId, request.Amount, request.Method, request.Reference);
                return Ok(new { message = "Salary payment recorded." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("runs/{runId}/bulk-settle")]
        public async Task<IActionResult> BulkSettle(Guid runId, [FromBody] BulkSettlementRequest request)
        {
            try
            {
                await _settlementService.BulkSettleAsync(runId, request.Method);
                return Ok(new { message = "Bulk settlement completed." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("maintenance/cleanup-duplicates")]
        public async Task<IActionResult> CleanupDuplicates()
        {
            var allPeriods = await _context.PayrollPeriods.ToListAsync();
            
            var groups = allPeriods
                .GroupBy(p => new { p.StartDate.Year, p.StartDate.Month })
                .Where(g => g.Count() > 1);

            int deletedCount = 0;
            foreach (var group in groups)
            {
                var toDelete = group.OrderBy(p => p.Status).Skip(1).ToList(); // Keep the one with highest status
                _context.PayrollPeriods.RemoveRange(toDelete);
                deletedCount += toDelete.Count;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Cleanup complete. Deleted {deletedCount} duplicate periods." });
        }

        [HttpPost("provision-access")]
        public async Task<IActionResult> ProvisionAccess([FromBody] PayrollProvisionAccessRequest request)
        {
            try
            {
                // In a real app, actorUserId would come from User.FindFirstValue(ClaimTypes.NameIdentifier)
                // For now, using a system ID or Guid.Empty if not provided
                var actorUserId = Guid.Empty; 
                await _payrollWorkflowService.ProvisionAccessAsync(request.EmployeeId, request.InitialPassword, actorUserId);
                return Ok(new { message = "System access provisioned successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class CreatePeriodRequest
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class StartRunRequest
    {
        public Guid PayrollPeriodId { get; set; }
    }

    public class SettlementRequest
    {
        public decimal Amount { get; set; }
        public SynOS.Models.Enums.PaymentMethod Method { get; set; }
        public string Reference { get; set; }
    }

    public class BulkSettlementRequest
    {
        public SynOS.Models.Enums.PaymentMethod Method { get; set; }
    }

    public class PayrollProvisionAccessRequest
    {
        public Guid EmployeeId { get; set; }
        public string InitialPassword { get; set; }
    }
}
