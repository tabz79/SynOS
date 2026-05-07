using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Enums.Payables;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class OutsourcingController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public OutsourcingController(SynOSDbContext context)
        {
            _context = context;
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
                    PatientId = order.VisitId, // Assuming VisitId maps to PatientId in this context for now, or I need to look it up.
                    TestId = order.TestId,
                    AmountDue = request.Amount,
                    AmountPaid = 0,
                    Status = ReferencePayableStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = request.UserId
                };

                // Better lookup for PatientId if possible
                var visit = await _context.Visits.FindAsync(order.VisitId);
                if (visit != null)
                {
                    payable.PatientId = visit.PatientId;
                }

                await _context.ReferenceLabPayables.AddAsync(payable);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Order outsourced successfully.", PayableId = payable.Id });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }

    public class OutsourceRequestDto
    {
        public string ReferenceLabName { get; set; }
        public Guid? ReferenceLabId { get; set; }
        public decimal Amount { get; set; }
        public Guid UserId { get; set; }
    }
}
