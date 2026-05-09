using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Services.SpendEngine;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class PayablesController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;
        private readonly SynOS.Services.EconomicsIntelligence.IEconomicsIntelligenceService _economicsService;

        public PayablesController(
            SynOSDbContext context, 
            ISpendFactWriter spendFactWriter,
            SynOS.Services.EconomicsIntelligence.IEconomicsIntelligenceService economicsService)
        {
            _context = context;
            _spendFactWriter = spendFactWriter;
            _economicsService = economicsService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<VendorPayable>>> GetPayables()
        {
            return await _context.VendorPayables
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
                var payable = await _context.VendorPayables.FindAsync(id);
                if (payable == null)
                {
                    return NotFound();
                }

                if (payable.Status == SynOS.Models.Enums.Payables.VendorPayableStatus.Settled)
                {
                    return BadRequest("Payable is already fully settled.");
                }

                // Precision-safe comparison for overpayment check
                const decimal tolerance = 0.0001m;
                if (payable.AmountPaid + request.Amount > payable.Amount + tolerance)
                {
                    return BadRequest($"Overpayment rejected. Amount due is {payable.Amount - payable.AmountPaid}, but tried to pay {request.Amount}.");
                }

                // 1. Update Payable State
                payable.AmountPaid += request.Amount;
                
                // Precision-safe completion check
                if (Math.Abs(payable.Amount - payable.AmountPaid) < tolerance || payable.AmountPaid > payable.Amount)
                {
                    payable.Status = SynOS.Models.Enums.Payables.VendorPayableStatus.Settled;
                    payable.SettledAt = DateTime.UtcNow;
                }
                else
                {
                    payable.Status = SynOS.Models.Enums.Payables.VendorPayableStatus.PartiallyPaid;
                }

                // 2. Emit SpendFact (Atomic with Payable update)
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    payable.VendorId ?? Guid.Empty,
                    request.Amount,
                    "INR", // Default
                    "Inventory",
                    payable.VendorName ?? "Unknown Vendor",
                    $"Vendor Settlement: {payable.ReferenceType} {payable.ReferenceId}",
                    null, // BranchId not in current scope
                    SynOS.Models.Enums.PaymentMethod.BankTransfer,
                    $"VENDOR-SETTLE-{payable.VendorPayableId}-{DateTime.UtcNow:yyyyMMdd}",
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    "Purchasing",
                    "Finance API",
                    Guid.Empty,
                    Guid.Empty,
                    Guid.Empty
                );

                await _spendFactWriter.CreateSpendFactAsync(spendFact);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Payable settled successfully.", Status = payable.Status.ToString(), AmountRemaining = payable.Amount - payable.AmountPaid });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("summary")]
        public async Task<ActionResult<IEnumerable<SynOS.Models.DTOs.Economics.VendorPayableSummaryDto>>> GetSummary()
        {
            var summary = await _economicsService.GetVendorPayablesSummaryAsync();
            return Ok(summary);
        }

        [HttpPost("bulk-settle")]
        public async Task<IActionResult> BulkSettle([FromBody] BulkVendorSettleRequest request)
        {
            if (request == null || request.Amount <= 0) return BadRequest("Invalid amount.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payables = await _context.VendorPayables
                    .Where(p => p.VendorId == request.VendorId && p.Status != SynOS.Models.Enums.Payables.VendorPayableStatus.Settled)
                    .OrderBy(p => p.CreatedAt)
                    .ToListAsync();

                if (!payables.Any()) return BadRequest("No pending bills for this vendor.");

                var vendorName = payables.First().VendorName;
                var remaining = request.Amount;
                var settledBillsCount = 0;

                foreach (var p in payables)
                {
                    if (remaining <= 0) break;

                    var due = p.Amount - p.AmountPaid;
                    var apply = Math.Min(remaining, due);

                    p.AmountPaid += apply;
                    remaining -= apply;

                    if (Math.Abs(p.Amount - p.AmountPaid) < 0.0001m)
                    {
                        p.Status = SynOS.Models.Enums.Payables.VendorPayableStatus.Settled;
                        p.SettledAt = DateTime.UtcNow;
                    }
                    else
                    {
                        p.Status = SynOS.Models.Enums.Payables.VendorPayableStatus.PartiallyPaid;
                    }

                    _context.VendorPayables.Update(p);
                    settledBillsCount++;
                }

                // Emit SpendFact
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    request.VendorId,
                    request.Amount,
                    "INR",
                    "Inventory",
                    vendorName ?? "Unknown Vendor",
                    $"Bulk settlement for {settledBillsCount} bills.",
                    null,
                    request.PaymentMethod,
                    $"BULK-VENDOR-{request.VendorId.ToString().Substring(0, 8)}",
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    "Purchasing",
                    "Finance API",
                    Guid.Empty,
                    Guid.Empty,
                    Guid.Empty
                );

                await _spendFactWriter.CreateSpendFactAsync(spendFact);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Bulk settlement processed.", AmountApplied = request.Amount - remaining });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, ex.Message);
            }
        }
    }

    public class BulkVendorSettleRequest
    {
        public Guid VendorId { get; set; }
        public decimal Amount { get; set; }
        public SynOS.Models.Enums.PaymentMethod PaymentMethod { get; set; }
    }
}
