using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using Microsoft.Extensions.Logging; // Added for logging

namespace SynOS.Services
{
    public class VisitService : IVisitService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<VisitService> _logger; // Added for logging

        // TODO: Configure lab timezone in appsettings or a dedicated config service
        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; // Default to server local timezone

        public VisitService(SynOSDbContext context, ILogger<VisitService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Visit> CreateVisitAsync(VisitCreateDto visitDto, string? idempotencyKey = null)
        {
            // TODO: Implement full idempotency record table and check here
            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                // For now, just log that an idempotency key was provided
                _logger.LogInformation("Idempotency key received for CreateVisit: {IdempotencyKey}", idempotencyKey);
            }

            var patient = await _context.Patients.FindAsync(visitDto.PatientId);
            if (patient == null || patient.IsSoftDeleted)
            {
                throw new KeyNotFoundException($"Patient with ID {visitDto.PatientId} not found or is inactive.");
            }

            var labLocalToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var token = await GenerateDailyTokenAsync(visitDto.Department, labLocalToday);

            var visit = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = visitDto.PatientId,
                Token = token,
                TokenDate = labLocalToday, // Use lab local date
                Department = visitDto.Department,
                Status = "PendingPayment",
                CreatedAt = DateTime.UtcNow
            };

            _context.Visits.Add(visit);

            decimal grossAmount = 0;
            var orders = new List<Order>();
            foreach (var testCode in visitDto.TestCodes)
            {
                var testDefinition = await _context.TestDefinitions.FirstOrDefaultAsync(td => td.TestCode == testCode);
                if (testDefinition == null)
                {
                    throw new KeyNotFoundException($"Test Definition for TestCode {testCode} not found.");
                }

                var order = new Order
                {
                    OrderId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    TestCode = testCode,
                    Department = visitDto.Department, // Use department from TestDefinition or visitDto? Assuming visitDto for now.
                    Status = "Pending",
                    Price = testDefinition.Price,
                    Discount = 0, // TODO: Implement discount logic
                    CreatedAt = DateTime.UtcNow
                };
                orders.Add(order);
                grossAmount += testDefinition.Price;
            }
            _context.Orders.AddRange(orders);

            // TODO: Implement proper tax calculation logic
            decimal taxRate = 0.05m; // 5% tax placeholder
            decimal netAmount = grossAmount; // Assuming no discounts for now
            decimal taxAmount = netAmount * taxRate;
            decimal totalAmount = netAmount + taxAmount;

            var invoice = new Invoice
            {
                InvoiceId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                GrossAmount = grossAmount,
                DiscountAmount = 0, // TODO: Implement discount logic
                NetAmount = netAmount,
                TaxAmount = taxAmount,
                Total = totalAmount,
                Status = "PendingPayment",
                DueDate = labLocalToday.AddDays(7), // Due in 7 days from local date
                CreatedAt = DateTime.UtcNow
            };
            _context.Invoices.Add(invoice);

