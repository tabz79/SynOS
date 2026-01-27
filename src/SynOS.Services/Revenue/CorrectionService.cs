using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.Enums;
using SynOS.Services.Operational;
using SynOS.Services.Security; // For roles if needed
using SynOS.Models.Entities; // For Order

namespace SynOS.Services.Revenue
{
    public class CorrectionService : ICorrectionService
    {
        private readonly SynOSDbContext _context;
        private readonly IRevenueEngine _revenueEngine; // REPLACED IVisitService
        private readonly IOperationalEventWriter _eventWriter;
        private readonly ILogger<CorrectionService> _logger;
        private readonly IUserContext _userContext;

        public CorrectionService(
            SynOSDbContext context,
            IRevenueEngine revenueEngine, // REPLACED
            IOperationalEventWriter eventWriter,
            ILogger<CorrectionService> logger,
            IUserContext userContext)
        {
            _context = context;
            _revenueEngine = revenueEngine;
            _eventWriter = eventWriter;
            _logger = logger;
            _userContext = userContext;
        }

        public async Task ApplyCorrectionAsync(Guid visitId, ApplyCorrectionCommand command, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Invoices).ThenInclude(i => i.PartialPayments)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            
            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) throw new InvalidOperationException("No invoice found to correct.");

            decimal totalPaid = invoice.Payments.Sum(p => p.Amount) + invoice.PartialPayments.Sum(p => p.Amount);
            if (totalPaid > 0)
            {
                var role = _userContext.CurrentRole;
                if (role != "Admin" && role != "LabOwner") throw new UnauthorizedAccessException("Post-payment corrections require Admin or LabOwner role.");
                if (string.IsNullOrWhiteSpace(command.Reason)) throw new ArgumentException("Reason is mandatory for post-payment corrections.");
            }

            // Variables for CorrectionFact (Audit Only)
            decimal previousAmount = 0;
            decimal newAmount = 0;

