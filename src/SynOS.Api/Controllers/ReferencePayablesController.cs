using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Enums.Payables;
using SynOS.Services.SpendEngine;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class ReferencePayablesController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;

        public ReferencePayablesController(SynOSDbContext context, ISpendFactWriter spendFactWriter)
        {
            _context = context;
            _spendFactWriter = spendFactWriter;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReferenceLabPayable>>> GetPayables()
        {
            return await _context.ReferenceLabPayables
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        [HttpPatch("{id}/settle")]
        public async Task<IActionResult> SettlePayable(Guid id, [FromBody] SettleRequestDto request)
        {
            if (request == null || request.Amount <= 0)
            {
                return BadRequest("Valid payment amount is required.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payable = await _context.ReferenceLabPayables.FindAsync(id);
                if (payable == null)
                {
                    return NotFound($"Payable {id} not found.");
                }

                if (payable.Status == ReferencePayableStatus.Settled)
                {
                    return BadRequest("Payable is already fully settled.");
                }

                // SAFETY: Reject overpayment
                if (payable.AmountPaid + request.Amount > payable.AmountDue)
                {
                    return BadRequest($"Overpayment rejected. Amount due is {payable.AmountDue - payable.AmountPaid}, but tried to pay {request.Amount}.");
                }

                // 1. Update Payable State
                payable.AmountPaid += request.Amount;
                if (payable.AmountPaid >= payable.AmountDue)
                {
                    payable.Status = ReferencePayableStatus.Settled;
                    payable.SettledAt = DateTime.UtcNow;
                }
                else
                {
                    payable.Status = ReferencePayableStatus.PartiallyPaid;
                }

                // 2. Emit SpendFact (Atomic with Payable update)
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    payable.ReferenceLabId ?? Guid.Empty, // Payee
                    request.Amount,
                    "INR", // Default currency
                    "OutsourcedTest",
                    payable.ReferenceLabName ?? "Reference Lab",
                    $"Settlement for Lab Payout: {payable.Id}",
                    null, // BranchId
                    SynOS.Models.Enums.PaymentMethod.BankTransfer, // Default
                    $"Settlement-{payable.Id}-{DateTime.UtcNow:yyyyMMdd}",
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    "Main Account",
                    "Finance API",
                    Guid.Empty,
                    Guid.Empty,
                    Guid.Empty
                );

                await _spendFactWriter.CreateSpendFactAsync(spendFact);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Payable settled successfully.", Status = payable.Status.ToString(), AmountRemaining = payable.AmountDue - payable.AmountPaid });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }

    public class SettleRequestDto
    {
        public decimal Amount { get; set; }
        public Guid UserId { get; set; }
    }
}
