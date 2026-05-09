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
    public class OverheadExpensesController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;

        public OverheadExpensesController(SynOSDbContext context, ISpendFactWriter spendFactWriter)
        {
            _context = context;
            _spendFactWriter = spendFactWriter;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OverheadPayableFact>>> GetExpenses()
        {
            return await _context.OverheadPayableFacts
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<IActionResult> CreateExpense([FromBody] OverheadExpenseRequestDto request)
        {
            if (request == null || request.Amount <= 0)
            {
                return BadRequest("Valid amount is required.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Create Overhead Payable (Obligation ONLY)
                var payable = new OverheadPayableFact
                {
                    OverheadPayableId = Guid.NewGuid(),
                    Category = request.Category,
                    AmountDue = request.Amount,
                    Description = request.Description,
                    DueDate = request.ExpenseDate,
                    Status = VendorPayableStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = request.UserId
                };

                await _context.OverheadPayableFacts.AddAsync(payable);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetExpenses), new { id = payable.OverheadPayableId }, payable);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("{id}/settle")]
        public async Task<IActionResult> SettleExpense(Guid id, [FromBody] SettleOverheadRequestDto request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payable = await _context.OverheadPayableFacts.FindAsync(id);
                if (payable == null) return NotFound("Overhead payable not found.");

                if (payable.Status == VendorPayableStatus.Settled)
                    return BadRequest("Payable is already settled.");

                var remaining = payable.AmountDue - payable.AmountPaid;
                var settleAmount = Math.Min(request.Amount, remaining);

                payable.AmountPaid += settleAmount;

                // Precision check: using 0.0001m
                if (Math.Abs(payable.AmountDue - payable.AmountPaid) < 0.0001m)
                {
                    payable.Status = VendorPayableStatus.Settled;
                    payable.SettledAt = DateTime.UtcNow;
                }
                else
                {
                    payable.Status = VendorPayableStatus.PartiallyPaid;
                }

                // Emit SpendFact (Money Moved)
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    Guid.Empty,
                    settleAmount,
                    "INR",
                    "Overhead",
                    payable.Description ?? "Overhead Expense", // PayeeName
                    $"Category: {payable.Category}", // Notes
                    null, // BranchId
                    request.PaymentMethod,
                    $"OHP-{payable.OverheadPayableId.ToString().Substring(0, 8)}",
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

                return Ok(payable);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }

    public class OverheadExpenseRequestDto
    {
        public OverheadExpenseCategory Category { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; }
        public DateTime ExpenseDate { get; set; }
        public Guid UserId { get; set; }
    }

    public class SettleOverheadRequestDto
    {
        public decimal Amount { get; set; }
        public SynOS.Models.Enums.PaymentMethod PaymentMethod { get; set; }
    }
}
