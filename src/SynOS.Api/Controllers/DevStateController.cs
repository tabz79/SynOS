using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using SynOS.Services.Dev;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/dev-state")]
    public class DevStateController : ControllerBase
    {
        private readonly IDevWorkflowSimulator _simulator;
        private readonly IWebHostEnvironment _env;

        public DevStateController(IDevWorkflowSimulator simulator, IWebHostEnvironment env)
        {
            _simulator = simulator;
            _env = env;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateDevState([FromBody] SimulateDevStateRequest request)
        {
            // STRICT GUARD: Dev only
            if (!_env.IsDevelopment())
            {
                return NotFound();
            }

            var response = await _simulator.SimulateToStateAsync(request);
            
            if (response.Logs.Any(l => l.Status == "FAILED"))
            {
                return BadRequest(response);
            }

            return Ok(response);
        }
    }
}
