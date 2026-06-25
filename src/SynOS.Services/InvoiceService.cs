using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Models.Entities;
using SynOS.Services.Utils;
using SynOS.Services.Operational;
using SynOS.Models.Enums;
using SynOS.Models.Entities.Revenue;
using SynOS.Services.Revenue;
using SynOS.Services.Security;
using SynOS.Models.ReadModels; // ADDED
using System.Text.Json; // ADDED
using SynOS.Models.Events;

namespace SynOS.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<InvoiceService> _logger;
        private readonly IOperationalEventWriter _operationalEventWriter;
        private readonly IUserContext _userContext;
        private readonly IRevenueFactWriter _revenueFactWriter;
        private readonly IVisitService _visitService;
        private readonly IMiddlewareOutboxService _outboxService;

        public InvoiceService(
            SynOSDbContext context, 
            ILogger<InvoiceService> logger, 
            IOperationalEventWriter operationalEventWriter, 
            IUserContext userContext,
            IRevenueFactWriter revenueFactWriter,
            IVisitService visitService,
            IMiddlewareOutboxService outboxService)
        {
            _context = context;
            _logger = logger;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _revenueFactWriter = revenueFactWriter ?? throw new ArgumentNullException(nameof(revenueFactWriter));
            _visitService = visitService ?? throw new ArgumentNullException(nameof(visitService));
            _outboxService = outboxService ?? throw new ArgumentNullException(nameof(outboxService));
        }

        public async Task<RevenueStatsDto> GetDailyRevenueStatsAsync(Guid branchId, Guid? userId = null)
        {
            if (branchId == Guid.Empty) throw new ArgumentException("BranchId required");

            var today = DateTime.UtcNow.Date;
            
            var query = _context.UserOperationalStats
                .Where(s => s.BranchId == branchId && s.Date == today);

            if (userId.HasValue)
            {
                query = query.Where(s => s.UserId == userId.Value);
            }
            else if (_userContext.CurrentRole == "Receptionist")
            {
                var currentUserId = _userContext.CurrentUserId;
                query = query.Where(s => s.UserId == currentUserId);
            }

            var stats = await query
                .GroupBy(s => s.BranchId)
                .Select(g => new 
                {
                    WalkIns = g.Sum(x => x.WalkInsCount),
                    Payments = g.Sum(x => x.PaymentsTotal),
                    Cash = g.Sum(x => x.PaymentsCashTotal),
                    Online = g.Sum(x => x.PaymentsOnlineTotal),
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
                PaymentsCashTotal = stats.Cash,
                PaymentsOnlineTotal = stats.Online,
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
                .Include(i => i.Visit).ThenInclude(v => v.Patient) // Ensure Patient is loaded for context
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null) throw new KeyNotFoundException($"Invoice not found for ID {invoiceId}.");

            if (invoice.Status == "Paid" || invoice.Status == "Cancelled")
            {
                throw new InvalidOperationException($"Cannot record payment for invoice in '{invoice.Status}' status.");
            }

            decimal currentPaidAmount = invoice.Payments.Sum(p => p.Amount) + invoice.PartialPayments.Sum(pp => pp.Amount);
            decimal remainingDue = invoice.Total - currentPaidAmount;
            if (remainingDue <= 0)
            {
                _logger.LogWarning("Rejecting payment for Visit {VisitId}: Invoice {InvoiceId} is already fully paid (Total: {Total}, Paid: {Paid})", 
                    invoice.VisitId, invoiceId, invoice.Total, currentPaidAmount);
                throw new InvalidOperationException($"Invoice {invoiceId} is already fully paid.");
            }

            decimal recordedAmount = paymentDto.Amount;
            if (paymentDto.Amount > remainingDue)
            {
                _logger.LogWarning("Payment amount {Amount} exceeds remaining due {Remaining}. Truncating to remaining amount.", paymentDto.Amount, remainingDue);
                recordedAmount = remainingDue;
            }

            if (recordedAmount <= 0)
            {
                throw new InvalidOperationException("Effective payment amount must be greater than zero.");
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
                    visit.Status = VisitStatus.Paid;
                    if (visit.Token.StartsWith("DRAFT"))
                    {
                        await _visitService.AssignOfficialTokenAsync(visit.VisitId, paymentDto.ReceivedByUserId);
                    }
                }
            }

            // Enqueue PaymentReceivedEvent
            _outboxService.Enqueue(new PaymentReceivedEvent(
                payment.PaymentId,
                invoice.InvoiceId,
                invoice.VisitId,
                payment.Amount,
                payment.Method,
                payment.ReceivedByUserId,
                payment.ReceivedAt,
                invoice.Visit?.BranchId ?? _userContext.CurrentBranchId
            ));

            await _context.SaveChangesAsync();

            var revenueFactId = await _revenueFactWriter.DeclareRevenueFactAsync(new SynOS.Models.DTOs.Revenue.DeclareRevenueFactCommand
            {
                OccurredAt = payment.ReceivedAt,
                Amount = payment.Amount,
                Currency = "INR",
                Direction = RevenueDirection.Inflow,
                SourceType = RevenueSourceType.Patient,
                SourceReferenceId = payment.PaymentId.ToString(), 
                PaymentMode = MapPaymentMethod(payment.Method),
                DeclaredByUserId = payment.ReceivedByUserId,
                Notes = $"Payment received for Invoice {invoice.InvoiceId}",
                ExternalTransactionId = payment.ReceiptNo
            });

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(payment.ReceivedByUserId);
            string patientName = invoice.Visit != null ? $"{invoice.Visit.Patient.FirstName} {invoice.Visit.Patient.LastName}" : "Unknown Patient";
            string tokenId = invoice.Visit?.Token ?? "Unknown";

            var paymentMetadata = JsonSerializer.Serialize(new 
            { 
                PatientName = patientName, 
                TokenId = tokenId, 
                ActorName = actorName, 
                Amount = payment.Amount, 
                Method = payment.Method 
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.PAYMENT_RECEIVED,
                _userContext.CurrentBranchId.ToString(), 
                invoice.VisitId.ToString(),
                tokenId, 
                $"Payment received {payment.Amount:F2} ({payment.Method})",
                actorName, // Use Real Name
                payment.ReceivedByUserId.ToString(),
                true, 
                revenueFactId, 
                "RevenueFact",
                TimelineVisibility.Surface, // Ensure visibility
                invoice.VisitId,
                paymentMetadata
            );

            return payment;
        }
        
        private PaymentMode MapPaymentMethod(string method)
        {
            return method?.Trim().ToLowerInvariant() switch
            {
                "cash" => PaymentMode.Cash,
                "0" => PaymentMode.Cash, 
                "card" => PaymentMode.Card,
                "2" => PaymentMode.Card, 
                "upi" => PaymentMode.UPI,
                "1" => PaymentMode.UPI, 
                "banktransfer" => PaymentMode.BankTransfer,
                "3" => PaymentMode.BankTransfer, 
                _ => PaymentMode.Other 
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
                Patient = new PatientPrintDto { Name = $"{invoice.Visit.Patient.FirstName} {invoice.Visit.Patient.LastName}", Mrn = invoice.Visit.Patient.MRN }, // Fixed typo in PatientPrintDto usage
                Items = invoice.Visit.Orders.Select(o => new OrderItemPrintDto
                {
                    TestName = o.Test?.TestName ?? o.TestCode, 
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

        private async Task<string> GetActorNameAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            return user?.Name ?? "Unknown User";
        }
    }
}
