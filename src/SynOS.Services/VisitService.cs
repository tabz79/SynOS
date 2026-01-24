using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using Microsoft.Extensions.Logging;
using SynOS.Services.Utils;
using SynOS.Models.Enums;
using SynOS.Services.Operational;
using SynOS.Services.Security;
using SynOS.Models.Entities.Discounts;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.Entities.AR;
using SynOS.Models.Entities.Referral;
using SynOS.Services.Referral;
using SynOS.Services.Revenue; // ADDED

namespace SynOS.Services
{
    public class VisitService : IVisitService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<VisitService> _logger;
        private readonly ITestsCacheService _testsCacheService;
        private readonly IAuditService _auditService;
        private readonly IOperationalEventWriter _operationalEventWriter;
        private readonly IUserContext _userContext;
        private readonly IReferralFinancialService _referralFinancialService;
        private readonly IRevenueFactWriter _revenueFactWriter; // ADDED

        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; 

        public VisitService(
            SynOSDbContext context, 
            ILogger<VisitService> logger, 
            ITestsCacheService testsCacheService, 
            IAuditService auditService,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext,
            IReferralFinancialService referralFinancialService,
            IRevenueFactWriter revenueFactWriter) // ADDED
        {
            _context = context;
            _logger = logger;
            _testsCacheService = testsCacheService;
            _auditService = auditService;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _referralFinancialService = referralFinancialService ?? throw new ArgumentNullException(nameof(referralFinancialService));
            _revenueFactWriter = revenueFactWriter ?? throw new ArgumentNullException(nameof(revenueFactWriter)); // ADDED
        }

        public async Task<VisitTokenPrintDto> GetVisitTokenForPrintingAsync(Guid visitId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit with ID {visitId} not found.");

            var payload = EscPosGenerator.GenerateTokenSlip(visit);

            return new VisitTokenPrintDto
            {
                Token = visit.Token,
                Patient = new PatientPrintDto
                {
                    Name = $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                    Mrn = visit.Patient.MRN
                },
                Dept = visit.Department,
                Time = visit.CreatedAt,
                PrintPayload = payload
            };
        }

        public async Task<Visit> CreateVisitAsync(VisitCreateDto visitDto, string? idempotencyKey = null, Guid actorUserId = default)
        {
            var patient = await _context.Patients.FindAsync(visitDto.PatientId);
            if (patient == null || patient.IsSoftDeleted)
            {
                throw new KeyNotFoundException($"Patient with ID {visitDto.PatientId} not found or is inactive.");
            }

            var labLocalToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var token = await GenerateDailyTokenAsync(visitDto.Department, labLocalToday, actorUserId);

            if (visitDto.ReferralPartnerId.HasValue)
            {
                var partner = await _context.ReferralPartners
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ReferralPartnerId == visitDto.ReferralPartnerId.Value);

                if (partner == null) throw new KeyNotFoundException($"Referral partner with ID {visitDto.ReferralPartnerId} not found.");
                if (!partner.IsActive) throw new InvalidOperationException($"Referral partner '{partner.Name}' is inactive.");
            }

