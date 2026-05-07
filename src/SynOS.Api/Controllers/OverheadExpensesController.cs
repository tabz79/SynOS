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
        public async Task<ActionResult<IEnumerable<OverheadExpense>>> GetExpenses()
        {
            return await _context.OverheadExpenses
                .OrderByDescending(e => e.ExpenseDate)
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
                // 1. Create Overhead Expense
                var expense = new OverheadExpense
                {
                    Id = Guid.NewGuid(),
                    Category = request.Category,
                    Amount = request.Amount,
                    Description = request.Description,
                    ExpenseDate = request.ExpenseDate,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = request.UserId
                };

                await _context.OverheadExpenses.AddAsync(expense);

                // 2. Emit SpendFact (Immediate for overhead)
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    Guid.Empty, // Generic payee for overhead
                    request.Amount,
                    "INR",
                    "Overhead",
                    SynOS.Models.Enums.PaymentMethod.Cash, // Default
                    $"Overhead-{request.Category}-{DateTime.UtcNow:yyyyMMdd}",
                    request.ExpenseDate,
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

                return CreatedAtAction(nameof(GetExpenses), new { id = expense.Id }, expense);
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
}
