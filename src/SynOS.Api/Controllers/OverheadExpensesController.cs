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

        [HttpGet("templates")]
        public async Task<ActionResult<IEnumerable<OverheadExpense>>> GetTemplates()
        {
            return await _context.OverheadExpenses
                .OrderBy(e => e.Category)
                .ToListAsync();
        }

        [HttpPost("templates")]
        public async Task<IActionResult> CreateTemplate([FromBody] OverheadExpenseRequestDto request)
        {
            if (request == null || request.Amount <= 0)
            {
                return BadRequest("Valid amount is required.");
            }

            var template = new OverheadExpense
            {
                Id = Guid.NewGuid(),
                Category = request.Category,
                Amount = request.Amount,
                Description = request.Description,
                ExpenseDate = request.ExpenseDate,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = request.UserId
            };

            await _context.OverheadExpenses.AddAsync(template);
            await _context.SaveChangesAsync();

            return Ok(template);
        }

        [HttpDelete("templates/{id}")]
        public async Task<IActionResult> DeleteTemplate(Guid id)
        {
            var template = await _context.OverheadExpenses.FindAsync(id);
            if (template == null) return NotFound("Template not found.");

            _context.OverheadExpenses.Remove(template);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("templates/{id}")]
        public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] OverheadExpenseRequestDto request)
        {
            if (request == null || request.Amount <= 0)
            {
                return BadRequest("Valid amount is required.");
            }

            var template = await _context.OverheadExpenses.FindAsync(id);
            if (template == null) return NotFound("Template not found.");

            template.Category = request.Category;
            template.Amount = request.Amount;
            template.Description = request.Description;
            template.ExpenseDate = request.ExpenseDate;

            await _context.SaveChangesAsync();

            return Ok(template);
        }

        [HttpPost("initialize")]
        public async Task<IActionResult> InitializeMonth([FromQuery] string month, [FromQuery] Guid userId)
        {
            if (string.IsNullOrEmpty(month)) return BadRequest("Month is required.");
            
            try
            {
                var parts = month.Split('-');
                if (parts.Length < 2) return BadRequest("Invalid month format. Expected YYYY-MM.");
                
                var year = int.Parse(parts[0]);
                var monthNum = int.Parse(parts[1]);
                var start = new DateTime(year, monthNum, 1, 0, 0, 0, DateTimeKind.Utc);

                // 1. Seed default templates into OverheadExpenses if it is empty
                if (!await _context.OverheadExpenses.AnyAsync())
                {
                    var defaults = new List<OverheadExpense>
                    {
                        new() {
                            Id = Guid.NewGuid(),
                            Category = OverheadExpenseCategory.Rent,
                            Amount = 55000m,
                            Description = "Monthly Facility Rent / Lease [Cycle: Monthly]",
                            ExpenseDate = start.AddDays(4), // default 5th
                            CreatedBy = userId
                        },
                        new() {
                            Id = Guid.NewGuid(),
                            Category = OverheadExpenseCategory.Power,
                            Amount = 18500m,
                            Description = "Main Lab Electricity Grid Invoice [Cycle: Monthly]",
                            ExpenseDate = start.AddDays(9), // default 10th
                            CreatedBy = userId
                        },
                        new() {
                            Id = Guid.NewGuid(),
                            Category = OverheadExpenseCategory.Internet,
                            Amount = 15000m,
                            Description = "Broadband Fiber Annual Internet [Cycle: Annual]",
                            ExpenseDate = start.AddDays(17), // May 18th (default start)
                            CreatedBy = userId
                        },
                        new() {
                            Id = Guid.NewGuid(),
                            Category = OverheadExpenseCategory.IT,
                            Amount = 10000m,
                            Description = "Laboratory LIS SaaS License & AMC [Cycle: Monthly]",
                            ExpenseDate = start.AddDays(14), // default 15th
                            CreatedBy = userId
                        },
                        new() {
                            Id = Guid.NewGuid(),
                            Category = OverheadExpenseCategory.Misc,
                            Amount = 4500m,
                            Description = "Bio-medical Waste Safe Disposal Contract [Cycle: Monthly]",
                            CreatedBy = userId,
                            ExpenseDate = start.AddDays(24) // default 25th
                        }
                    };

                    await _context.OverheadExpenses.AddRangeAsync(defaults);
                    await _context.SaveChangesAsync();
                }

                // 2. Query all configured templates
                var templates = await _context.OverheadExpenses.ToListAsync();
                var newPayables = new List<OverheadPayableFact>();

                foreach (var template in templates)
                {
                    var desc = template.Description ?? "";
                    bool shouldGenerate = false;

                    // Calculate total months difference from template start date to target active period
                    int monthsDiff = ((year - template.ExpenseDate.Year) * 12) + monthNum - template.ExpenseDate.Month;

                    if (monthsDiff >= 0)
                    {
                        if (desc.Contains("[Cycle: Annual]") || desc.Contains("[Cycle: 1 Year]"))
                        {
                            shouldGenerate = monthsDiff % 12 == 0;
                        }
                        else if (desc.Contains("[Cycle: Quarterly]"))
                        {
                            shouldGenerate = monthsDiff % 3 == 0;
                        }
                        else if (desc.Contains("[Cycle: 6 Months]"))
                        {
                            shouldGenerate = monthsDiff % 6 == 0;
                        }
                        else if (desc.Contains("[Cycle: One-Time]"))
                        {
                            shouldGenerate = monthsDiff == 0;
                        }
                        else
                        {
                            // Monthly (default)
                            shouldGenerate = true;
                        }
                    }

                    if (!shouldGenerate) continue;

                    // Check duplicate for this specific template in the selected month
                    var alreadyExists = await _context.OverheadPayableFacts
                        .AnyAsync(e => e.DueDate.Year == year && e.DueDate.Month == monthNum && e.Category == template.Category && e.Description == template.Description);

                    if (alreadyExists) continue;

                    // Calculate due date based on day of month from the template
                    int dueDay = template.ExpenseDate.Day;
                    if (dueDay < 1 || dueDay > 28) dueDay = 5;

                    var dueDate = new DateTime(year, monthNum, dueDay, 0, 0, 0, DateTimeKind.Utc);

                    var payable = new OverheadPayableFact
                    {
                        OverheadPayableId = Guid.NewGuid(),
                        Category = template.Category,
                        AmountDue = template.Amount,
                        Description = template.Description,
                        DueDate = dueDate,
                        Status = VendorPayableStatus.Pending,
                        CreatedAt = DateTime.UtcNow,
                        CreatedBy = userId
                    };

                    newPayables.Add(payable);
                }

                if (newPayables.Count > 0)
                {
                    await _context.OverheadPayableFacts.AddRangeAsync(newPayables);
                    await _context.SaveChangesAsync();
                }

                return Ok(newPayables);
            }
            catch (Exception ex)
            {
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
