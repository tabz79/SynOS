using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [AllowAnonymous]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;
        private readonly SynOSDbContext _dbContext;

        public HealthController(ILogger<HealthController> logger, SynOSDbContext dbContext)
        {
            _logger = logger;
            _dbContext = dbContext;
        }

        [HttpGet("/health")]
        [HttpGet("/healthz")]
        public async Task<IActionResult> Get()
        {
            bool dbHealthy = false;
            try
            {
                dbHealthy = await _dbContext.Database.CanConnectAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Health check database connection probe failed.");
                dbHealthy = false;
            }

            var isHealthy = dbHealthy;
            var response = new
            {
                status = isHealthy ? "Healthy" : "Degraded",
                service = "Running",
                database = dbHealthy ? "Connected" : "Disconnected",
                timestamp = DateTime.UtcNow,
                version = "1.5.2"
            };

            if (!isHealthy)
            {
                return StatusCode(503, response);
            }

            return Ok(response);
        }
    }
}
