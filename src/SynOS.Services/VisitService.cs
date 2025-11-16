using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class VisitService : IVisitService
    {
        private readonly SynOSDbContext _context;

        public VisitService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<Visit> CreateVisitAsync(VisitCreateDto visitDto)
        {
            var token = await GenerateDailyTokenAsync(visitDto.Department);

            var visit = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = visitDto.PatientId,
                Token = token,
                TokenDate = DateTime.UtcNow.Date,
                Department = visitDto.Department,
                Status = "PendingPayment"
            };

            _context.Visits.Add(visit);

            decimal grossAmount = 0;
            var orders = new List<Order>();
            foreach (var testCode in visitDto.TestCodes)
            {
                // In a real app, you'd look up the price from a TestDefinition table
                var price = 100m; // Dummy price
                var order = new Order
                {
                    OrderId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    TestCode = testCode,
                    Department = visitDto.Department,
                    Status = "Pending",
                    Price = price
                };
                orders.Add(order);
                grossAmount += price;
            }
            _context.Orders.AddRange(orders);

            var invoice = new Invoice
            {
                InvoiceId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                GrossAmount = grossAmount,
                Total = grossAmount, // Simplified
                Status = "Draft",
                DueDate = DateTime.UtcNow.AddDays(30)
            };
            _context.Invoices.Add(invoice);

            await _context.SaveChangesAsync();
            return visit;
        }

        public async Task<Visit> GetVisitDetailsAsync(Guid visitId)
        {
            return await _context.Visits
                .Include(v => v.Orders)
                .Include(v => v.Invoices)
                .ThenInclude(i => i.Payments)
                .Include(v => v.Invoices)
                .ThenInclude(i => i.PartialPayments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);
        }

        public async Task<IEnumerable<Visit>> GetVisitsAsync(string department, string status, int limit)
        {
            return await _context.Visits
                .Where(v => v.Department == department && v.Status == status)
                .OrderByDescending(v => v.CreatedAt)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<Payment> RecordPaymentAsync(Guid visitId, PaymentRequestDto paymentDto, int userId)
        {
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.VisitId == visitId);
            if (invoice == null) throw new KeyNotFoundException("Invoice not found for this visit.");

            var payment = new Payment
            {
                PaymentId = Guid.NewGuid(),
                InvoiceId = invoice.InvoiceId,
                Amount = paymentDto.Amount,
                Method = paymentDto.Method,
                ReceiptNo = paymentDto.ReceiptNo,
                ReceivedByUserId = userId
            };
            _context.Payments.Add(payment);

            var totalPaid = await _context.Payments.Where(p => p.InvoiceId == invoice.InvoiceId).SumAsync(p => p.Amount) +
                            await _context.PartialPayments.Where(p => p.InvoiceId == invoice.InvoiceId).SumAsync(p => p.Amount) +
                            payment.Amount;

            if (totalPaid >= invoice.Total)
            {
                invoice.Status = "Paid";
                var visit = await _context.Visits.FindAsync(visitId);
                if(visit != null) visit.Status = "Paid";
            }
            else
            {
                invoice.Status = "Partial";
            }

            await _context.SaveChangesAsync();
            return payment;
        }

        public async Task<VisitCancellation> CancelVisitAsync(Guid visitId, CancelRequestDto cancelDto, int userId)
        {
            var visit = await _context.Visits.FindAsync(visitId);
            if (visit == null) throw new KeyNotFoundException("Visit not found.");

            visit.Status = "Cancelled";

            var cancellation = new VisitCancellation
            {
                CancelId = Guid.NewGuid(),
                VisitId = visitId,
                Reason = cancelDto.Reason,
                CancelledByUserId = userId
            };
            _context.VisitCancellations.Add(cancellation);

            await _context.SaveChangesAsync();
            return cancellation;
        }

        private async Task<string> GenerateDailyTokenAsync(string department)
        {
            var today = DateTime.UtcNow.Date;
            var tokenCounter = await _context.TokenCounters
                .FirstOrDefaultAsync(tc => tc.Day == today && tc.Department == department);

            if (tokenCounter == null)
            {
                tokenCounter = new TokenCounter
                {
                    CounterId = Guid.NewGuid(),
                    Department = department,
                    Day = today,
                    LastNumber = 0
                };
                _context.TokenCounters.Add(tokenCounter);
            }

            tokenCounter.LastNumber++;
            tokenCounter.UpdatedAt = DateTime.UtcNow;

            if (tokenCounter.LastNumber > tokenCounter.MaxPerDay)
            {
                throw new InvalidOperationException("Daily token limit reached for this department.");
            }

            await _context.SaveChangesAsync();

            var deptLetter = department.Substring(0, 1).ToUpper();
            return $"{deptLetter}-{tokenCounter.LastNumber:D3}";
        }
    }
}
