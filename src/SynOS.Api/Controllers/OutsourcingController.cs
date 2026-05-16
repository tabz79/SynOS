using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Models.Enums.Payables;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Payables;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Microsoft.AspNetCore.Authorization.Authorize] // Hardened
    public class OutsourcingController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly SynOS.Services.IAuditService _auditService;
 
        public OutsourcingController(SynOSDbContext context, SynOS.Services.IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }
 
        [HttpPost("orders/{orderId}/outsource")]
        public async Task<IActionResult> OutsourceOrder(Guid orderId, [FromBody] OutsourceRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.ReferenceLabName))
            {
                return BadRequest("Reference lab name and amount are required.");
            }
 
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
                if (order == null)
                {
                    return NotFound($"Order {orderId} not found.");
                }
 
                if (order.IsOutsourced)
                {
                    return BadRequest($"Order {orderId} is already marked as outsourced.");
                }
 
                // 1. Update Order State
                order.IsOutsourced = true;
                order.ReferenceLabName = request.ReferenceLabName;
                order.OutsourcedAt = DateTime.UtcNow;
 
                // 2. Create Reference Lab Payable with Organic Pricing Resolution
                var payable = new ReferenceLabPayable
                {
                    Id = Guid.NewGuid(),
                    ReferenceLabName = request.ReferenceLabName,
                    ReferenceLabId = request.ReferenceLabId,
                    PatientId = order.VisitId, 
                    TestId = order.TestId,
                    AmountPaid = 0,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = request.UserId,
                    IsPricingResolved = false
                };

                // Resolution Logic
                if (request.ReferenceLabId.HasValue)
                {
                    var rule = await _context.Set<ReferenceLabRateRule>()
                        .FirstOrDefaultAsync(r => r.ReferenceLabId == request.ReferenceLabId.Value && r.TestId == order.TestId);
                    
                    if (rule != null)
                    {
                        payable.AmountDue = rule.Cost;
                        payable.Status = ReferencePayableStatus.Pending;
                        payable.IsPricingResolved = true;
                        order.OutsourceCost = rule.Cost; // Snapshot to order
                    }
                    else
                    {
                        payable.Status = ReferencePayableStatus.PendingPricing;
                        payable.AmountDue = request.Amount > 0 ? request.Amount : 0;
                        payable.IsPricingResolved = false;
                        order.OutsourceCost = payable.AmountDue;
                    }
                }
                else
                {
                    payable.Status = ReferencePayableStatus.PendingPricing;
                    payable.AmountDue = request.Amount > 0 ? request.Amount : 0;
                    order.OutsourceCost = payable.AmountDue;
                }

                var visit = await _context.Visits.FindAsync(order.VisitId);
                if (visit != null)
                {
                    payable.PatientId = visit.PatientId;
                }
 
                await _context.ReferenceLabPayables.AddAsync(payable);
                await _context.SaveChangesAsync();
 
                // Audit the dispatch
                await _auditService.LogAsync(request.UserId, "DispatchOutsource", "Order", order.OrderId, new { Lab = request.ReferenceLabName, Cost = request.Amount });
 
                await transaction.CommitAsync();
 
                return Ok(new { Message = "Order outsourced successfully.", PayableId = payable.Id });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
 
        [HttpGet("labs")]
        public async Task<IActionResult> GetReferenceLabs()
        {
            var labs = await _context.ReferenceLabs
                .Where(l => l.IsActive && l.Status == ReferenceLabStatus.Active)
                .OrderBy(l => l.Name)
                .ToListAsync();
            return Ok(labs);
        }
 
        [HttpPost("labs/draft")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> CreateDraftReferenceLab([FromBody] ReferenceLabDraftDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest("Lab name is required.");
            }

            if (!string.IsNullOrWhiteSpace(request.Email) && (!request.Email.Contains("@") || !request.Email.Contains(".")))
            {
                return BadRequest("A valid email address is required for partner onboarding.");
            }
 
            var lab = new ReferenceLab
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Address = request.Location, 
                Phone = request.Phone,
                Email = request.Email,
                Status = request.Status == "Active" ? ReferenceLabStatus.Active : ReferenceLabStatus.Provisional,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
 
            await _context.ReferenceLabs.AddAsync(lab);
            await _context.SaveChangesAsync();
 
            // Audit the draft creation
            Guid? actorId = null;
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedId)) actorId = parsedId;
 
            await _auditService.LogAsync(actorId, "CreateDraftLab", "ReferenceLab", lab.Id, new { Name = lab.Name, Location = lab.Address, Email = lab.Email });
 
            return Ok(lab);
        }
 
        [HttpPatch("labs/{id}/activate")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> ActivateReferenceLab(Guid id)
        {
            var lab = await _context.ReferenceLabs.FindAsync(id);
            if (lab == null)
            {
                return NotFound($"Lab {id} not found.");
            }
 
            if (lab.Status == ReferenceLabStatus.Active)
            {
                return BadRequest("Lab is already active.");
            }
 
            lab.Status = ReferenceLabStatus.Active;
            await _context.SaveChangesAsync();
 
            // Audit the activation
            Guid? actorId = null;
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedId)) actorId = parsedId;
 
            await _auditService.LogAsync(actorId, "ActivateLab", "ReferenceLab", lab.Id, new { Name = lab.Name });
 
            return Ok(new { Message = "Reference lab activated successfully.", LabId = lab.Id });
        }

        [HttpGet("labs/{id}/pending-tests")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> GetPendingTestsForLab(Guid id)
        {
            var lab = await _context.ReferenceLabs.FindAsync(id);
            if (lab == null) return NotFound();

            // Find all unique tests that have been outsourced to this lab but don't have a rule yet
            // We look at payables with PendingPricing
            var pendingTests = await (from p in _context.ReferenceLabPayables
                                     join test in _context.Tests on p.TestId equals test.TestId
                                     where p.ReferenceLabId == id && (p.Status == ReferencePayableStatus.PendingPricing || !p.IsPricingResolved)
                                     group p by new { test.TestId, test.TestName, test.TestCode } into g
                                     select new {
                                         TestId = g.Key.TestId,
                                         TestName = g.Key.TestName,
                                         TestCode = g.Key.TestCode,
                                         SuggestedPrice = g.Max(x => x.AmountDue) // Take the highest price entered at reception as suggestion
                                     }).ToListAsync();

            return Ok(pendingTests);
        }

        [HttpPost("labs/{id}/activate-with-rates")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> ActivateWithRates(Guid id, [FromBody] ActivateWithRatesDto request)
        {
            var lab = await _context.ReferenceLabs.FindAsync(id);
            if (lab == null) return NotFound();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Activate Lab
                lab.Status = ReferenceLabStatus.Active;

                // 2. Process Rates
                if (request.Rates != null)
                {
                    foreach (var rate in request.Rates)
                    {
                        // Create Rule
                        var rule = await _context.ReferenceLabRateRules
                            .FirstOrDefaultAsync(r => r.ReferenceLabId == id && r.TestId == rate.TestId);
                        
                        if (rule == null)
                        {
                            rule = new ReferenceLabRateRule
                            {
                                Id = Guid.NewGuid(),
                                ReferenceLabId = id,
                                TestId = rate.TestId,
                                Cost = rate.Cost,
                                UpdatedAt = DateTime.UtcNow,
                                UpdatedBy = request.UserId
                            };
                            await _context.ReferenceLabRateRules.AddAsync(rule);
                        }
                        else
                        {
                            rule.Cost = rate.Cost;
                            rule.UpdatedAt = DateTime.UtcNow;
                            rule.UpdatedBy = request.UserId;
                        }

                        // Resolve Payables for this test/lab
                        var payables = await _context.ReferenceLabPayables
                            .Where(p => p.ReferenceLabId == id && p.TestId == rate.TestId && p.Status == ReferencePayableStatus.PendingPricing)
                            .ToListAsync();

                        foreach (var p in payables)
                        {
                            p.AmountDue = rate.Cost;
                            p.Status = ReferencePayableStatus.Pending;
                            p.IsPricingResolved = true;

                            // Update corresponding order if possible
                            var order = await _context.Orders.FirstOrDefaultAsync(o => o.TestId == p.TestId && o.VisitId == (from v in _context.Visits where v.PatientId == p.PatientId select v.VisitId).FirstOrDefault() && o.IsOutsourced);
                            if (order != null) order.OutsourceCost = rate.Cost;
                        }
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await _auditService.LogAsync(request.UserId, "ActivateLabWithRates", "ReferenceLab", lab.Id, new { Name = lab.Name, RateCount = request.Rates?.Count ?? 0 });

                return Ok(new { Message = "Lab activated and rates established." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, ex.Message);
            }
        }
 
        [HttpPut("labs/{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> UpdateReferenceLab(Guid id, [FromBody] ReferenceLabUpdateDto request)
        {
            var lab = await _context.ReferenceLabs.FindAsync(id);
            if (lab == null)
            {
                return NotFound($"Lab {id} not found.");
            }
 
            lab.Name = request.Name ?? lab.Name;
            lab.Address = request.Location ?? lab.Address;
            lab.Phone = request.Phone ?? lab.Phone;
            lab.Email = request.Email ?? lab.Email;
            lab.Code = request.Code ?? lab.Code;
 
            await _context.SaveChangesAsync();
 
            // Audit the update
            Guid? actorId = null;
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedId)) actorId = parsedId;
 
            await _auditService.LogAsync(actorId, "UpdateLab", "ReferenceLab", lab.Id, new { Name = lab.Name });
 
            return Ok(lab);
        }
 
        [HttpGet("labs/{labId}/rates")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> GetLabRates(Guid labId)
        {
            var rules = await (from r in _context.ReferenceLabRateRules
                              join test in _context.Tests on r.TestId equals test.TestId
                              where r.ReferenceLabId == labId
                              select new {
                                  r.Id,
                                  r.TestId,
                                  TestName = test.TestName,
                                  TestCode = test.TestCode,
                                  r.Cost,
                                  r.UpdatedAt
                              }).ToListAsync();
            return Ok(rules);
        }
 
        [HttpGet("labs/audit")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> GetLabAuditLogs()
        {
            var logs = await _context.AuditLogs
                .Include(l => l.ActorUser)
                .Where(l => l.ResourceType == "ReferenceLab")
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new {
                    l.AuditId,
                    l.Action,
                    l.ResourceId,
                    l.CreatedAt,
                    ActorName = l.ActorUser != null ? l.ActorUser.Name : "System",
                    l.Payload
                })
                .Take(50)
                .ToListAsync();
            return Ok(logs);
        }
 
        [HttpDelete("labs/{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> DeleteReferenceLab(Guid id)
        {
            var lab = await _context.ReferenceLabs.FindAsync(id);
            if (lab == null) return NotFound();
 
            // Soft Delete
            lab.IsActive = false;
            await _context.SaveChangesAsync();
 
            // Audit
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            Guid? actorId = (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedId)) ? parsedId : null;
            await _auditService.LogAsync(actorId, "DeleteLab", "ReferenceLab", lab.Id, new { Name = lab.Name });
 
            return Ok(new { Message = "Lab deactivated successfully." });
        }
 
        [HttpPost("labs/{id}/rates")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SystemAdmin,FinanceManager")]
        public async Task<IActionResult> AddRateRule(Guid id, [FromBody] RateInputDto request)
        {
            var lab = await _context.ReferenceLabs.FindAsync(id);
            if (lab == null) return NotFound();
 
            var rule = await _context.ReferenceLabRateRules
                .FirstOrDefaultAsync(r => r.ReferenceLabId == id && r.TestId == request.TestId);
 
            if (rule == null)
            {
                rule = new ReferenceLabRateRule
                {
                    Id = Guid.NewGuid(),
                    ReferenceLabId = id,
                    TestId = request.TestId,
                    Cost = request.Cost,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.ReferenceLabRateRules.AddAsync(rule);
            }
            else
            {
                rule.Cost = request.Cost;
                rule.UpdatedAt = DateTime.UtcNow;
            }
 
            await _context.SaveChangesAsync();
 
            // Audit
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            Guid? actorId = (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedId)) ? parsedId : null;
            await _auditService.LogAsync(actorId, "AddRateRule", "ReferenceLab", id, new { TestId = request.TestId, Cost = request.Cost });
 
            return Ok(rule);
        }
    }

    public class ReferenceLabDraftDto
    {
        public string? Name { get; set; }
        public string? Location { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Status { get; set; }
    }

    public class OutsourceRequestDto
    {
        public string? ReferenceLabName { get; set; }
        public Guid? ReferenceLabId { get; set; }
        public decimal Amount { get; set; }
        public Guid UserId { get; set; }
    }

    public class ReferenceLabUpdateDto
    {
        public string? Name { get; set; }
        public string? Location { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Code { get; set; }
    }

    public class ActivateWithRatesDto
    {
        public Guid UserId { get; set; }
        public List<RateInputDto>? Rates { get; set; }
    }

    public class RateInputDto
    {
        public Guid TestId { get; set; }
        public decimal Cost { get; set; }
    }
}