            await _context.SaveChangesAsync();
            return visit;
        }

        public async Task<Visit?> GetVisitDetailsAsync(Guid visitId)
        {
            return await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.TestDefinition) // Include TestDefinition for order details
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.Payments)
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.PartialPayments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);
        }

        public async Task<IEnumerable<Visit>> GetVisitsAsync(string department, string status, int limit)
        {
            return await _context.Visits
                .Include(v => v.Patient) // Include patient details for list display
                .Include(v => v.Invoices) // Include invoices for status/amount
                .Where(v => v.Department == department && v.Status == status)
                .OrderByDescending(v => v.CreatedAt)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<Payment?> RecordPaymentAsync(Guid visitId, PaymentRequestDto paymentDto)
        {
            var invoice = await _context.Invoices
                                        .Include(i => i.Payments)
                                        .Include(i => i.PartialPayments)
                                        .FirstOrDefaultAsync(i => i.VisitId == visitId);
            if (invoice == null) throw new KeyNotFoundException($"Invoice not found for visit ID {visitId}.");

            // Check if invoice is already fully paid or cancelled
            if (invoice.Status == "Paid" || invoice.Status == "Cancelled")
            {
                throw new InvalidOperationException($"Cannot record payment for invoice in '{invoice.Status}' status.");
            }

            // Determine if it's a full or partial payment
            decimal currentPaidAmount = invoice.Payments.Sum(p => p.Amount) + invoice.PartialPayments.Sum(pp => pp.Amount);
            decimal remainingDue = invoice.Total - currentPaidAmount;

            if (paymentDto.Amount > remainingDue)
            {
                _logger.LogWarning("Payment amount {PaymentAmount} exceeds remaining due {RemainingDue} for Invoice {InvoiceId}. Recording full remaining amount.", paymentDto.Amount, remainingDue, invoice.InvoiceId);
                paymentDto.Amount = remainingDue; // Adjust payment to not overpay
            }

            if (paymentDto.Amount <= 0)
            {
                throw new ArgumentException("Payment amount must be greater than zero.");
            }

            if (paymentDto.Amount < remainingDue)
            {
                var partialPayment = new PartialPayment
                {
                    PartialId = Guid.NewGuid(),
                    InvoiceId = invoice.InvoiceId,
                    Amount = paymentDto.Amount,
                    Method = paymentDto.Method,
                    PaidAt = DateTime.UtcNow
                };
                _context.PartialPayments.Add(partialPayment);
                invoice.Status = "PartialPayment";
            }
            else // paymentDto.Amount == remainingDue
            {
                var newPayment = new Payment
                {
                    PaymentId = Guid.NewGuid(),
                    InvoiceId = invoice.InvoiceId,
                    Amount = paymentDto.Amount,
                    Method = paymentDto.Method,
                    ReceiptNo = paymentDto.ReceiptNo,
                    ReceivedAt = DateTime.UtcNow,
                    ReceivedByUserId = paymentDto.ReceivedByUserId
                };
                _context.Payments.Add(newPayment);
                invoice.Status = "Paid";
            }

            // Update visit status if invoice is fully paid
            if (invoice.Status == "Paid")
            {
                var visit = await _context.Visits.FindAsync(visitId);
                if (visit != null) visit.Status = "Paid";
            }

            await _context.SaveChangesAsync();
            Payment? paymentResult = _context.Payments.Local.FirstOrDefault(p => p.InvoiceId == invoice.InvoiceId)!;
            if (paymentResult == null)
            {
                throw new InvalidOperationException("Payment was not found in local context after being added.");
            }
            return paymentResult;
        }

        public async Task<VisitCancellation> CancelVisitAsync(Guid visitId, CancelRequestDto cancelDto)
        {
            var visit = await _context.Visits
                                      .Include(v => v.Invoices)
                                      .ThenInclude(i => i.Payments)
                                      .Include(v => v.Invoices)
                                      .ThenInclude(i => i.PartialPayments)
                                      .FirstOrDefaultAsync(v => v.VisitId == visitId);
            if (visit == null) throw new KeyNotFoundException($"Visit with ID {visitId} not found.");

            if (visit.Status == "Cancelled")
            {
                throw new InvalidOperationException("Visit is already cancelled.");
            }

            visit.Status = "Cancelled";

            var cancellation = new VisitCancellation
            {
                CancelId = Guid.NewGuid(),
                VisitId = visitId,
                Reason = cancelDto.Reason,
                Notes = cancelDto.Notes,
                CancelledByUserId = cancelDto.CancelledByUserId,
                CancelledAt = DateTime.UtcNow
            };
            _context.VisitCancellations.Add(cancellation);

            // Update invoice status to Cancelled
            var invoice = visit.Invoices.FirstOrDefault();
            if (invoice != null)
            {
                invoice.Status = "Cancelled";

                // If any payments were made, create a CreditNote
                decimal totalPaid = invoice.Payments.Sum(p => p.Amount) + invoice.PartialPayments.Sum(pp => pp.Amount);
                if (totalPaid > 0)
                {
                    var creditNote = new CreditNote
                    {
                        CreditNoteId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        Amount = totalPaid,
                        Reason = $"Cancellation of Visit {visit.Token} - {cancelDto.Reason}",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CreditNotes.Add(creditNote);
                    // TODO: Add logic to flag for actual refund process if needed
                    _logger.LogInformation("Credit note created for cancelled visit {VisitId} with total paid amount {TotalPaid}", visitId, totalPaid);
                }
            }

            await _context.SaveChangesAsync();
            return cancellation;
        }

        private async Task<string> GenerateDailyTokenAsync(string department, DateTime labLocalDay)
        {
            // Map department name to a single letter code
            // TODO: Configure this mapping in appsettings or a dedicated service
            string deptLetter = department switch
            {
                "Pathology" => "P",
                "Radiology" => "X",
                _ => "U" // Unknown
            };

            var tokenCounter = await _context.TokenCounters
                .FirstOrDefaultAsync(tc => tc.Day == labLocalDay && tc.Department == department);

            if (tokenCounter == null)
            {
                tokenCounter = new TokenCounter
                {
                    CounterId = Guid.NewGuid(),
                    Department = department,
                    Day = labLocalDay,
                    SeriesLetter = "A", // Start with 'A'
                    LastNumber = 0,
                    MaxPerSeries = 999,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.TokenCounters.Add(tokenCounter);
            }
            else
            {
                // Ensure we are working with the latest data for concurrency
                _context.Entry(tokenCounter).Reload();
            }

            tokenCounter.LastNumber++;
            tokenCounter.UpdatedAt = DateTime.UtcNow;

            if (tokenCounter.LastNumber > tokenCounter.MaxPerSeries)
            {
                if (tokenCounter.SeriesLetter[0] < 'Z')
                {
                    tokenCounter.SeriesLetter = ((char)(tokenCounter.SeriesLetter[0] + 1)).ToString();
                    tokenCounter.LastNumber = 1; // Reset number for new series
                }
                else
                {
                    // Token space exhausted for the day (A..Z x 999)
                    _logger.LogError("Token space exhausted for department {Department} on {Day}. Series A-Z, numbers 001-999.", department, labLocalDay.ToShortDateString());
                    throw new InvalidOperationException($"Token space exhausted for {department} today. Please contact admin.");
                }
            }

            // Log token generation event
            // TODO: Pass actual UserId from context
            // _logger.LogInformation("Token generated: {Token} for Department: {Department} on {Day}", token, department, labLocalDay.ToShortDateString());
            // await _context.AuditLogs.AddAsync(new AuditLog { UserId = Guid.Empty, Action = "TokenGenerated", EntityType = "Token", EntityId = Guid.Empty, Details = $"Token {token} generated for {department}", Timestamp = DateTime.UtcNow });


            await _context.SaveChangesAsync(); // Save changes to tokenCounter immediately

            return $"{tokenCounter.SeriesLetter}{deptLetter}-{tokenCounter.LastNumber:D3}";
        }
    }
}
