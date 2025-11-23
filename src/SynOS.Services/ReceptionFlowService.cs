using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class ReceptionFlowService : IReceptionFlowService
    {
        private readonly SynOSDbContext _context;
        private readonly IVisitService _visitService;
        private readonly IInvoiceService _invoiceService;
        private readonly ILogger<ReceptionFlowService> _logger;

        public ReceptionFlowService(
            SynOSDbContext context,
            IVisitService visitService,
            IInvoiceService invoiceService,
            ILogger<ReceptionFlowService> logger)
        {
            _context = context;
            _visitService = visitService;
            _invoiceService = invoiceService;
            _logger = logger;
        }

        public async Task<ReceptionStartVisitResponse> StartVisitAsync(ReceptionStartVisitRequest request)
        {
            // Note: This orchestration should be wrapped in a transaction.
            // EF Core's SaveChangesAsync within a single DbContext instance handles this automatically.
            
            var visitDto = new VisitCreateDto
            {
                PatientId = request.PatientId,
                Department = request.Dept,
                TestCodes = request.TestCodes.ToList(), // Convert array to list
                ReferrerId = request.ReferrerId
                // Discounts and taxes are handled by VisitService internally for now.
                // A more advanced implementation would pass these through.
            };

            var visit = await _visitService.CreateVisitAsync(visitDto);
            var invoice = await _context.Invoices.FirstAsync(i => i.VisitId == visit.VisitId);
            var patient = await _context.Patients.FindAsync(visit.PatientId);

            return new ReceptionStartVisitResponse
            {
                VisitId = visit.VisitId,
                Token = visit.Token,
                TokenDate = visit.TokenDate,
                Dept = visit.Department,
                Status = visit.Status,
                PatientSummary = new PatientSummaryDto
                {
                    PatientId = patient.PatientId,
                    Mrn = patient.MRN,
                    Name = $"{patient.FirstName} {patient.LastName}",
                    Sex = patient.Gender,
                    Age = (int)((DateTime.Today - patient.DateOfBirth).TotalDays / 365.25)
                },
                Orders = await _context.Orders.Where(o => o.VisitId == visit.VisitId).Select(o => new OrderSummaryDto
                {
                    OrderId = o.OrderId,
                    TestCode = o.TestCode,
                    TestName = o.TestDefinition.Name,
                    Dept = o.Department,
                    Price = o.Price,
                    Discount = o.Discount
                }).ToListAsync(),
                Invoice = new InvoiceSummaryDto
                {
                    InvoiceId = invoice.InvoiceId,
                    GrossAmount = invoice.GrossAmount,
                    DiscountAmount = invoice.DiscountAmount,
                    NetAmount = invoice.NetAmount,
                    TaxAmount = invoice.TaxAmount,
                    Total = invoice.Total,
                    Status = invoice.Status
                },
                Flags = new VisitFlagsDto() // TODO: Implement same-day visit check
            };
        }

        public async Task<ReceptionCompletePaymentResponse> CompletePaymentAsync(ReceptionCompletePaymentRequest request, Guid userId)
        {
            var visit = await _visitService.GetVisitDetailsAsync(request.VisitId);
            if (visit?.Invoices == null || !visit.Invoices.Any())
            {
                throw new KeyNotFoundException($"Invoice not found for visit ID {request.VisitId}.");
            }
            var invoiceId = visit.Invoices.First().InvoiceId;

            var paymentDto = new PaymentRequestDto
            {
                Amount = request.Amount,
                Method = request.Method,
                ReceiptNo = request.ReceiptNo,
                ReceivedByUserId = userId
            };

            var payment = await _invoiceService.RecordPaymentAsync(invoiceId, paymentDto);
            
            var updatedInvoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstAsync(i => i.InvoiceId == invoiceId);
            
            var updatedVisit = await _context.Visits.FindAsync(visit.VisitId);

            return new ReceptionCompletePaymentResponse
            {
                VisitId = visit.VisitId,
                InvoiceId = updatedInvoice.InvoiceId,
                InvoiceStatus = updatedInvoice.Status,
                PaidAmount = updatedInvoice.Payments.Sum(p => p.Amount),
                PendingAmount = updatedInvoice.Total - updatedInvoice.Payments.Sum(p => p.Amount),
                LastPayment = new LastPaymentDto
                {
                    PaymentId = payment.PaymentId,
                    Amount = payment.Amount,
                    Method = payment.Method,
                    ReceiptNo = payment.ReceiptNo,
                    ReceivedAt = payment.ReceivedAt
                },
                VisitStatus = updatedVisit.Status
            };
        }

        public async Task<ReceptionVisitSummaryResponse> GetVisitSummaryAsync(Guid visitId)
        {
            var visit = await _visitService.GetVisitDetailsAsync(visitId);
            if (visit == null)
            {
                throw new KeyNotFoundException($"Visit with ID {visitId} not found.");
            }
            var invoice = visit.Invoices.First();

            return new ReceptionVisitSummaryResponse
            {
                VisitId = visit.VisitId,
                Token = visit.Token,
                TokenDate = visit.TokenDate,
                Dept = visit.Department,
                VisitStatus = visit.Status,
                Patient = new PatientSummaryDto 
                {
                    PatientId = visit.Patient.PatientId,
                    Mrn = visit.Patient.MRN,
                    Name = $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                    Sex = visit.Patient.Gender,
                    Age = (int)((DateTime.Today - visit.Patient.DateOfBirth).TotalDays / 365.25)
                },
                Orders = visit.Orders.Select(o => new OrderSummaryDto
                {
                    OrderId = o.OrderId,
                    TestCode = o.TestCode,
                    TestName = o.TestDefinition.Name,
                    Dept = o.Department,
                    Price = o.Price,
                    Discount = o.Discount
                }).ToList(),
                Invoice = new InvoiceSummaryDto
                {
                    InvoiceId = invoice.InvoiceId,
                    GrossAmount = invoice.GrossAmount,
                    DiscountAmount = invoice.DiscountAmount,
                    NetAmount = invoice.NetAmount,
                    TaxAmount = invoice.TaxAmount,
                    Total = invoice.Total,
                    Status = invoice.Status
                },
                Payments = visit.Invoices.SelectMany(i => i.Payments).Select(p => new LastPaymentDto
                {
                    PaymentId = p.PaymentId,
                    Amount = p.Amount,
                    Method = p.Method,
                    ReceiptNo = p.ReceiptNo,
                    ReceivedAt = p.ReceivedAt
                }).ToList(),
                Flags = new ReadinessFlagsDto
                {
                    CanPrintToken = visit.Status != "Cancelled",
                    CanCollectSamples = visit.Department == "Pathology" && invoice.Status == "Paid",
                    CanPerformScan = visit.Department == "Radiology" && invoice.Status == "Paid"
                }
            };
        }
    }
}
