using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services.Payroll.Orchestration;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/payroll")]
    public class PayrollController : ControllerBase
    {
        private readonly IPayrollWorkflowService _payrollWorkflowService;

        public PayrollController(IPayrollWorkflowService payrollWorkflowService)
        {
            _payrollWorkflowService = payrollWorkflowService;
        }

        [HttpPost("runs/{runId}/finalize")]
        public async Task<IActionResult> FinalizeRun(Guid runId)
        {
            try
            {
                await _payrollWorkflowService.FinalizePayrollRunAsync(runId);
                return Ok(new { message = "Payroll finalized" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