            switch (command.Type)
            {
                case CorrectionType.AddTest:
                    if (string.IsNullOrEmpty(command.PayloadJson)) throw new ArgumentException("TestCode required in PayloadJson");
                    var testCode = command.PayloadJson;
                    var test = await _context.Tests.FirstOrDefaultAsync(t => t.TestCode == testCode);
                    if (test == null) throw new KeyNotFoundException($"Test {testCode} not found");

                    var newOrder = new Order
                    {
                        OrderId = Guid.NewGuid(),
                        VisitId = visit.VisitId,
                        TestId = test.TestId,
                        TestCode = test.TestCode,
                        Department = test.Department,
                        Status = SynOS.Models.Enums.OrderStatus.Pending,
                        Price = test.BasePrice,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Orders.Add(newOrder);
                    
                    previousAmount = 0;
                    newAmount = test.BasePrice;
                    command.TargetEntityId = newOrder.OrderId;
                    break;

                case CorrectionType.RemoveTest:
                    if (!command.TargetEntityId.HasValue) throw new ArgumentException("TargetEntityId (OrderId) required");
                    var orderToRemove = await _context.Orders.FindAsync(command.TargetEntityId.Value);
                    if (orderToRemove == null) throw new KeyNotFoundException("Order not found");
                    
                    // FIX C: Strengthen Order cancellation semantics
                    orderToRemove.Status = SynOS.Models.Enums.OrderStatus.Cancelled;
                    orderToRemove.CancellationReason = OrderCancellationReason.ReceptionCorrection;
                    orderToRemove.CancelledAt = DateTime.UtcNow;
                    orderToRemove.CancelledByUserId = actorUserId;

                    previousAmount = orderToRemove.Price;
                    newAmount = 0;
                    break;

                case CorrectionType.ChangeDiscount:
                    if (!command.TargetEntityId.HasValue) throw new ArgumentException("New DiscountMasterId required");
                    
                    var newMaster = await _context.DiscountMasters.FindAsync(command.TargetEntityId.Value);
                    if (newMaster == null) throw new KeyNotFoundException("Discount Master not found");

                    var activeFacts = await _context.DiscountFacts
                        .Where(df => df.InvoiceId == invoice.InvoiceId && df.IsActive)
                        .ToListAsync();
                    
                    var replacedFact = activeFacts.OrderByDescending(f => f.AppliedAt).FirstOrDefault();
                    previousAmount = replacedFact?.DiscountAmount ?? 0; // Audit snapshot

                    foreach (var ef in activeFacts) { ef.IsActive = false; }
                    
                    var newDiscountFact = new DiscountFact
                    {
                        DiscountFactId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        DiscountDefinitionId = command.TargetEntityId.Value,
                        AppliedBy = actorUserId.ToString(),
                        AppliedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true,
                        ReplacedDiscountFactId = replacedFact?.DiscountFactId,
                        Type = newMaster.Type,
                        Value = newMaster.Value,
                        MaxLimit = newMaster.MaxLimit,
                        GrossAmount = 0, DiscountAmount = 0, NetAmountAfterDiscount = 0 
                    };
                    _context.DiscountFacts.Add(newDiscountFact);
                    newAmount = 0; // Unknown until calc, but intention is recorded
                    break;

                case CorrectionType.PriceOverride:
                    decimal delta = command.NewValue ?? 0;
                    // RULE 2: Explicit Financial Fact
                    var priceAdj = new PriceAdjustmentFact
                    {
                        AdjustmentId = Guid.NewGuid(),
                        VisitId = visit.VisitId,
                        InvoiceId = invoice.InvoiceId,
                        DeltaAmount = delta,
                        Reason = command.Reason ?? "Price Override",
                        CreatedBy = actorUserId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.PriceAdjustmentFacts.Add(priceAdj);
                    
                    previousAmount = 0;
                    newAmount = delta;
                    break;
            }

            // RULE 1: CorrectionFact is AUDIT ONLY (No DeltaAmount)
            var correction = new CorrectionFact
            {
                CorrectionId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                InvoiceId = invoice.InvoiceId,
                CorrectionType = command.Type,
                TargetEntityId = command.TargetEntityId,
                // REMOVED: DeltaAmount
                PreviousAmount = previousAmount,
                NewAmount = newAmount,
                CreatedBy = actorUserId,
                CreatedAt = DateTime.UtcNow,
                Reason = command.Reason,
                PayloadJson = command.PayloadJson
            };

            _context.CorrectionFacts.Add(correction);
            await _context.SaveChangesAsync();

            // Trigger Central Revenue Engine
            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            // Audit
            await _eventWriter.WriteEventAsync(
                totalPaid > 0 ? BranchEventType.VISIT_CORRECTED_AFTER_PAYMENT : BranchEventType.VISIT_UPDATED,
                _context.Entry(visit).Reference(v => v.Branch).CurrentValue?.BranchId.ToString() ?? "Unknown",
                visitId.ToString(),
                visit.Token,
                $"Correction: {command.Type}. Reason: {command.Reason}",
                "User",
                actorUserId.ToString()
            );
        }

        public async Task<SynOS.Models.DTOs.CorrectionContextDto> GetCorrectionContextAsync(Guid visitId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Invoices).ThenInclude(i => i.PartialPayments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);
                
            if (visit == null) throw new KeyNotFoundException("Visit not found");
            
            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            decimal totalPaid = invoice == null ? 0 : invoice.Payments.Sum(p => p.Amount) + invoice.PartialPayments.Sum(p => p.Amount);
            var role = _userContext.CurrentRole;
            bool isPrivileged = role == "Admin" || role == "LabOwner";

            var history = await _context.CorrectionFacts
                .Where(c => c.VisitId == visitId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
            
            string paymentState = "Unpaid";
            if (invoice != null)
            {
                if (totalPaid >= invoice.Total && invoice.Total > 0) paymentState = "Paid";
                else if (totalPaid > 0) paymentState = "Partial";
            }

            var dto = new SynOS.Models.DTOs.CorrectionContextDto
            {
                VisitId = visitId,
                IsCorrectionAllowed = visit.Status != "Cancelled" && visit.Status != "Archived",
                RequiresAuthorization = totalPaid > 0,
                RequiresReason = totalPaid > 0,
                PaymentState = paymentState,
                History = history,
                CanChangeDiscount = totalPaid == 0 || isPrivileged,
                CanChangeTests = totalPaid == 0 || isPrivileged,
                CanChangePrice = isPrivileged,
                RequiresSupervisorApproval = totalPaid > 0 && !isPrivileged
            };
            
            return dto;
        }
    }
}