using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Revenue;
using SynOS.Services.Revenue;

namespace SynOS.Api.Controllers.Revenue
{
    /// <summary>
    /// **[REVENUE ENGINE: WRITE-ONLY API]**
    /// This controller serves as the single write-gate for declaring RevenueFacts.
    /// It is strictly append-only and immutable.
    /// </summary>
    /// <remarks>
    /// **ENGINE SEALED: WRITE-ONLY TRUTH**
    /// - Accepts commands to declare a RevenueFact.
    /// - Returns only an acknowledgement, never the full fact or derived data.
    /// - No GET, PUT, or DELETE endpoints are exposed.
    /// - No validation beyond basic type binding.
    /// - No business logic, analytics, or inference.
    /// </remarks>
    [ApiController]
    [Route("api/revenue")]
    public class RevenueController : ControllerBase
    {
        private readonly IRevenueFactWriter _revenueFactWriter;

        public RevenueController(IRevenueFactWriter revenueFactWriter)
        {
            _revenueFactWriter = revenueFactWriter;
        }

        /// <summary>
        /// Declares that a revenue fact has occurred.
        /// This is an append-only operation.
        /// </summary>
        /// <param name="command">The command containing the details of the revenue fact.</param>
        /// <returns>An acknowledgement with the ID of the declared fact and its recorded timestamp.</returns>
        [HttpPost("facts")]
        public async Task<IActionResult> DeclareRevenueFact([FromBody] DeclareRevenueFactCommand command)
        {
            if (command == null)
            {
                return BadRequest("Command cannot be null.");
            }

            // Basic checks for required fields. More complex validation is not allowed here.
            if (command.Amount <= 0)
            {
                return BadRequest("Revenue Amount must be positive.");
            }
            if (string.IsNullOrWhiteSpace(command.Currency))
            {
                return BadRequest("Currency is required.");
            }
            if (string.IsNullOrWhiteSpace(command.SourceReferenceId))
            {
                return BadRequest("SourceReferenceId is required.");
            }
            if (command.DeclaredByUserId == Guid.Empty)
            {
                return BadRequest("DeclaredByUserId is required.");
            }

            var revenueFactId = await _revenueFactWriter.DeclareRevenueFactAsync(command);

            return Ok(new
            {
                success = true,
                revenueFactId = revenueFactId,
                recordedAt = DateTimeOffset.UtcNow, // Use current UTC time for recordedAt in response
                message = "Revenue fact successfully declared."
            });
        }
    }
}
