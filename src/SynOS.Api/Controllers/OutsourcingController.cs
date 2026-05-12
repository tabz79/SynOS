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
 
                // 2. Create Reference Lab Payable
                var payable = new ReferenceLabPayable
                {
                    Id = Guid.NewGuid(),
                    ReferenceLabName = request.ReferenceLabName,
                    ReferenceLabId = request.ReferenceLabId,
                    PatientId = order.VisitId, 
                    TestId = order.TestId,
                    AmountDue = request.Amount,
                    AmountPaid = 0,
                    Status = ReferencePayableStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = request.UserId
                };
 
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
                Status = ReferenceLabStatus.Provisional,
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
            // We can get the actor from User.Identity if available
            Guid? actorId = null;
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedId)) actorId = parsedId;
 
            await _auditService.LogAsync(actorId, "ActivateLab", "ReferenceLab", lab.Id, new { Name = lab.Name });
 
            return Ok(new { Message = "Reference lab activated successfully.", LabId = lab.Id });
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
}
