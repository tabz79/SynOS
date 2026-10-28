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
using SynOS.Services.Security;
using SynOS.Services.Time;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class OverheadExpensesController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;
        private readonly IUserContext _userContext;
        private readonly ILabTimeProvider _labTimeProvider;

        public OverheadExpensesController(
            SynOSDbContext context, 
            ISpendFactWriter spendFactWriter, 
            IUserContext userContext,
            ILabTimeProvider labTimeProvider)
        {
            _context = context;
            _spendFactWriter = spendFactWriter;
            _userContext = userContext;
            _labTimeProvider = labTimeProvider;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OverheadPayableFact>>> GetExpenses([FromQuery] string? filter = null)
        {
            var query = _context.OverheadPayableFacts.AsQueryable();

            if (string.Equals(filter, "today", StringComparison.OrdinalIgnoreCase))
            {
                var labToday = _labTimeProvider.GetLabToday();
                var tz = _labTimeProvider.GetLabTimeZone();
                var startUtc = TimeZoneInfo.ConvertTimeToUtc(labToday.Date, tz);
                var endUtc = startUtc.AddDays(1);
                query = query.Where(e => (e.CreatedAt >= startUtc && e.CreatedAt < endUtc) || (e.DueDate >= startUtc && e.DueDate < endUtc));
            }

            return await query
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OverheadPayableFact>> GetExpenseById(Guid id)
        {
            var expense = await _context.OverheadPayableFacts.FindAsync(id);
            if (expense == null) return NotFound();
            return Ok(expense);
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
                var userId = request.UserId != Guid.Empty ? request.UserId : (_userContext.CurrentUserId != Guid.Empty ? _userContext.CurrentUserId : Guid.Empty);
                var payable = new OverheadPayableFact
                {
                    OverheadPayableId = Guid.NewGuid(),
                    Category = request.Category,
                    AmountDue = request.Amount,
                    Description = request.Description,
                    DueDate = request.ExpenseDate != default ? request.ExpenseDate : DateTime.UtcNow,
                    Status = VendorPayableStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = userId
                };

                await _context.OverheadPayableFacts.AddAsync(payable);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetExpenseById), new { id = payable.OverheadPayableId }, payable);
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

                var effectiveBranchId = _userContext.CurrentBranchId != Guid.Empty
                    ? _userContext.CurrentBranchId
                    : (Guid?)null;

                // Emit SpendFact (Money Moved)
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    Guid.Empty,
                    settleAmount,
                    "INR",
                    "Overhead",
                    payable.Description ?? "Overhead Expense", // PayeeName
                    $"Category: {payable.Category}", // Notes
                    effectiveBranchId, // BranchId
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

        [HttpGet("reception-feed")]
        public async Task<IActionResult> GetReceptionFeed([FromQuery] string? filter = "today", [FromQuery] Guid? userId = null)
        {
            try
            {
                var labToday = _labTimeProvider.GetLabToday();
                var tz = _labTimeProvider.GetLabTimeZone();
                DateTime startUtc;
                DateTime endUtc;

                if (string.Equals(filter, "7d", StringComparison.OrdinalIgnoreCase))
                {
                    startUtc = TimeZoneInfo.ConvertTimeToUtc(labToday.Date.AddDays(-6), tz);
                    endUtc = TimeZoneInfo.ConvertTimeToUtc(labToday.Date.AddDays(1), tz);
                }
                else
                {
                    startUtc = TimeZoneInfo.ConvertTimeToUtc(labToday.Date, tz);
                    endUtc = TimeZoneInfo.ConvertTimeToUtc(labToday.Date.AddDays(1), tz);
                }

                var query = _context.OverheadPayableFacts.AsQueryable();

                if (userId.HasValue && userId.Value != Guid.Empty)
                {
                    query = query.Where(e => e.CreatedBy == userId.Value);
                }

                var payables = await query
                    .Where(e => e.CreatedAt >= startUtc && e.CreatedAt < endUtc)
                    .OrderByDescending(e => e.CreatedAt)
                    .ToListAsync();

                // Compute metrics
                var activeItems = payables.Where(p => p.Status != VendorPayableStatus.Cancelled).ToList();
                var netOutflow = activeItems.Sum(p => p.AmountPaid);

                // Fetch spend facts for these payables to accurately identify Cash vs UPI/Bank
                var payablePrefixes = payables.Select(p => $"OHP-{p.OverheadPayableId.ToString().Substring(0, 8)}").ToList();
                var spendFacts = await _context.SpendFacts
                    .Where(s => payablePrefixes.Contains(s.TransactionReference))
                    .ToListAsync();

                decimal cashOutflow = 0;
                decimal digitalOutflow = 0;

                foreach (var item in activeItems)
                {
                    var prefix = $"OHP-{item.OverheadPayableId.ToString().Substring(0, 8)}";
                    var sf = spendFacts.FirstOrDefault(s => s.TransactionReference == prefix);
                    if (sf != null && sf.PaymentMethod == SynOS.Models.Enums.PaymentMethod.Cash)
                    {
                        cashOutflow += item.AmountPaid;
                    }
                    else if (sf != null)
                    {
                        digitalOutflow += item.AmountPaid;
                    }
                    else
                    {
                        cashOutflow += item.AmountPaid;
                    }
                }

                var pendingDues = activeItems.Where(p => p.Status != VendorPayableStatus.Settled).Sum(p => p.AmountDue - p.AmountPaid);
                var totalCount = activeItems.Count;

                // Category breakdown
                var categorySummary = activeItems
                    .GroupBy(p => p.Category.ToString())
                    .Select(g => new {
                        category = g.Key,
                        amount = g.Sum(x => x.AmountPaid > 0 ? x.AmountPaid : x.AmountDue),
                        count = g.Count()
                    })
                    .ToList();

                // 7-day daily breakdown if requested
                var dailyHistory = new List<object>();
                for (int i = 6; i >= 0; i--)
                {
                    var dayDate = labToday.Date.AddDays(-i);
                    var dayStart = TimeZoneInfo.ConvertTimeToUtc(dayDate, tz);
                    var dayEnd = dayStart.AddDays(1);
                    var dayItems = activeItems.Where(p => p.CreatedAt >= dayStart && p.CreatedAt < dayEnd).ToList();
                    dailyHistory.Add(new
                    {
                        date = dayDate.ToString("yyyy-MM-dd"),
                        dayLabel = dayDate.ToString("ddd, dd MMM"),
                        outflow = dayItems.Sum(x => x.AmountPaid),
                        count = dayItems.Count
                    });
                }

                var items = payables.Select(p => {
                    var prefix = $"OHP-{p.OverheadPayableId.ToString().Substring(0, 8)}";
                    var sf = spendFacts.FirstOrDefault(s => s.TransactionReference == prefix);
                    return new {
                        id = p.OverheadPayableId,
                        category = p.Category.ToString(),
                        description = p.Description,
                        amountDue = p.AmountDue,
                        amountPaid = p.AmountPaid,
                        status = p.Status.ToString(),
                        paymentMethod = sf != null ? sf.PaymentMethod.ToString() : "Cash",
                        dueDate = p.DueDate,
                        createdAt = p.CreatedAt,
                        createdBy = p.CreatedBy
                    };
                });

                return Ok(new
                {
                    metrics = new
                    {
                        netOutflow,
                        cashOutflow,
                        digitalOutflow,
                        pendingDues,
                        totalCount,
                        categories = categorySummary,
                        dailyHistory
                    },
                    items
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/correct")]
        public async Task<IActionResult> CorrectExpense(Guid id, [FromBody] CorrectExpenseDto request)
        {
            if (request == null || request.NewAmount <= 0)
                return BadRequest("A valid new amount is required.");

            if (string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest("A valid correction reason is required.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payable = await _context.OverheadPayableFacts.FindAsync(id);
                if (payable == null) return NotFound("Expense record not found.");

                var prevAmount = payable.AmountDue;
                var prevCategory = payable.Category.ToString();
                var prevDesc = payable.Description;

                var prefix = $"OHP-{payable.OverheadPayableId.ToString().Substring(0, 8)}";
                var spendFact = await _context.SpendFacts
                    .OrderByDescending(s => s.OccurredAt)
                    .FirstOrDefaultAsync(s => s.TransactionReference == prefix);

                var prevPaymentMethod = spendFact != null ? spendFact.PaymentMethod.ToString() : "Cash";

                // Update category if provided
                if (!string.IsNullOrEmpty(request.NewCategory) && Enum.TryParse<OverheadExpenseCategory>(request.NewCategory, true, out var parsedCategory))
                {
                    payable.Category = parsedCategory;
                }

                if (!string.IsNullOrWhiteSpace(request.NewDescription))
                {
                    payable.Description = request.NewDescription;
                }

                var diff = request.NewAmount - prevAmount;
                payable.AmountDue = request.NewAmount;

                if (payable.Status == VendorPayableStatus.Settled)
                {
                    payable.AmountPaid = request.NewAmount;

                    if (diff != 0)
                    {
                        var paymentMethod = spendFact?.PaymentMethod ?? SynOS.Models.Enums.PaymentMethod.Cash;
                        if (!string.IsNullOrEmpty(request.NewPaymentMethod) && Enum.TryParse<SynOS.Models.Enums.PaymentMethod>(request.NewPaymentMethod, true, out var parsedPm))
                        {
                            paymentMethod = parsedPm;
                        }

                        var adjSpendFact = new SpendFact(
                            Guid.NewGuid(),
                            Guid.Empty,
                            diff,
                            "INR",
                            "Overhead",
                            payable.Description ?? "Expense Correction",
                            $"Correction Diff [{diff:+0.00;-0.00}]: {request.Reason}",
                            _userContext.CurrentBranchId != Guid.Empty ? _userContext.CurrentBranchId : null,
                            paymentMethod,
                            $"OHP-ADJ-{payable.OverheadPayableId.ToString().Substring(0, 8)}-{DateTime.UtcNow.Ticks}",
                            DateTime.UtcNow,
                            DateTime.UtcNow,
                            "Main Account",
                            "Finance API",
                            Guid.Empty,
                            Guid.Empty,
                            Guid.Empty
                        );

                        await _spendFactWriter.CreateSpendFactAsync(adjSpendFact);
                    }
                }

                var userId = request.UserId.HasValue && request.UserId.Value != Guid.Empty 
                    ? request.UserId.Value 
                    : (_userContext.CurrentUserId != Guid.Empty ? _userContext.CurrentUserId : Guid.Empty);

                var auditDiff = new
                {
                    previousAmount = prevAmount,
                    newAmount = request.NewAmount,
                    difference = diff,
                    previousCategory = prevCategory,
                    newCategory = request.NewCategory ?? prevCategory,
                    previousDescription = prevDesc,
                    newDescription = request.NewDescription ?? prevDesc,
                    previousPaymentMethod = prevPaymentMethod,
                    newPaymentMethod = request.NewPaymentMethod ?? prevPaymentMethod
                };

                var audit = new ExpenseCorrectionAudit
                {
                    Id = Guid.NewGuid(),
                    ExpenseId = payable.OverheadPayableId,
                    ExpenseType = "DailyExpense",
                    PreviousAmount = prevAmount,
                    NewAmount = request.NewAmount,
                    PreviousCategory = prevCategory,
                    NewCategory = request.NewCategory ?? prevCategory,
                    PreviousPaymentMethod = prevPaymentMethod,
                    NewPaymentMethod = request.NewPaymentMethod ?? prevPaymentMethod,
                    Reason = request.Reason,
                    Notes = request.Notes ?? "",
                    AuditDiffJson = System.Text.Json.JsonSerializer.Serialize(auditDiff),
                    CorrectedByUserId = userId,
                    CorrectedByName = !string.IsNullOrWhiteSpace(request.UserName) ? request.UserName : "Reception Staff",
                    CorrectedAt = DateTime.UtcNow
                };

                await _context.ExpenseCorrectionAudits.AddAsync(audit);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { payable, audit });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelExpense(Guid id, [FromBody] CancelExpenseDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest("A valid cancellation reason is required.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payable = await _context.OverheadPayableFacts.FindAsync(id);
                if (payable == null) return NotFound("Expense record not found.");

                if (payable.Status == VendorPayableStatus.Cancelled)
                    return BadRequest("Expense is already cancelled.");

                var cancelledAmount = payable.AmountPaid > 0 ? payable.AmountPaid : payable.AmountDue;

                var prefix = $"OHP-{payable.OverheadPayableId.ToString().Substring(0, 8)}";
                var spendFact = await _context.SpendFacts
                    .OrderByDescending(s => s.OccurredAt)
                    .FirstOrDefaultAsync(s => s.TransactionReference == prefix);

                var paymentMethod = spendFact != null ? spendFact.PaymentMethod : SynOS.Models.Enums.PaymentMethod.Cash;

                // If money was disbursed, emit a reversal SpendFact
                if (payable.AmountPaid > 0)
                {
                    var revSpendFact = new SpendFact(
                        Guid.NewGuid(),
                        Guid.Empty,
                        -payable.AmountPaid,
                        "INR",
                        "Overhead",
                        $"Cancelled: {payable.Description}",
                        $"Cancellation Reversal: {request.Reason}",
                        _userContext.CurrentBranchId != Guid.Empty ? _userContext.CurrentBranchId : null,
                        paymentMethod,
                        $"OHP-CAN-{payable.OverheadPayableId.ToString().Substring(0, 8)}-{DateTime.UtcNow.Ticks}",
                        DateTime.UtcNow,
                        DateTime.UtcNow,
                        "Main Account",
                        "Finance API",
                        Guid.Empty,
                        Guid.Empty,
                        Guid.Empty
                    );

                    await _spendFactWriter.CreateSpendFactAsync(revSpendFact);
                }

                payable.Status = VendorPayableStatus.Cancelled;
                payable.AmountPaid = 0;

                var userId = request.UserId.HasValue && request.UserId.Value != Guid.Empty 
                    ? request.UserId.Value 
                    : (_userContext.CurrentUserId != Guid.Empty ? _userContext.CurrentUserId : Guid.Empty);

                var audit = new ExpenseCancellationAudit
                {
                    Id = Guid.NewGuid(),
                    ExpenseId = payable.OverheadPayableId,
                    ExpenseType = "DailyExpense",
                    CancelledAmount = cancelledAmount,
                    Category = payable.Category.ToString(),
                    PaymentMethod = paymentMethod.ToString(),
                    Description = payable.Description,
                    Reason = request.Reason,
                    Notes = request.Notes ?? "",
                    IsDrawerRefunded = request.RefundToDrawer,
                    CancelledByUserId = userId,
                    CancelledByName = !string.IsNullOrWhiteSpace(request.UserName) ? request.UserName : "Reception Staff",
                    CancelledAt = DateTime.UtcNow
                };

                await _context.ExpenseCancellationAudits.AddAsync(audit);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Expense cancelled successfully", audit });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("corrections")]
        public async Task<IActionResult> GetExpenseCorrections(
            [FromQuery] string? query = null, 
            [FromQuery] DateTime? startDate = null, 
            [FromQuery] DateTime? endDate = null)
        {
            var q = _context.ExpenseCorrectionAudits.AsQueryable();

            if (startDate.HasValue)
                q = q.Where(c => c.CorrectedAt >= startDate.Value);

            if (endDate.HasValue)
                q = q.Where(c => c.CorrectedAt <= endDate.Value);

            var list = await q.OrderByDescending(c => c.CorrectedAt).Take(500).ToListAsync();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var lower = query.Trim().ToLower();
                list = list.Where(c => 
                    (c.Reason?.ToLower().Contains(lower) ?? false) ||
                    (c.Notes?.ToLower().Contains(lower) ?? false) ||
                    (c.PreviousCategory?.ToLower().Contains(lower) ?? false) ||
                    (c.NewCategory?.ToLower().Contains(lower) ?? false) ||
                    (c.CorrectedByName?.ToLower().Contains(lower) ?? false)
                ).ToList();
            }

            return Ok(list);
        }

        [HttpGet("cancellations")]
        public async Task<IActionResult> GetExpenseCancellations(
            [FromQuery] string? query = null, 
            [FromQuery] DateTime? startDate = null, 
            [FromQuery] DateTime? endDate = null)
        {
            var q = _context.ExpenseCancellationAudits.AsQueryable();

            if (startDate.HasValue)
                q = q.Where(c => c.CancelledAt >= startDate.Value);

            if (endDate.HasValue)
                q = q.Where(c => c.CancelledAt <= endDate.Value);

            var list = await q.OrderByDescending(c => c.CancelledAt).Take(500).ToListAsync();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var lower = query.Trim().ToLower();
                list = list.Where(c => 
                    (c.Reason?.ToLower().Contains(lower) ?? false) ||
                    (c.Notes?.ToLower().Contains(lower) ?? false) ||
                    (c.Category?.ToLower().Contains(lower) ?? false) ||
                    (c.Description?.ToLower().Contains(lower) ?? false) ||
                    (c.CancelledByName?.ToLower().Contains(lower) ?? false)
                ).ToList();
            }

            return Ok(list);
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

    public class CorrectExpenseDto
    {
        public decimal NewAmount { get; set; }
        public string? NewCategory { get; set; }
        public string? NewPaymentMethod { get; set; }
        public string? NewDescription { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public Guid? UserId { get; set; }
        public string? UserName { get; set; }
    }

    public class CancelExpenseDto
    {
        public string Reason { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public bool RefundToDrawer { get; set; } = true;
        public Guid? UserId { get; set; }
        public string? UserName { get; set; }
    }
}
