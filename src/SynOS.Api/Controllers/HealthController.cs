// File: src/SynOS.Api/Controllers/HealthController.cs
// Author: Gemini
// Date: 2025-11-13

using Microsoft.AspNetCore.Mvc;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;

        public HealthController(ILogger<HealthController> logger)
        {
            _logger = logger;
        }

        [HttpGet("/healthz")]
        public IActionResult Get()
        {
            _logger.LogInformation("Health check performed.");
            return Ok("SynOS API is healthy.");
        }
    }
}
