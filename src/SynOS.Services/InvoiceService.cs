using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Dashboard; // ADDED
using SynOS.Models.Entities;
using SynOS.Services.Utils;
using SynOS.Services.Operational; // ADDED
using SynOS.Models.Enums; // ADDED
using SynOS.Models.Entities.Revenue; // ADDED
using SynOS.Services.Revenue; // ADDED
using SynOS.Services.Security; // ADDED

namespace SynOS.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<InvoiceService> _logger;
        private readonly IOperationalEventWriter _operationalEventWriter;
        private readonly IUserContext _userContext;
        private readonly IRevenueFactWriter _revenueFactWriter; // ADDED
        private readonly IVisitService _visitService; // ADDED

        public InvoiceService(
            SynOSDbContext context, 
            ILogger<InvoiceService> logger, 
            IOperationalEventWriter operationalEventWriter, 
            IUserContext userContext,
            IRevenueFactWriter revenueFactWriter, // ADDED
            IVisitService visitService) // ADDED
        {
            _context = context;
            _logger = logger;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _revenueFactWriter = revenueFactWriter ?? throw new ArgumentNullException(nameof(revenueFactWriter)); // ADDED
            _visitService = visitService ?? throw new ArgumentNullException(nameof(visitService)); // ADDED
        }

        public async Task<RevenueStatsDto> GetDailyRevenueStatsAsync(Guid branchId)
        {
            if (branchId == Guid.Empty) throw new ArgumentException("BranchId required");

            // CRITICAL FIX: Read from Projected Stats (Source of Truth for Dashboard)
            // Do NOT use DateTime.Today (Local) on raw tables, as it causes 0 results until push.
            // The Projector maintains UserOperationalStats based on Events.
            
            var today = DateTime.UtcNow.Date; // Projector uses UTC Date
            
            // We aggregate for the whole branch (all users)
            var stats = await _context.UserOperationalStats
                .Where(s => s.BranchId == branchId && s.Date == today)
                .GroupBy(s => s.BranchId)
                .Select(g => new 
                {
                    WalkIns = g.Sum(x => x.WalkInsCount),
                    Payments = g.Sum(x => x.PaymentsTotal),
                    Cash = g.Sum(x => x.PaymentsCashTotal),
                    Online = g.Sum(x => x.PaymentsOnlineTotal),
                    // EXTENDED PROJECTION
                    OnlineCount = g.Sum(x => x.PaymentsOnlineCount),
                    PrepaidCount = g.Sum(x => x.PrepaidBillsCount),
                    PrepaidTotal = g.Sum(x => x.PrepaidBillsTotal)
                })
                .FirstOrDefaultAsync();

            if (stats == null)
            {
                return new RevenueStatsDto
                {
                    WalkInsToday = 0,
                    PaymentsCollected = 0,
                    PaymentsCashTotal = 0,
                    PaymentsOnlineTotal = 0,
                    PaymentsOnlineCount = 0,
                    PrepaidBillsCount = 0,
                    PrepaidBillsTotal = 0
                };
            }

            return new RevenueStatsDto
            {
                WalkInsToday = stats.WalkIns,
                PaymentsCollected = stats.Payments,
                
                // CRITICAL FIX: Populate Splits so Dashboard Tiles work
                PaymentsCashTotal = stats.Cash,
                PaymentsOnlineTotal = stats.Online,
                
                // Populate other stats from projection
                PaymentsOnlineCount = stats.OnlineCount,
                PrepaidBillsCount = stats.PrepaidCount,
                PrepaidBillsTotal = stats.PrepaidTotal,
                
                PendingReports = 0,
                AvgReportTimeMinutes = 0
            };
        }

        public async Task<Payment> RecordPaymentAsync(Guid invoiceId, PaymentRequestDto paymentDto)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .Include(i => i.PartialPayments)
                .Include(i => i.Visit) // ADDED: Need Visit for operational event context
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null) throw new KeyNotFoundException($"Invoice not found for ID {invoiceId}.");

            // ... (checks)

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
                ReceiptNo = !string.IsNullOrEmpty(paymentDto.ReceiptNo) 
                    ? paymentDto.ReceiptNo 
                    : $"RCP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
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
                if (visit != null) 
                {
                    visit.Status = "Paid";
                    // Atomic Token Assignment on Completion
                    if (visit.Token.StartsWith("DRAFT"))
                    {
                        await _visitService.AssignOfficialTokenAsync(visit.VisitId, paymentDto.ReceivedByUserId);
                    }
                }
            }

            await _context.SaveChangesAsync();

            // 1. EMIT REVENUE FACT (Truth Engine) - FIRST
            var revenueFactId = await _revenueFactWriter.DeclareRevenueFactAsync(new SynOS.Models.DTOs.Revenue.DeclareRevenueFactCommand
            {
                OccurredAt = payment.ReceivedAt,
                Amount = payment.Amount,
                Currency = "INR",
                Direction = RevenueDirection.Inflow,
                SourceType = RevenueSourceType.Patient,
                // SEMANTIC CORRECTION: The Financial Identity is the PAYMENT, not the Visit.
                // This allows multiple payments per visit without ID collision.
                SourceReferenceId = payment.PaymentId.ToString(), 
                PaymentMode = MapPaymentMethod(payment.Method),
                DeclaredByUserId = payment.ReceivedByUserId,
                Notes = $"Payment received for Invoice {invoice.InvoiceId}",
                ExternalTransactionId = payment.ReceiptNo
            });

            // 2. Emit Operational Event: PAYMENT_RECEIVED (Linked to Fact)
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.PAYMENT_RECEIVED,
                _userContext.CurrentBranchId.ToString(), 
                invoice.VisitId.ToString(),
                invoice.Visit?.Token ?? "Unknown",
                $"Payment received {payment.Amount:F2} ({payment.Method})",
                "User",
                payment.ReceivedByUserId.ToString(),
                true, // saveChanges
                revenueFactId, // sourceId (Points to Truth)
                "RevenueFact" // sourceType (Explicit)
            );

            return payment;
        }
        
        private PaymentMode MapPaymentMethod(string method)
        {
            return method?.Trim().ToLowerInvariant() switch
            {
                "cash" => PaymentMode.Cash,
                "0" => PaymentMode.Cash, // Legacy Fallback
                
                "card" => PaymentMode.Card,
                "2" => PaymentMode.Card, // Legacy Fallback
                
                "upi" => PaymentMode.UPI,
                "1" => PaymentMode.UPI, // Legacy Fallback

                "banktransfer" => PaymentMode.BankTransfer,
                "3" => PaymentMode.BankTransfer, // Legacy Fallback
                
                _ => PaymentMode.Other // Will result in 0 Splits but correct Grand Total
            };
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
