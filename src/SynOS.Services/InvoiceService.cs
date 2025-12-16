using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Services.Utils;

namespace SynOS.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<InvoiceService> _logger;

        public InvoiceService(SynOSDbContext context, ILogger<InvoiceService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Payment> RecordPaymentAsync(Guid invoiceId, PaymentRequestDto paymentDto)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .Include(i => i.PartialPayments)
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null) throw new KeyNotFoundException($"Invoice not found for ID {invoiceId}.");

            if (invoice.Status == "Paid" || invoice.Status == "Cancelled")
            {
                throw new InvalidOperationException($"Cannot record payment for invoice in '{invoice.Status}' status.");
            }

            decimal currentPaidAmount = invoice.Payments.Sum(p => p.Amount) + invoice.PartialPayments.Sum(pp => pp.Amount);
            decimal remainingDue = invoice.Total - currentPaidAmount;

            if (paymentDto.Amount > remainingDue)
            {
                _logger.LogWarning("Payment amount {PaymentAmount} exceeds remaining due {RemainingDue}. Recording full remaining amount.", paymentDto.Amount, remainingDue);
                paymentDto.Amount = remainingDue;
            }

            if (paymentDto.Amount <= 0)
            {
                throw new ArgumentException("Payment amount must be greater than zero.");
            }

            var payment = new Payment
            {
                PaymentId = Guid.NewGuid(),
                InvoiceId = invoice.InvoiceId,
                Amount = paymentDto.Amount,
                Method = paymentDto.Method,
                ReceiptNo = paymentDto.ReceiptNo,
                ReceivedAt = DateTime.UtcNow,
                ReceivedByUserId = paymentDto.ReceivedByUserId
            };
            _context.Payments.Add(payment);

            if (paymentDto.Amount < remainingDue)
            {
                invoice.Status = "PartialPayment";
            }
            else
            {
                invoice.Status = "Paid";
                var visit = await _context.Visits.FindAsync(invoice.VisitId);
                if (visit != null) visit.Status = "Paid";
            }

            await _context.SaveChangesAsync();
            return payment;
        }
        
        public async Task<InvoicePrintDto> GetInvoiceForPrintingAsync(Guid invoiceId)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Visit.Patient)
                .Include(i => i.Visit.Orders)
                .ThenInclude(o => o.Test) // Corrected to o.Test
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null)
            {
                throw new KeyNotFoundException($"Invoice with ID {invoiceId} not found.");
            }

            var payload = EscPosGenerator.GenerateInvoiceSlip(invoice);

            return new InvoicePrintDto
            {
                InvoiceNumber = invoice.InvoiceId.ToString(),
                InvoiceDate = invoice.CreatedAt,
                Patient = new PatientPrintDto { Name = $"{invoice.Visit.Patient.FirstName} {invoice.Visit.Patient.LastName}", Mrn = invoice.Visit.Patient.MRN },
                Items = invoice.Visit.Orders.Select(o => new OrderItemPrintDto
                {
                    TestName = o.Test?.TestName ?? o.TestCode, // Corrected to o.Test?.TestName
                    Price = o.Price
                }).ToList(),
                GrossAmount = invoice.GrossAmount,
                DiscountAmount = invoice.DiscountAmount,
                TaxAmount = invoice.TaxAmount,
                TotalAmount = invoice.Total,
                PaymentMethod = invoice.Payments.FirstOrDefault()?.Method ?? "N/A",
                PrintPayload = payload
            };
        }
    }
}
