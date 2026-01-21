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
using SynOS.Models.Enums; // Required for TubeType
using SynOS.Services.Operational; // ADDED
using SynOS.Services.Security; // ADDED
using SynOS.Models.Entities.Discounts; // ADDED
using SynOS.Models.Entities.Revenue; // ADDED
using SynOS.Models.Entities.Referral; // ADDED
using SynOS.Services.Referral; // ADDED

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
        private readonly IReferralFinancialService _referralFinancialService; // ADDED

        // TODO: Configure lab timezone in appsettings or a dedicated config service
        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; 

        public VisitService(
            SynOSDbContext context, 
            ILogger<VisitService> logger, 
            ITestsCacheService testsCacheService, 
            IAuditService auditService,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext,
            IReferralFinancialService referralFinancialService) // ADDED
        {
            _context = context;
            _logger = logger;
            _testsCacheService = testsCacheService;
            _auditService = auditService;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _referralFinancialService = referralFinancialService ?? throw new ArgumentNullException(nameof(referralFinancialService));
        }

        // ... [GetVisitTokenForPrintingAsync remains same] ...

        public async Task<VisitTokenPrintDto> GetVisitTokenForPrintingAsync(Guid visitId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null)
            {
                throw new KeyNotFoundException($"Visit with ID {visitId} not found.");
            }

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
            // ... [Keep CreateVisitAsync logic mostly as is, effectively bootstrapping the state] ...
            // Ideally, we'd call Recalculate here too, but to minimize risk as per instructions, 
            // we will leave the bootstrap logic and only use Kernel for mutations.
            // However, we MUST ensure Flow A commission logic is triggered if we auto-pay here.
            // The prompt said "Do NOT refactor CreateVisitAsync right now". 
            // BUT it also said "Ensure Flow A auto-adjusts... Commission recognition is required".
            // If CreateVisit sets status to Paid, we SHOULD trigger commission.
            // I will add the Commission Trigger call at the end of CreateVisit.

            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                _logger.LogInformation("Idempotency key received for CreateVisit: {IdempotencyKey}", idempotencyKey);
            }

            var patient = await _context.Patients.FindAsync(visitDto.PatientId);
            if (patient == null || patient.IsSoftDeleted)
            {
                throw new KeyNotFoundException($"Patient with ID {visitDto.PatientId} not found or is inactive.");
            }

            var labLocalToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var token = await GenerateDailyTokenAsync(visitDto.Department, labLocalToday, actorUserId);

            // PHASE 4.5: Validate Referral Partner
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
                PaymentCollectionModel = visitDto.PaymentCollectionModel
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

            // Discount Logic (Bootstrap)
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

            // Calculate Tax (Bootstrap using Helper)
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

                await _operationalEventWriter.WriteEventAsync(
                    BranchEventType.DISCOUNT_APPLIED,
                    _userContext.CurrentBranchId.ToString(),
                    visit.VisitId.ToString(),
                    visit.Token,
                    $"Discount {appliedDiscount.Code} applied: {discountAmount:F2}",
                    "User",
                    actorUserId.ToString(),
                    false, 
                    discountFact.DiscountFactId,
                    "DiscountFact"
                );
            }

            // FLOW B: Partner Collects
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
                    ReceivedByUserId = Guid.Empty
                };
                _context.Payments.Add(flowBPayment);

                invoice.Status = "Paid";
                visit.Status = "Paid";

                var receivable = new SynOS.Models.Entities.AR.ReceivableFact
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
            }

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(actorUserId, "CreateVisit", "Visit", visit.VisitId, visitDto);

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

                // FIX: Trigger commission for Flow A immediately
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
                .Include(v => v.Invoices)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            
            // Allow Paid/Cancelled only for internal reconciliation via Recalculate, 
            // but AddTest is a mutation of Orders, so we MUST block it if Paid/Cancelled.
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
            await _context.SaveChangesAsync(); // Save Order first

            // Call Kernel
            await RecalculateFinancialsAsync(visitId, actorUserId);

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
                .Include(v => v.Invoices)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            
            // Mutating orders blocked if Paid/Cancelled
            if (visit.Status == "Paid" || visit.Status == "Cancelled")
                throw new InvalidOperationException($"Cannot remove test from visit in status '{visit.Status}'.");

            var order = visit.Orders.FirstOrDefault(o => o.TestCode.Equals(testCode, StringComparison.OrdinalIgnoreCase));
            if (order == null) throw new KeyNotFoundException($"Test '{testCode}' not found.");

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            // Call Kernel
            await RecalculateFinancialsAsync(visitId, actorUserId);

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
                .Include(v => v.Invoices)
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

            // Call Kernel to re-apply zero discount
            await RecalculateFinancialsAsync(visitId, actorUserId);

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
                .Include(v => v.Invoices)
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

            // Exclusivity: Update existing or create new
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
                    // Totals will be set by Kernel
                    GrossAmount = 0,
                    DiscountAmount = 0,
                    NetAmountAfterDiscount = 0
                };
                _context.DiscountFacts.Add(newFact);
            }

            await _context.SaveChangesAsync();

            // Call Kernel
            await RecalculateFinancialsAsync(visitId, actorUserId);

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
            
            // Editable check with Flow A Unwind Logic
            if (visit.Status == "Paid" || visit.Status == "Cancelled")
            {
                // Unwind Logic for Flow A (PartnerCollects)
                bool isFlowA = visit.PaymentCollectionModel == "PartnerCollects" && visit.ReferralPartnerId.HasValue;
                bool isSystemPaidOnly = false;
                
                var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                if (isFlowA && invoice != null)
                {
                    // Check if payments are purely system/partner account
                    isSystemPaidOnly = invoice.Payments.All(p => p.Method == "PartnerAccount");
                    
                    if (isSystemPaidOnly)
                    {
                        // Safe to unwind
                        _context.Payments.RemoveRange(invoice.Payments);
                        
                        // Also cleanup Receivables
                        var receivables = await _context.ReceivableFacts
                            .Where(r => r.SourceVisitId == visit.VisitId)
                            .ToListAsync();
                        _context.ReceivableFacts.RemoveRange(receivables);

                        // Reset Status
                        invoice.Status = "PendingPayment";
                        visit.Status = "PendingPayment";
                        
                        _logger.LogInformation("Unwound Flow A payments for Visit {VisitId} to allow referral removal.", visit.VisitId);
                    }
                }

                if (!isSystemPaidOnly && visit.Status != "PendingPayment") // Double check status in case we just reset it
                {
                    throw new InvalidOperationException($"Cannot remove referral from visit in status '{visit.Status}' (Payments exist).");
                }
            }

            // Mutate
            visit.ReferralPartnerId = null;
            visit.IsReferred = false;
            visit.PaymentCollectionModel = "LabCollects"; // Reset to default

            await _context.SaveChangesAsync();

            // Kernel Delegation
            await RecalculateFinancialsAsync(visitId, actorUserId);

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
                .Include(v => v.Invoices)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            
            // Editable check
            if (visit.Status == "Paid" || visit.Status == "Cancelled")
                throw new InvalidOperationException($"Cannot update referral on visit in status '{visit.Status}'.");

            var partner = await _context.ReferralPartners
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ReferralPartnerId == referralPartnerId);

            if (partner == null) throw new KeyNotFoundException($"Referral Partner {referralPartnerId} not found.");
            if (!partner.IsActive) throw new InvalidOperationException($"Referral Partner '{partner.Name}' is not active.");

            // Mutate & Normalize
            visit.ReferralPartnerId = referralPartnerId;
            visit.IsReferred = true;
            visit.PaymentCollectionModel = partner.PaymentCollectionModel; // CRITICAL: Sync to partner model

            await _context.SaveChangesAsync(); // Persist structure changes before kernel runs

            // Kernel Delegation
            await RecalculateFinancialsAsync(visitId, actorUserId);

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

        /// <summary>
        /// Centralized Revenue Kernel.
        /// Handles Gross, Discount, Tax, Net, Flow A Auto-Pay, and Commission Triggers.
        /// </summary>
        private async Task RecalculateFinancialsAsync(Guid visitId, Guid actorUserId)
        {
            // 1. Load Aggregate (Full)
            var visit = await _context.Visits
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Orders)
                // We might need DiscountFacts. No navigation prop on Invoice usually?
                // Query facts separately or assuming navigation exists. 
                // Invoice entity definition didn't show DiscountFacts nav prop in my read.
                // I will query them.
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) return; // Should not happen

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) return; // Should not happen

            // 2. Compute Gross
            decimal grossAmount = visit.Orders.Sum(o => o.Price);

            // 3. Apply Discount
            decimal discountAmount = 0;
            
            // Find active discount fact
            var discountFact = await _context.DiscountFacts
                .Where(df => df.InvoiceId == invoice.InvoiceId)
                .OrderByDescending(df => df.AppliedAt)
                .FirstOrDefaultAsync();

            if (discountFact != null)
            {
                var master = await _context.DiscountMasters.FindAsync(discountFact.DiscountDefinitionId);
                if (master != null && master.IsActive) // Re-evaluate eligibility? 
                {
                    // Basic re-calc based on type
                    if (master.Type == DiscountType.Percentage)
                    {
                        discountAmount = grossAmount * (master.Value / 100m);
                    }
                    else
                    {
                        discountAmount = master.Value;
                    }

                    // Max Limit Check
                    if (master.MaxLimit.HasValue && discountAmount > master.MaxLimit.Value)
                        discountAmount = master.MaxLimit.Value;

                    // Cap
                    if (discountAmount > grossAmount) discountAmount = grossAmount;

                    // Update Fact History (Update existing or add new? Usually update current snapshot)
                    discountFact.GrossAmount = grossAmount;
                    discountFact.DiscountAmount = discountAmount;
                    discountFact.NetAmountAfterDiscount = grossAmount - discountAmount;
                    _context.DiscountFacts.Update(discountFact);
                }
            }

            // 4. Compute Tax
            decimal netAmount = grossAmount - discountAmount;
            decimal taxAmount = CalculateTax_TEMP(netAmount);
            decimal totalAmount = netAmount + taxAmount;

            // Update Invoice
            invoice.GrossAmount = grossAmount;
            invoice.DiscountAmount = discountAmount;
            invoice.NetAmount = netAmount;
            invoice.TaxAmount = taxAmount;
            invoice.Total = totalAmount;

            // 5. Flow A: Partner Collects Auto-Adjustment
            if (visit.PaymentCollectionModel == "PartnerCollects" && visit.ReferralPartnerId.HasValue)
            {
                decimal totalPaid = invoice.Payments.Sum(p => p.Amount);
                decimal diff = totalAmount - totalPaid;

                if (diff > 0)
                {
                    // Underpaid -> System Payment
                    var payment = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        Amount = diff,
                        Method = "PartnerAccount",
                        ReceiptNo = $"SYS-ADJ-{Guid.NewGuid().ToString().Substring(0,4)}",
                        ReceivedAt = DateTime.UtcNow,
                        ReceivedByUserId = Guid.Empty
                    };
                    _context.Payments.Add(payment);
                    invoice.Status = "Paid";
                    // visit.Status = "Paid"; // REMOVED: Kernel must not mutate workflow authority

                    // Receivable Adjustment
                    var receivable = new SynOS.Models.Entities.AR.ReceivableFact
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
                }
                else if (diff < 0)
                {
                    // Overpaid -> We don't handle refunds automatically here yet, typically manual credit note.
                    // V1: Overpayments require manual credit note. No auto-refund.
                    _logger.LogWarning("Visit {VisitId} (PartnerCollects) has negative balance after recalculation. Manual refund needed.", visitId);
                }
            }
            else
            {
                // Normal Flow: Update Status
                decimal totalPaid = invoice.Payments.Sum(p => p.Amount);
                if (totalPaid >= totalAmount && totalAmount > 0)
                {
                    invoice.Status = "Paid";
                    // visit.Status = "Paid"; // REMOVED
                }
                else
                {
                    invoice.Status = "PendingPayment";
                    // visit.Status = "PendingPayment"; // REMOVED
                }
            }

            await _context.SaveChangesAsync();

            // 6. Commission & Referral Side Effects
            // Calculate intention locally
            decimal finalPaid = invoice.Payments.Sum(p => p.Amount) + _context.ChangeTracker.Entries<Payment>().Where(e => e.State == EntityState.Added).Sum(e => e.Entity.Amount);
            bool isFullyPaid = finalPaid >= totalAmount && totalAmount > 0;

            if (isFullyPaid && visit.IsReferred)
            {
                await _referralFinancialService.ProcessCommissionRecognitionAsync(visit);
            }
        }

        private decimal CalculateTax_TEMP(decimal netAmount)
        {
            // ⚠️ TEMPORARY TAX LOGIC
            // DO NOT add slabs or rules here.
            // This will be replaced by ITaxPolicyService.
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

            // Cross-Branch Security Guard
            if (visit != null && visit.BranchId.HasValue && visit.BranchId != _userContext.CurrentBranchId)
            {
                _logger.LogWarning("Cross-branch access attempt blocked. VisitId: {VisitId}, VisitBranch: {VisitBranch}, UserBranch: {UserBranch}", 
                    visitId, visit.BranchId, _userContext.CurrentBranchId);
                throw new UnauthorizedAccessException("Access to this visit is restricted to its originating branch.");
            }

            return visit;
        }

        public async Task<IEnumerable<Visit>> GetVisitsAsync(string department, string status, int limit)
        {
            return await _context.Visits
                .Include(v => v.Patient) // Include patient details for list display
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.Invoices) // Include invoices for status/amount
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
                    _logger.LogInformation("Credit note created for cancelled visit {VisitId} with total paid amount {TotalPaid}", visitId, totalPaid);
                }
            }

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(cancelDto.CancelledByUserId, "CancelVisit", "Visit", visitId, cancellation); // Audit visit cancellation
            return cancellation;
        }

        private async Task<string> GenerateDailyTokenAsync(string department, DateTime labLocalDay, Guid actorUserId)
        {
            // Map department name to a single letter code
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
                    _logger.LogError("Token space exhausted for department {Department} on {Day}.", department, labLocalDay.ToShortDateString());
                    throw new InvalidOperationException($"Token space exhausted for {department} today. Please contact admin.");
                }
            }

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(actorUserId, "TokenGenerated", "TokenCounter", tokenCounter.CounterId, tokenCounter);

            return $"{tokenCounter.SeriesLetter}{deptLetter}-{tokenCounter.LastNumber:D3}";
        }
        
        // Helper DTO for resolving tests
        private class ResolvedTestDto
        {
            public Guid TestId { get; set; }
            public string TestCode { get; set; }
            public string TestName { get; set; }
            public string Department { get; set; }
            public decimal BasePrice { get; set; }
            public Guid? PriceConfigId { get; set; } // Nullable, as PriceConfig is optional
        }

        private async Task<ResolvedTestDto?> ResolveTestForReceptionAsync(string testCode, string dept)
        {
            var normalized = testCode?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(normalized)) return null;

            // Get tests from cache (which includes PriceConfigs)
            var allTests = await _testsCacheService.GetCachedTestsAsync();

            // Look up test by code (case-insensitive) and department from cache
            var test = allTests
                .FirstOrDefault(t => t.TestCode.ToUpper() == normalized
                            && t.IsActive
                            && (string.IsNullOrEmpty(dept) || t.Department == dept));

            if (test == null) return null;

            // A test is valid if it has a BasePrice > 0. PriceConfig is optional.
            if (test.BasePrice <= 0) return null;

            var now = DateTime.UtcNow;
            
            // Optionally find an active price config
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
                PriceConfigId = priceConfig?.PriceId // Can be null
            };
        }
    }
}