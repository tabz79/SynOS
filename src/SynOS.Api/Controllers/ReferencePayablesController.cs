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
using SynOS.Models.DTOs.Economics;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
    public class ReferencePayablesController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;
        private readonly SynOS.Services.IAuditService _auditService;

        public ReferencePayablesController(SynOSDbContext context, ISpendFactWriter spendFactWriter, SynOS.Services.IAuditService auditService)
        {
            _context = context;
            _spendFactWriter = spendFactWriter;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReferenceLabPayableDto>>> GetPayables()
        {
            var query = from p in _context.ReferenceLabPayables
                        join test in _context.Tests on p.TestId equals test.TestId
                        join patient in _context.Patients on p.PatientId equals patient.PatientId
                        orderby p.CreatedAt descending
                        select new ReferenceLabPayableDto
                        {
                            Id = p.Id,
                            ReferenceLabName = p.ReferenceLabName,
                            ReferenceLabId = p.ReferenceLabId,
                            PatientId = p.PatientId,
                            PatientName = patient.FirstName + " " + patient.LastName,
                            TestId = p.TestId,
                            TestName = test.TestName,
                            AmountDue = p.AmountDue,
                            AmountPaid = p.AmountPaid,
                            Status = (!p.IsPricingResolved && p.Status == ReferencePayableStatus.Pending) ? "PendingPricing" : p.Status.ToString(),
                            CreatedAt = p.CreatedAt,
                            SettledAt = p.SettledAt
                        };

            return await query.ToListAsync();
        }

        [HttpGet("labs")]
        public async Task<ActionResult<IEnumerable<ReferenceLab>>> GetReferenceLabs()
        {
            return await _context.ReferenceLabs
                .Where(l => l.IsActive)
                .OrderBy(l => l.Name)
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

                // Audit the settlement
                Guid? actorId = null;
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedId)) actorId = parsedId;

                await _auditService.LogAsync(actorId, "SettleLabPayable", "ReferenceLabPayable", payable.Id, new { Lab = payable.ReferenceLabName, Amount = request.Amount });

                return Ok(new { Message = "Payable settled successfully.", Status = payable.Status.ToString(), AmountRemaining = payable.AmountDue - payable.AmountPaid });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("pending-pricing")]
        public async Task<ActionResult<IEnumerable<ReferenceLabPayableDto>>> GetPendingPricingPayables()
        {
            var query = from p in _context.ReferenceLabPayables
                        join test in _context.Tests on p.TestId equals test.TestId
                        join patient in _context.Patients on p.PatientId equals patient.PatientId
                        where p.Status == ReferencePayableStatus.PendingPricing || !p.IsPricingResolved
                        orderby p.CreatedAt descending
                        select new ReferenceLabPayableDto
                        {
                            Id = p.Id,
                            ReferenceLabName = p.ReferenceLabName,
                            ReferenceLabId = p.ReferenceLabId,
                            PatientId = p.PatientId,
                            PatientName = patient.FirstName + " " + patient.LastName,
                            TestId = p.TestId,
                            TestName = test.TestName,
                            AmountDue = p.AmountDue,
                            AmountPaid = p.AmountPaid,
                            Status = p.Status.ToString(),
                            CreatedAt = p.CreatedAt,
                            SettledAt = p.SettledAt
                        };

            return await query.ToListAsync();
        }

        [HttpPost("resolve-pricing")]
        public async Task<IActionResult> ResolvePricing([FromBody] ResolvePricingRequestDto request)
        {
            if (request == null || request.PayableId == Guid.Empty || request.Cost <= 0)
            {
                return BadRequest("Valid PayableId and Cost are required.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payable = await _context.ReferenceLabPayables.FindAsync(request.PayableId);
                if (payable == null)
                {
                    return NotFound("Payable not found.");
                }

                // 1. Update the specific payable
                payable.AmountDue = request.Cost;
                payable.Status = ReferencePayableStatus.Pending;
                payable.IsPricingResolved = true;

                // 2. Update the Order snapshot
                var order = await _context.Orders.FirstOrDefaultAsync(o => o.TestId == payable.TestId && o.VisitId == (from v in _context.Visits where v.PatientId == payable.PatientId select v.VisitId).FirstOrDefault() && o.IsOutsourced);
                if (order != null)
                {
                    order.OutsourceCost = request.Cost;
                }

                // 3. Organic Discovery: Create or Update the Rule
                if (payable.ReferenceLabId.HasValue)
                {
                    var rule = await _context.ReferenceLabRateRules
                        .FirstOrDefaultAsync(r => r.ReferenceLabId == payable.ReferenceLabId.Value && r.TestId == payable.TestId);
                    
                    if (rule == null)
                    {
                        rule = new ReferenceLabRateRule
                        {
                            Id = Guid.NewGuid(),
                            ReferenceLabId = payable.ReferenceLabId.Value,
                            TestId = payable.TestId,
                            Cost = request.Cost,
                            UpdatedAt = DateTime.UtcNow,
                            UpdatedBy = request.UserId
                        };
                        await _context.ReferenceLabRateRules.AddAsync(rule);
                    }
                    else
                    {
                        rule.Cost = request.Cost;
                        rule.UpdatedAt = DateTime.UtcNow;
                        rule.UpdatedBy = request.UserId;
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Audit the resolution
                await _auditService.LogAsync(request.UserId, "ResolvePricing", "ReferenceLabPayable", payable.Id, new { Lab = payable.ReferenceLabName, Cost = request.Cost });

                return Ok(new { Message = "Pricing resolved successfully and rule created/updated." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("rules")]
        public async Task<IActionResult> GetRateRules()
        {
            var rules = await (from r in _context.ReferenceLabRateRules
                              join lab in _context.ReferenceLabs on r.ReferenceLabId equals lab.Id
                              join test in _context.Tests on r.TestId equals test.TestId
                              select new {
                                  r.Id,
                                  r.ReferenceLabId,
                                  LabName = lab.Name,
                                  r.TestId,
                                  TestName = test.TestName,
                                  TestCode = test.TestCode,
                                  r.Cost,
                                  r.UpdatedAt
                              }).ToListAsync();
            return Ok(rules);
        }
    }

    public class ResolvePricingRequestDto
    {
        public Guid PayableId { get; set; }
        public decimal Cost { get; set; }
        public Guid UserId { get; set; }
    }

    public class ReferenceLabPayableDto
    {
        public Guid Id { get; set; }
        public string ReferenceLabName { get; set; }
        public Guid? ReferenceLabId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public Guid TestId { get; set; }
        public string TestName { get; set; }
        public decimal AmountDue { get; set; }
        public decimal AmountPaid { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SettledAt { get; set; }
    }

    public class SettleRequestDto
    {
        public decimal Amount { get; set; }
        public Guid UserId { get; set; }
    }
}
