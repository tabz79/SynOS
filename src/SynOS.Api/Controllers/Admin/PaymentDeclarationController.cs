using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SynOS.Data;
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities.Payments;

namespace SynOS.Api.Controllers.Admin
{
    /// <summary>
    /// **[SEALED MANUAL ENTRY POINT]**
    /// This controller is a minimal, explicit, and manual entry point for a human/admin
    /// to declare that a payment has already happened elsewhere.
    /// </summary>
    /// <remarks>
    /// **INTENT LOCK & GUARDRAILS:**
    /// - This endpoint **DECLARES** truth; it does **NOT** execute payments.
    /// - It is append-only and creates an immutable `PaymentConfirmedFact`.
    /// - It does **NOT** infer payment from any other action.
    /// - It does **NOT** trigger the Spend or Revenue engines directly.
    /// - Any automation or workflow must live **OUTSIDE** this boundary.
    /// - **NO SERVICE LAYER:** This controller uses DbContext directly by design to prevent
    ///   this boundary from accidentally evolving into a "Payment Engine" or service.
    /// </remarks>
    [ApiController]
    [Route("api/admin/payment-declaration")]
    public class PaymentDeclarationController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public PaymentDeclarationController(SynOSDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Manually declares that a payment has been confirmed.
        /// This action creates an immutable fact and does not trigger any downstream engines.
        /// </summary>
        /// <param name="dto">The explicit details of the payment confirmation.</param>
        [HttpPost]
        public async Task<IActionResult> DeclarePayment([FromBody] PaymentDeclarationDto dto)
        {
            if (!Enum.TryParse<PaymentDirection>(dto.Direction, true, out var direction))
            {
                return BadRequest("Invalid Payment Direction. Must be 'In' or 'Out'.");
            }
            
            var paymentFact = new PaymentConfirmedFact(
                Guid.NewGuid(),
                direction,
                dto.Amount,
                dto.CounterpartyId,
                dto.OccurredAt,
                DateTimeOffset.UtcNow,
                dto.ReferenceId,
                dto.Channel
            );

            await _context.PaymentConfirmedFacts.AddAsync(paymentFact);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Payment fact successfully declared.", paymentId = paymentFact.PaymentId });
        }
    }
}