            var visit = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = visitDto.PatientId,
                BranchId = _userContext.CurrentBranchId,
                Token = token,
                TokenDate = labLocalToday,
                Department = visitDto.Department,
                Status = "PendingPayment",
                CreatedAt = DateTime.UtcNow,
                IsReferred = visitDto.IsReferred ?? false,
                ReferralPartnerId = visitDto.ReferralPartnerId,
                PaymentCollectionModel = visitDto.PaymentCollectionModel,
                ReferrerText = visitDto.ReferrerText
            };

            _context.Visits.Add(visit);

            decimal grossAmount = 0;
            var orders = new List<Order>();

            foreach (var testCode in visitDto.TestCodes)
            {
                var resolvedTest = await ResolveTestForReceptionAsync(testCode, visitDto.Department);
                if (resolvedTest == null) throw new KeyNotFoundException($"Test '{testCode}' not found.");
                
                var order = new Order
                {
                    OrderId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    TestId = resolvedTest.TestId,
                    TestCode = resolvedTest.TestCode,
                    Department = resolvedTest.Department,
                    Status = "Pending",
                    Price = resolvedTest.BasePrice,
                    Discount = 0,
                    CreatedAt = DateTime.UtcNow
                };
                orders.Add(order);
                grossAmount += resolvedTest.BasePrice;
            }
            _context.Orders.AddRange(orders);

            decimal discountAmount = 0;
            DiscountMaster? appliedDiscount = null;

            if (!string.IsNullOrEmpty(visitDto.DiscountCode))
            {
                appliedDiscount = await _context.DiscountMasters
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.Code == visitDto.DiscountCode);

                if (appliedDiscount == null) throw new KeyNotFoundException($"Discount code '{visitDto.DiscountCode}' not found.");
                if (!appliedDiscount.IsActive) throw new InvalidOperationException($"Discount '{visitDto.DiscountCode}' is inactive.");

                var now = DateTime.UtcNow;
                if (appliedDiscount.EffectiveFrom.HasValue && appliedDiscount.EffectiveFrom > now)
                     throw new InvalidOperationException($"Discount '{visitDto.DiscountCode}' is not yet effective.");
                if (appliedDiscount.EffectiveTo.HasValue && appliedDiscount.EffectiveTo < now)
                     throw new InvalidOperationException($"Discount '{visitDto.DiscountCode}' has expired.");

                if (appliedDiscount.Type == DiscountType.Percentage)
                    discountAmount = grossAmount * (appliedDiscount.Value / 100m);
                else
                    discountAmount = appliedDiscount.Value;

                if (appliedDiscount.MaxLimit.HasValue && discountAmount > appliedDiscount.MaxLimit.Value)
                    discountAmount = appliedDiscount.MaxLimit.Value;
                
                if (discountAmount > grossAmount) discountAmount = grossAmount;
            }

            decimal netAmount = grossAmount - discountAmount;
            decimal taxAmount = CalculateTax_TEMP(netAmount);
            decimal totalAmount = netAmount + taxAmount;

            var invoice = new Invoice
            {
                InvoiceId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                GrossAmount = grossAmount,
                DiscountAmount = discountAmount,
                NetAmount = netAmount,
                TaxAmount = taxAmount,
                Total = totalAmount,
                Currency = "INR",
                Status = "PendingPayment",
                DueDate = labLocalToday.AddDays(7),
                CreatedAt = DateTime.UtcNow
            };
            _context.Invoices.Add(invoice);

            if (appliedDiscount != null)
            {
                var discountFact = new DiscountFact
                {
                    DiscountFactId = Guid.NewGuid(),
                    InvoiceId = invoice.InvoiceId,
                    DiscountDefinitionId = appliedDiscount.DiscountDefinitionId,
                    GrossAmount = grossAmount,
                    DiscountAmount = discountAmount,
                    NetAmountAfterDiscount = netAmount,
                    AppliedBy = actorUserId.ToString(),
                    AppliedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                _context.DiscountFacts.Add(discountFact);
            }

            Payment? flowBPayment = null;
            if (visit.PaymentCollectionModel == "PartnerCollects" && visit.ReferralPartnerId.HasValue)
            {
                flowBPayment = new Payment
                {
                    PaymentId = Guid.NewGuid(),
                    InvoiceId = invoice.InvoiceId,
                    Amount = invoice.Total,
                    Method = "PartnerAccount",
                    ReceiptNo = $"SYS-{visit.Token}",
                    ReceivedAt = DateTime.UtcNow,
                    ReceivedByUserId = actorUserId
                };
                _context.Payments.Add(flowBPayment);
                invoice.Status = "Paid";

                var receivable = new ReceivableFact
                {
                    ReceivableFactId = Guid.NewGuid(),
                    SourceVisitId = visit.VisitId,
                    ReferralPartnerId = visit.ReferralPartnerId.Value,
                    Amount = invoice.Total,
                    Currency = invoice.Currency,
                    OccurredAt = DateTimeOffset.UtcNow,
                    RecordedAt = DateTimeOffset.UtcNow
                };
                _context.ReceivableFacts.Add(receivable);

                // EMIT REVENUE FACT (Truth Engine) - Prepaid
                await _revenueFactWriter.DeclareRevenueFactAsync(new SynOS.Models.DTOs.Revenue.DeclareRevenueFactCommand
                {
                    OccurredAt = DateTimeOffset.UtcNow,
                    Amount = invoice.Total,
                    Currency = invoice.Currency,
                    Direction = RevenueDirection.Inflow,
                    SourceType = RevenueSourceType.Other, // Partner
                    SourceReferenceId = visit.ReferralPartnerId.Value.ToString(),
                    PaymentMode = PaymentMode.Other, // PartnerAccount
                    DeclaredByUserId = actorUserId,
                    Notes = $"Prepaid Visit {visit.Token}",
                    ExternalTransactionId = $"SYS-{visit.Token}"
                });
            }

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(actorUserId, "CreateVisit", "Visit", visit.VisitId, visitDto);

            if (visit.PaymentCollectionModel == "PartnerCollects")
            {
                await MarkVisitAsPrepaidAsync(visit.VisitId, actorUserId);
            }

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.BILL_GENERATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Bill generated for {invoice.Total:F2}",
                "User",
                actorUserId.ToString()
            );

            if (flowBPayment != null)
            {
                await _operationalEventWriter.WriteEventAsync(
                    BranchEventType.PAYMENT_RECEIVED,
                    _userContext.CurrentBranchId.ToString(),
                    visit.VisitId.ToString(),
                    visit.Token,
                    $"Paid via Partner Account (System)",
                    "System",
                    "System",
                    true,
                    flowBPayment.PaymentId,
                    "Payment"
                );

                if (visit.IsReferred)
                {
                    await _referralFinancialService.ProcessCommissionRecognitionAsync(visit);
                }
            }

            return visit;
        }

        public async Task<Visit> AddTestToVisitAsync(Guid visitId, string testCode, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            
            if (visit.Status == "Paid" || visit.Status == "Cancelled") 
                throw new InvalidOperationException($"Cannot add test to visit in status '{visit.Status}'.");

            if (visit.Orders.Any(o => o.TestCode.Equals(testCode, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Test '{testCode}' is already added.");

            var resolvedTest = await ResolveTestForReceptionAsync(testCode, visit.Department);
            if (resolvedTest == null) throw new KeyNotFoundException($"Test '{testCode}' not found.");

            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                TestId = resolvedTest.TestId,
                TestCode = resolvedTest.TestCode,
                Department = resolvedTest.Department,
                Status = "Pending",
                Price = resolvedTest.BasePrice,
                Discount = 0,
                CreatedAt = DateTime.UtcNow
            };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            await RecalculateFinancialsAsync(visitId, actorUserId, visit);

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Added test {testCode}",
                "User",
                actorUserId.ToString()
            );

            return visit;
        }

        public async Task<Visit> RemoveTestFromVisitAsync(Guid visitId, string testCode, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            
            if (visit.Status == "Paid" || visit.Status == "Cancelled")
                throw new InvalidOperationException($"Cannot remove test from visit in status '{visit.Status}'.");

            var order = visit.Orders.FirstOrDefault(o => o.TestCode.Equals(testCode, StringComparison.OrdinalIgnoreCase));
            if (order == null) throw new KeyNotFoundException($"Test '{testCode}' not found.");

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            await RecalculateFinancialsAsync(visitId, actorUserId, visit);

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Removed test {testCode}",
                "User",
                actorUserId.ToString()
            );

            return visit;
        }

        public async Task RemoveDiscountFromVisitAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            if (visit.Status == "Paid" || visit.Status == "Cancelled")
                throw new InvalidOperationException($"Cannot modify visit in status '{visit.Status}'.");

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice != null)
            {
                var discountFact = await _context.DiscountFacts
                    .Where(df => df.InvoiceId == invoice.InvoiceId)
                    .OrderByDescending(df => df.AppliedAt)
                    .FirstOrDefaultAsync();

                if (discountFact != null)
                {
                    _context.DiscountFacts.Remove(discountFact);
                    await _context.SaveChangesAsync();
                }
            }

            await RecalculateFinancialsAsync(visitId, actorUserId, visit);

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                "Discount removed",
                "User",
                actorUserId.ToString()
            );
        }

        public async Task ApplyDiscountToVisitAsync(Guid visitId, Guid discountMasterId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            if (visit.Status == "Paid" || visit.Status == "Cancelled")
                throw new InvalidOperationException($"Cannot modify visit in status '{visit.Status}'.");

            var discountMaster = await _context.DiscountMasters.FindAsync(discountMasterId);
            if (discountMaster == null) throw new KeyNotFoundException($"Discount strategy {discountMasterId} not found.");
            if (!discountMaster.IsActive) throw new InvalidOperationException($"Discount strategy '{discountMaster.Code}' is inactive.");

            var now = DateTime.UtcNow;
            if (discountMaster.EffectiveFrom.HasValue && discountMaster.EffectiveFrom > now)
                throw new InvalidOperationException($"Discount '{discountMaster.Code}' is not yet effective.");
            if (discountMaster.EffectiveTo.HasValue && discountMaster.EffectiveTo < now)
                throw new InvalidOperationException($"Discount '{discountMaster.Code}' has expired.");

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) throw new InvalidOperationException("No invoice found for this visit.");

            var existingFact = await _context.DiscountFacts
                .Where(df => df.InvoiceId == invoice.InvoiceId)
                .OrderByDescending(df => df.AppliedAt)
                .FirstOrDefaultAsync();

            if (existingFact != null)
            {
                existingFact.DiscountDefinitionId = discountMasterId;
                existingFact.AppliedBy = actorUserId.ToString();
                existingFact.AppliedAt = DateTime.UtcNow;
                _context.DiscountFacts.Update(existingFact);
            }
            else
            {
                var newFact = new DiscountFact
                {
                    DiscountFactId = Guid.NewGuid(),
                    InvoiceId = invoice.InvoiceId,
                    DiscountDefinitionId = discountMasterId,
                    AppliedBy = actorUserId.ToString(),
                    AppliedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    GrossAmount = 0,
                    DiscountAmount = 0,
                    NetAmountAfterDiscount = 0
                };
                _context.DiscountFacts.Add(newFact);
            }

            await _context.SaveChangesAsync();

            await RecalculateFinancialsAsync(visitId, actorUserId, visit);

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Discount {discountMaster.Code} applied",
                "User",
                actorUserId.ToString()
            );
        }

        public async Task RemoveVisitReferralAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            
            if (visit.Status == "Paid" || visit.Status == "Cancelled")
            {
                bool isFlowA = visit.PaymentCollectionModel == "PartnerCollects" && visit.ReferralPartnerId.HasValue;
                bool isSystemPaidOnly = false;
                
                var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                if (isFlowA && invoice != null)
                {
                    isSystemPaidOnly = invoice.Payments.All(p => p.Method == "PartnerAccount");
                    
                    if (isSystemPaidOnly)
                    {
                        _context.Payments.RemoveRange(invoice.Payments);
                        
                        var receivables = await _context.ReceivableFacts
                            .Where(r => r.SourceVisitId == visit.VisitId)
                            .ToListAsync();
                        _context.ReceivableFacts.RemoveRange(receivables);

                        invoice.Status = "PendingPayment";
                        visit.Status = "PendingPayment";
                    }
                }

                if (!isSystemPaidOnly && visit.Status != "PendingPayment") 
                {
                    throw new InvalidOperationException($"Cannot remove referral from visit in status '{visit.Status}' (Payments exist).");
                }
            }

            visit.ReferralPartnerId = null;
            visit.IsReferred = false;
            visit.PaymentCollectionModel = "LabCollects";

            await _context.SaveChangesAsync();

            await RecalculateFinancialsAsync(visitId, actorUserId, visit);

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                "Referral removed",
                "User",
                actorUserId.ToString()
            );
        }

        public async Task SetVisitReferralAsync(Guid visitId, Guid referralPartnerId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            
            if (visit.Status == "Paid" || visit.Status == "Cancelled")
                throw new InvalidOperationException($"Cannot update referral on visit in status '{visit.Status}'.");

            var partner = await _context.ReferralPartners
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ReferralPartnerId == referralPartnerId);

            if (partner == null) throw new KeyNotFoundException($"Referral Partner {referralPartnerId} not found.");
            if (!partner.IsActive) throw new InvalidOperationException($"Referral Partner '{partner.Name}' is not active.");

            visit.ReferralPartnerId = referralPartnerId;
            visit.IsReferred = true;

            await _context.SaveChangesAsync(); 

            await RecalculateFinancialsAsync(visitId, actorUserId, visit);

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Referral updated to {partner.Name}",
                "User",
                actorUserId.ToString()
            );
        }

        public async Task UpdateVisitReferrerTextAsync(Guid visitId, string? referrerText, Guid actorUserId)
        {
            var visit = await _context.Visits.FirstOrDefaultAsync(v => v.VisitId == visitId);
            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (visit.Status == "Paid" || visit.Status == "Cancelled")
                throw new InvalidOperationException($"Cannot update referrer text on visit in status '{visit.Status}'.");

            var normalizedText = referrerText?.Trim();
            if (string.IsNullOrEmpty(normalizedText)) normalizedText = null;

            if (normalizedText != null && normalizedText.Length > 500)
                normalizedText = normalizedText.Substring(0, 500);

            visit.ReferrerText = normalizedText;

            await _context.SaveChangesAsync();

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                "Referrer text updated",
                "User",
                actorUserId.ToString()
            );
        }

        public async Task MarkVisitAsPrepaidAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (visit.Status == "Cancelled") throw new InvalidOperationException("Cannot mark cancelled visit as prepaid.");
            if (visit.Status == "Paid") return;

            visit.PaymentCollectionModel = "PartnerCollects";
            visit.Status = "Paid";

            await _context.SaveChangesAsync();

            await RecalculateFinancialsAsync(visitId, actorUserId, visit);

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                "Visit stamped as PAID (Prepaid)",
                "User",
                actorUserId.ToString()
            );
        }

        private async Task RecalculateFinancialsAsync(Guid visitId, Guid actorUserId, Visit? existingTrackedVisit = null)
        {
            Visit? visit = existingTrackedVisit;
            if (visit == null)
            {
                visit = await _context.Visits
                    .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                    .Include(v => v.Orders)
                    .FirstOrDefaultAsync(v => v.VisitId == visitId);
            }

            if (visit == null) return;

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) return;

            decimal grossAmount = visit.Orders.Sum(o => o.Price);
            decimal discountAmount = 0;
            
            var discountFact = await _context.DiscountFacts
                .Where(df => df.InvoiceId == invoice.InvoiceId)
                .OrderByDescending(df => df.AppliedAt)
                .FirstOrDefaultAsync();

            if (discountFact != null)
            {
                var master = await _context.DiscountMasters.FindAsync(discountFact.DiscountDefinitionId);
                if (master != null && master.IsActive)
                {
                    if (master.Type == DiscountType.Percentage)
                        discountAmount = grossAmount * (master.Value / 100m);
                    else
                        discountAmount = master.Value;

                    if (master.MaxLimit.HasValue && discountAmount > master.MaxLimit.Value)
                        discountAmount = master.MaxLimit.Value;

                    if (discountAmount > grossAmount) discountAmount = grossAmount;

                    discountFact.GrossAmount = grossAmount;
                    discountFact.DiscountAmount = discountAmount;
                    discountFact.NetAmountAfterDiscount = grossAmount - discountAmount;
                    _context.DiscountFacts.Update(discountFact);
                }
            }

            decimal netAmount = grossAmount - discountAmount;
            decimal taxAmount = CalculateTax_TEMP(netAmount);
            decimal totalAmount = netAmount + taxAmount;

            invoice.GrossAmount = grossAmount;
            invoice.DiscountAmount = discountAmount;
            invoice.NetAmount = netAmount;
            invoice.TaxAmount = taxAmount;
            invoice.Total = totalAmount;

            if (visit.PaymentCollectionModel == "PartnerCollects" && visit.ReferralPartnerId.HasValue)
            {
                decimal totalPaid = invoice.Payments.Sum(p => p.Amount);
                decimal diff = totalAmount - totalPaid;

                if (diff > 0)
                {
                    var payment = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        Amount = diff,
                        Method = "PartnerAccount",
                        ReceiptNo = $"SYS-ADJ-{Guid.NewGuid().ToString().Substring(0,4)}",
                        ReceivedAt = DateTime.UtcNow,
                        ReceivedByUserId = actorUserId
                    };
                    _context.Payments.Add(payment);
                    invoice.Status = "Paid";

                    var receivable = new ReceivableFact
                    {
                        ReceivableFactId = Guid.NewGuid(),
                        SourceVisitId = visit.VisitId,
                        ReferralPartnerId = visit.ReferralPartnerId.Value,
                        Amount = diff,
                        Currency = invoice.Currency,
                        OccurredAt = DateTimeOffset.UtcNow,
                        RecordedAt = DateTimeOffset.UtcNow
                    };
                    _context.ReceivableFacts.Add(receivable);

                    // EMIT REVENUE FACT (Truth Engine) - Prepaid Adjustment
                    await _revenueFactWriter.DeclareRevenueFactAsync(new SynOS.Models.DTOs.Revenue.DeclareRevenueFactCommand
                    {
                        OccurredAt = DateTimeOffset.UtcNow,
                        Amount = diff,
                        Currency = invoice.Currency,
                        Direction = RevenueDirection.Inflow,
                        SourceType = RevenueSourceType.Other, // Partner
                        SourceReferenceId = visit.ReferralPartnerId.Value.ToString(),
                        PaymentMode = PaymentMode.Other, // PartnerAccount
                        DeclaredByUserId = actorUserId,
                        Notes = $"Prepaid Adjustment {visit.Token}",
                        ExternalTransactionId = payment.ReceiptNo
                    });
                }
            }
            else
            {
                decimal totalPaid = invoice.Payments.Sum(p => p.Amount);
                if (totalPaid >= totalAmount && totalAmount > 0)
                    invoice.Status = "Paid";
                else
                    invoice.Status = "PendingPayment";
            }

            decimal finalPaid = invoice.Payments.Sum(p => p.Amount) + _context.ChangeTracker.Entries<Payment>().Where(e => e.State == EntityState.Added).Sum(e => e.Entity.Amount);
            bool isFullyPaid = finalPaid >= totalAmount && totalAmount > 0;

            if (isFullyPaid && visit.IsReferred)
            {
                await _referralFinancialService.ProcessCommissionRecognitionAsync(visit);
            }
            
            await _context.SaveChangesAsync();
        }

        private decimal CalculateTax_TEMP(decimal netAmount)
        {
            return netAmount * 0.05m;
        }

        public async Task<Visit?> GetVisitDetailsAsync(Guid visitId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.Payments)
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.PartialPayments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit != null && visit.BranchId.HasValue && visit.BranchId != _userContext.CurrentBranchId)
            {
                throw new UnauthorizedAccessException("Access to this visit is restricted to its originating branch.");
            }

            return visit;
        }

        public async Task<IEnumerable<Visit>> GetVisitsAsync(string department, string status, int limit)
        {
            return await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.Invoices)
                .Where(v => v.Department == department && v.Status == status)
                .OrderByDescending(v => v.CreatedAt)
                .Take(limit)
                .ToListAsync();
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

            if (visit.Status == "Cancelled") throw new InvalidOperationException("Visit is already cancelled.");

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

            var invoice = visit.Invoices.FirstOrDefault();
            if (invoice != null)
            {
                invoice.Status = "Cancelled";
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
                }
            }

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(cancelDto.CancelledByUserId, "CancelVisit", "Visit", visitId, cancellation);
            return cancellation;
        }

        private async Task<string> GenerateDailyTokenAsync(string department, DateTime labLocalDay, Guid actorUserId)
        {
            string deptLetter = department switch
            {
                "Pathology" => "P",
                "Radiology" => "X",
                _ => "U"
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
                    SeriesLetter = "A",
                    LastNumber = 0,
                    MaxPerSeries = 999,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.TokenCounters.Add(tokenCounter);
            }
            else
            {
                _context.Entry(tokenCounter).Reload();
            }

            tokenCounter.LastNumber++;
            tokenCounter.UpdatedAt = DateTime.UtcNow;

            if (tokenCounter.LastNumber > tokenCounter.MaxPerSeries)
            {
                if (tokenCounter.SeriesLetter[0] < 'Z')
                {
                    tokenCounter.SeriesLetter = ((char)(tokenCounter.SeriesLetter[0] + 1)).ToString();
                    tokenCounter.LastNumber = 1;
                }
                else
                {
                    throw new InvalidOperationException($"Token space exhausted for {department} today. Please contact admin.");
                }
            }

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(actorUserId, "TokenGenerated", "TokenCounter", tokenCounter.CounterId, tokenCounter);

            return $"{tokenCounter.SeriesLetter}{deptLetter}-{tokenCounter.LastNumber:D3}";
        }
        
        private class ResolvedTestDto
        {
            public Guid TestId { get; set; }
            public string TestCode { get; set; }
            public string TestName { get; set; }
            public string Department { get; set; }
            public decimal BasePrice { get; set; }
            public Guid? PriceConfigId { get; set; }
        }

        private async Task<ResolvedTestDto?> ResolveTestForReceptionAsync(string testCode, string dept)
        {
            var normalized = testCode?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(normalized)) return null;

            var allTests = await _testsCacheService.GetCachedTestsAsync();

            var test = allTests
                .FirstOrDefault(t => t.TestCode.ToUpper() == normalized
                            && t.IsActive
                            && (string.IsNullOrEmpty(dept) || t.Department == dept));

            if (test == null) return null;
            if (test.BasePrice <= 0) return null;

            var now = DateTime.UtcNow;
            
            var priceConfig = test.PriceConfigs?
                .Where(p => p.IsActive
                            && p.EffectiveFrom <= now
                            && (p.EffectiveTo == null || p.EffectiveTo >= now))
                .OrderByDescending(p => p.EffectiveFrom)
                .FirstOrDefault();

            return new ResolvedTestDto
            {
                TestId = test.TestId,
                TestCode = test.TestCode,
                TestName = test.TestName,
                Department = test.Department,
                BasePrice = test.BasePrice,
                PriceConfigId = priceConfig?.PriceId
            };
        }
    }
}
