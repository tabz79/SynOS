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
using SynOS.Services.Time;

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
        private readonly ILabTimeProvider _labTimeProvider;

        public InvoiceService(
            SynOSDbContext context, 
            ILogger<InvoiceService> logger, 
            IOperationalEventWriter operationalEventWriter, 
            IUserContext userContext,
            IRevenueFactWriter revenueFactWriter,
            IVisitService visitService,
            IMiddlewareOutboxService outboxService,
            ILabTimeProvider labTimeProvider)
        {
            _context = context;
            _logger = logger;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _revenueFactWriter = revenueFactWriter ?? throw new ArgumentNullException(nameof(revenueFactWriter));
            _visitService = visitService ?? throw new ArgumentNullException(nameof(visitService));
            _outboxService = outboxService ?? throw new ArgumentNullException(nameof(outboxService));
            _labTimeProvider = labTimeProvider ?? throw new ArgumentNullException(nameof(labTimeProvider));
        }

        public async Task<RevenueStatsDto> GetDailyRevenueStatsAsync(Guid branchId, Guid? userId = null)
        {
            if (branchId == Guid.Empty) throw new ArgumentException("BranchId required");

            var today = _labTimeProvider.GetLabToday();
            
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

            // Calculate actual confirmed walk-ins from Visits table (all registered patient visits with orders/bills, excluding empty unbilled drafts and cancellations)
            var startOfToday = new DateTimeOffset(today, _labTimeProvider.GetLabTimeZone().GetUtcOffset(today));
            var endOfToday = startOfToday.AddDays(1);
            var startUtc = startOfToday.UtcDateTime;
            var endUtc = endOfToday.UtcDateTime;

            var visitsQuery = _context.Visits
                .Where(v => v.BranchId == branchId && v.CreatedAt >= startUtc && v.CreatedAt < endUtc
                         && v.Status != VisitStatus.Cancelled
                         && (v.Status != VisitStatus.Draft || v.Orders.Any() || v.Invoices.Any()));

            if (userId.HasValue)
            {
                visitsQuery = visitsQuery.Where(v => v.AssignedReceptionistId == userId.Value || v.CreatedByUserId == userId.Value);
            }
            else if (_userContext.CurrentRole == "Receptionist")
            {
                var currentUserId = _userContext.CurrentUserId;
                // If user is receptionist, include visits assigned to/created by them, or unassigned branch visits they are serving
                visitsQuery = visitsQuery.Where(v => v.AssignedReceptionistId == currentUserId || v.CreatedByUserId == currentUserId || v.AssignedReceptionistId == null);
            }

            var walkIns = await visitsQuery.CountAsync();

            var prepaidVisits = await visitsQuery
                .Where(v => v.PaymentCollectionModel == "PartnerCollects" && (v.Status == VisitStatus.Paid || v.Status == VisitStatus.FullPaid))
                .Include(v => v.Invoices)
                .ToListAsync();

            int prepaidCount = prepaidVisits.Count;
            decimal prepaidTotal = prepaidVisits.Sum(v => {
                var invTotal = v.Invoices.FirstOrDefault()?.Total ?? 0m;
                var b2bDiscount = v.B2BDiscountAmount ?? 0m;
                return Math.Max(0m, invTotal - b2bDiscount);
            });

            var finalPrepaidCount = prepaidCount > 0 ? prepaidCount : (stats?.PrepaidCount ?? 0);
            var finalWalkIns = Math.Max(walkIns, Math.Max(stats?.WalkIns ?? 0, finalPrepaidCount));

            var paymentsQuery = _context.Payments
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                .Where(p => p.Invoice != null && p.Invoice.Visit != null && p.Invoice.Visit.BranchId == branchId && p.ReceivedAt >= startUtc && p.ReceivedAt < endUtc);

            if (userId.HasValue)
            {
                paymentsQuery = paymentsQuery.Where(p => p.ReceivedByUserId == userId.Value);
            }
            else if (_userContext.CurrentRole == "Receptionist")
            {
                var currentUserId = _userContext.CurrentUserId;
                paymentsQuery = paymentsQuery.Where(p => p.ReceivedByUserId == currentUserId);
            }

            var payments = await paymentsQuery.ToListAsync();
            Func<string?, bool> isCash = m => !string.IsNullOrEmpty(m) && m.IndexOf("Cash", StringComparison.OrdinalIgnoreCase) >= 0;

            decimal cashTotal = payments.Where(p => isCash(p.Method)).Sum(p => p.Amount);
            var onlinePayments = payments.Where(p => !isCash(p.Method)).ToList();
            decimal onlineTotal = onlinePayments.Sum(p => p.Amount);
            int onlineCount = onlinePayments.Count(p => p.Amount > 0);
            decimal totalPayments = cashTotal + onlineTotal;

            // Direct ledger takes precedence for real-time accuracy (partial payments, refunds, cash desk)
            decimal finalCash = payments.Any() ? cashTotal : (stats?.Cash ?? 0m);
            decimal finalOnline = payments.Any() ? onlineTotal : (stats?.Online ?? 0m);
            int finalOnlineCount = payments.Any() ? onlineCount : (stats?.OnlineCount ?? 0);
            decimal finalTotal = payments.Any() ? totalPayments : (stats?.Payments ?? 0m);

            return new RevenueStatsDto
            {
                WalkInsToday = finalWalkIns,
                PaymentsCollected = finalTotal,
                PaymentsCashTotal = finalCash,
                PaymentsOnlineTotal = finalOnline,
                PaymentsOnlineCount = finalOnlineCount,
                PrepaidBillsCount = finalPrepaidCount,
                PrepaidBillsTotal = prepaidTotal > 0 ? prepaidTotal : (stats?.PrepaidTotal ?? 0m),
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

            var receiverId = paymentDto.ReceivedByUserId;
            if (receiverId == Guid.Empty || !await _context.Users.AnyAsync(u => u.UserId == receiverId))
            {
                receiverId = await _context.Users.OrderBy(u => u.CreatedAt).Select(u => u.UserId).FirstOrDefaultAsync();
            }

            var payment = new Payment
            {
                PaymentId = Guid.NewGuid(),
                InvoiceId = invoice.InvoiceId,
                Amount = recordedAmount,
                Method = !string.IsNullOrWhiteSpace(paymentDto.Method) ? paymentDto.Method : "Cash",
                ReceiptNo = !string.IsNullOrEmpty(paymentDto.ReceiptNo) 
                    ? paymentDto.ReceiptNo 
                    : $"RCP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
                ReceivedAt = DateTime.UtcNow,
                ReceivedByUserId = receiverId
            };
            _context.Payments.Add(payment);

            if (paymentDto.Amount < remainingDue)
            {
                invoice.Status = "PartialPayment";
                var targetVisit = await _context.Visits.FindAsync(invoice.VisitId);
                if (targetVisit != null) 
                {
                    targetVisit.Status = VisitStatus.PartialPayment;
                    if (targetVisit.Token.StartsWith("DRAFT", StringComparison.OrdinalIgnoreCase) || targetVisit.Token.StartsWith("D-", StringComparison.OrdinalIgnoreCase))
                    {
                        await _visitService.AssignOfficialTokenAsync(targetVisit.VisitId, paymentDto.ReceivedByUserId);
                    }
                }
            }
            else
            {
                invoice.Status = "Paid";
                var targetVisit = await _context.Visits.FindAsync(invoice.VisitId);
                if (targetVisit != null) 
                {
                    targetVisit.Status = VisitStatus.Paid;
                    if (targetVisit.Token.StartsWith("DRAFT", StringComparison.OrdinalIgnoreCase) || targetVisit.Token.StartsWith("D-", StringComparison.OrdinalIgnoreCase))
                    {
                        await _visitService.AssignOfficialTokenAsync(targetVisit.VisitId, paymentDto.ReceivedByUserId);
                    }
                }
            }

            // Resolve demographics and referral dimensions for event
            var visit = await _context.Visits.FindAsync(invoice.VisitId);
            Guid? patientId = visit?.PatientId;
            string? gender = null;
            DateTime? dob = null;
            Guid? referrerId = null;
            string? referrerName = null;
            Guid? referralPartnerId = null;
            string? referralPartnerName = null;
            string? referralPartnerLocation = null;

            if (patientId.HasValue)
            {
                var patient = await _context.Patients.FindAsync(patientId.Value);
                gender = patient?.Gender;
                dob = patient?.DateOfBirth;
            }

            if (visit != null)
            {
                referrerId = visit.ReferrerId;
                if (referrerId.HasValue)
                {
                    var referrer = await _context.Referrers.FindAsync(referrerId.Value);
                    referrerName = referrer?.ProviderName ?? visit.ReferrerText;
                }

                referralPartnerId = visit.ReferralPartnerId;
                if (referralPartnerId.HasValue)
                {
                    var partner = await _context.ReferralPartners.FindAsync(referralPartnerId.Value);
                    referralPartnerName = partner?.Name;
                    referralPartnerLocation = partner?.Location;
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
                visit?.BranchId ?? _userContext.CurrentBranchId,
                gender,
                dob,
                referrerId,
                referrerName,
                referralPartnerId,
                referralPartnerName,
                referralPartnerLocation,
                null, // PatientLocation
                null, // PatientPincode
                patientId // PatientId
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
