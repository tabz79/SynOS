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
using SynOS.Models.Entities.Operations;
using SynOS.Services.Referral;
using SynOS.Services.Revenue;
using SynOS.Models.ReadModels;
using System.Text.Json;
using SynOS.Services.Time;
using SynOS.Models.Events;
using SynOS.Services.Inventory;

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
        private readonly IRevenueFactWriter _revenueFactWriter;
        private readonly IRevenueEngine _revenueEngine;
        private readonly IVisitLifecyclePolicy _lifecyclePolicy; // ADDED
        private readonly ILabTimeProvider _labTimeProvider; // ADDED
        private readonly IMiddlewareOutboxService _outboxService;
        private readonly IImsConsumptionService _consumptionService;

        public VisitService(
            SynOSDbContext context,
            ILogger<VisitService> logger,
            ITestsCacheService testsCacheService,
            IAuditService auditService,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext,
            IReferralFinancialService referralFinancialService,
            IRevenueFactWriter revenueFactWriter,
            IRevenueEngine revenueEngine,
            ILabTimeProvider labTimeProvider,
            IVisitLifecyclePolicy lifecyclePolicy,
            IMiddlewareOutboxService outboxService,
            IImsConsumptionService consumptionService) // ADDED
        {
            _context = context;
            _logger = logger;
            _testsCacheService = testsCacheService;
            _auditService = auditService;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _referralFinancialService = referralFinancialService ?? throw new ArgumentNullException(nameof(referralFinancialService));
            _revenueFactWriter = revenueFactWriter ?? throw new ArgumentNullException(nameof(revenueFactWriter));
            _revenueEngine = revenueEngine;
            _labTimeProvider = labTimeProvider; // ADDED
            _lifecyclePolicy = lifecyclePolicy; // ADDED
            _outboxService = outboxService ?? throw new ArgumentNullException(nameof(outboxService));
            _consumptionService = consumptionService;
        }

        public async Task<VisitTokenPrintDto> GetVisitTokenForPrintingAsync(Guid visitId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit with ID {visitId} not found.");

            WorkAssignment? assignment = null;
            if (visit.CurrentAssignmentId.HasValue)
            {
                assignment = await _context.WorkAssignments
                    .Include(a => a.AssignedResource)
                        .ThenInclude(r => r.User)
                    .FirstOrDefaultAsync(a => a.AssignmentId == visit.CurrentAssignmentId.Value);
            }

            var payload = EscPosGenerator.GenerateTokenSlip(visit, assignment);

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
                PrintPayload = payload,
                AssignedResource = assignment?.AssignedResource?.User?.Name,
                Station = assignment?.AssignedResource?.PhysicalStation
            };
        }

        public async Task<Visit> CreateVisitAsync(VisitCreateDto visitDto, string? idempotencyKey = null, Guid actorUserId = default)
        {
            var patient = await _context.Patients.FindAsync(visitDto.PatientId);
            if (patient == null || patient.IsSoftDeleted)
            {
                throw new KeyNotFoundException($"Patient with ID {visitDto.PatientId} not found or is inactive.");
            }

            var labLocalToday = _labTimeProvider.GetLabToday();
            var token = $"DRAFT-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

            if (visitDto.ReferralPartnerId.HasValue)
            {
                var partner = await _context.ReferralPartners
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ReferralPartnerId == visitDto.ReferralPartnerId.Value);

                if (partner == null) throw new KeyNotFoundException($"Referral partner with ID {visitDto.ReferralPartnerId} not found.");
                if (!partner.IsActive) throw new InvalidOperationException($"Referral partner '{partner.Name}' is inactive.");
            }

            Guid? validUserId = null;
            if (actorUserId != Guid.Empty && await _context.Users.AnyAsync(u => u.UserId == actorUserId))
            {
                validUserId = actorUserId;
            }

            var fallbackUserId = validUserId ?? await _context.Users.OrderBy(u => u.CreatedAt).Select(u => u.UserId).FirstOrDefaultAsync();

            var visit = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = visitDto.PatientId,
                BranchId = _userContext.CurrentBranchId,
                Token = token,
                TokenDate = labLocalToday,
                Department = visitDto.Department,
                Status = VisitStatus.Draft,
                CreatedAt = DateTime.UtcNow,
                IsReferred = visitDto.IsReferred ?? false,
                ReferralPartnerId = visitDto.ReferralPartnerId,
                ReferrerId = visitDto.ReferrerId,
                PaymentCollectionModel = visitDto.PaymentCollectionModel,
                ReferrerText = visitDto.ReferrerText,
                CreatedByUserId = validUserId ?? fallbackUserId,
                AssignedReceptionistId = validUserId ?? fallbackUserId
            };

            _context.Visits.Add(visit);

            // Create Orders (with recursive expansion)
            var currentOrders = new List<Order>();
            foreach (var testCode in visitDto.TestCodes)
            {
                await ExpandAndAddOrdersInternalAsync(visit.VisitId, testCode, currentOrders, false);
            }

            // Create Invoice (Shell)
            var invoice = new Invoice
            {
                InvoiceId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                GrossAmount = 0,
                DiscountAmount = 0,
                NetAmount = 0,
                TaxAmount = 0,
                Total = 0,
                Currency = "INR",
                Status = "PendingPayment",
                DueDate = labLocalToday.AddDays(7),
                CreatedAt = DateTime.UtcNow
            };
            _context.Invoices.Add(invoice);

            // Create Initial DiscountFact (if any)
            if (!string.IsNullOrEmpty(visitDto.DiscountCode))
            {
                var appliedDiscount = await _context.DiscountMasters
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.Code == visitDto.DiscountCode);

                if (appliedDiscount != null && appliedDiscount.IsActive)
                {
                    var now = DateTime.UtcNow;
                    bool effective = (!appliedDiscount.EffectiveFrom.HasValue || appliedDiscount.EffectiveFrom <= now) &&
                                     (!appliedDiscount.EffectiveTo.HasValue || appliedDiscount.EffectiveTo >= now);

                    if (effective)
                    {
                        var discountFact = new DiscountFact
                        {
                            DiscountFactId = Guid.NewGuid(),
                            InvoiceId = invoice.InvoiceId,
                            DiscountDefinitionId = appliedDiscount.DiscountDefinitionId,
                            AppliedBy = actorUserId.ToString(),
                            AppliedAt = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = true,
                            Type = appliedDiscount.Type,
                            Value = appliedDiscount.Value,
                            MaxLimit = appliedDiscount.MaxLimit,
                            GrossAmount = 0, DiscountAmount = 0, NetAmountAfterDiscount = 0
                        };
                        _context.DiscountFacts.Add(discountFact);
                    }
                }
            }

            await _context.SaveChangesAsync();

            // CALL REVENUE ENGINE
            await _revenueEngine.ApplySnapshotAsync(visit.VisitId, actorUserId);
            
            await _auditService.LogAsync(actorUserId, "CreateVisit", "Visit", visit.VisitId, visitDto);

            if (visit.PaymentCollectionModel == "PartnerCollects" && visit.ReferralPartnerId.HasValue)
            {
                var payment = new Payment
                {
                    PaymentId = Guid.NewGuid(),
                    InvoiceId = invoice.InvoiceId,
                    Amount = invoice.Total, 
                    Method = "PartnerAccount",
                    ReceiptNo = $"SYS-{visit.Token}",
                    ReceivedAt = DateTime.UtcNow,
                    ReceivedByUserId = fallbackUserId
                };
                _context.Payments.Add(payment);
                invoice.Status = "Paid";
                visit.Status = VisitStatus.Paid;

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

                await _context.SaveChangesAsync();
                
                await MarkVisitAsPrepaidAsync(visit.VisitId, actorUserId, visit.VisitId);
            }

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{patient.FirstName} {patient.LastName}";

            var visitMetadata = JsonSerializer.Serialize(new
            {
                PatientName = patientName,
                PatientId = patient.PatientId,
                TokenId = visit.Token,
                ActorName = actorName,
                ActorRole = "Reception", // Context implied
                TestCodes = visitDto.TestCodes,
                Total = invoice.Total,
                Status = visit.Status.ToString()
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_CREATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Visit created for {patientName} by {actorName}",
                actorName, // Use Real Name
                actorUserId.ToString(),
                true,
                null,
                null,
                TimelineVisibility.Surface,
                visit.VisitId,
                visitMetadata
            );

            // Resolve demographics and referral dimensions for event
            var patientEntity = await _context.Patients.FindAsync(visit.PatientId);
            var gender = patientEntity?.Gender;
            var dob = patientEntity?.DateOfBirth;

            Guid? referrerId = visit.ReferrerId;
            string? referrerName = null;
            if (referrerId.HasValue)
            {
                var referrer = await _context.Referrers.FindAsync(referrerId.Value);
                referrerName = referrer?.ProviderName ?? visit.ReferrerText;
            }

            Guid? referralPartnerId = visit.ReferralPartnerId;
            string? referralPartnerName = null;
            string? referralPartnerLocation = null;
            if (referralPartnerId.HasValue)
            {
                var partner = await _context.ReferralPartners.FindAsync(referralPartnerId.Value);
                referralPartnerName = partner?.Name;
                referralPartnerLocation = partner?.Location;
            }

            // Enqueue BillCreatedEvent
            _outboxService.Enqueue(new BillCreatedEvent(
                invoice.InvoiceId,
                visit.VisitId,
                invoice.GrossAmount,
                invoice.DiscountAmount,
                invoice.NetAmount,
                invoice.TaxAmount,
                invoice.Total,
                invoice.Status,
                invoice.DueDate,
                visit.BranchId,
                gender,
                dob,
                referrerId,
                referrerName,
                referralPartnerId,
                referralPartnerName,
                referralPartnerLocation,
                null, // PatientLocation
                null, // PatientPincode
                visit.PatientId // PatientId
            ));
            await _context.SaveChangesAsync();

            // Auto-consume reception stationery/receipt rolls
            await _consumptionService.ConsumeForVisitAsync(visit.VisitId, actorUserId);

            return visit;
        }

        public async Task<Visit> AddTestToVisitAsync(Guid visitId, string testCode, Guid actorUserId)
        {
            _logger.LogInformation("TRACE: AddTestToVisitAsync called. visitId={VisitId}, testCode={TestCode}", visitId, testCode);

            // Ensure we are working with fresh test mapping data
            _testsCacheService.InvalidateTestsCache();

            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Orders) // ADDED: Must include orders for duplicate check and state management
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null)
                throw new KeyNotFoundException("Visit not found.");

            CheckVisitOwnership(visit);

            // GUARD: Cannot add test if samples are already collected
            // REFACTOR: Temporarily disabled during Specimen Migration
            /*
            var hasCollectedSample = await _context.Samples.AnyAsync(s => s.OrderId == visit.Orders.First().OrderId && s.Status != SampleStatus.Pending);
            if (hasCollectedSample)
                throw new InvalidOperationException("Cannot add test. Sample collection has already started.");
            */

            if (visit.Orders.Any(o => o.TestCode.Equals(testCode, StringComparison.OrdinalIgnoreCase) && o.Status != SynOS.Models.Enums.OrderStatus.Cancelled))
                throw new InvalidOperationException($"Test '{testCode}' is already added.");

            var currentOrders = visit.Orders.ToList();
            await ExpandAndAddOrdersInternalAsync(visitId, testCode, currentOrders, false);

            try
            {
                int affectedRows = await _context.SaveChangesAsync();
                _logger.LogInformation("TRACE: SaveChangesAsync reached. Affected rows: {AffectedRows}", affectedRows);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TRACE: SaveChangesAsync threw exception. Message: {Message}", ex.Message);
                throw;
            }

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";

            var addTestMetadata = JsonSerializer.Serialize(new 
            { 
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                TestCode = testCode, 
                Action = "Added" 
            });

            /* 
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Added test {testCode}",
                actorName, // Use Real Name
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                visit.VisitId,
                addTestMetadata
            );
            */

            return visit;
        }

        public async Task<Visit> RemoveTestFromVisitAsync(Guid visitId, string testCode, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            CheckVisitOwnership(visit);

            var order = visit.Orders.FirstOrDefault(o => o.TestCode.Equals(testCode, StringComparison.OrdinalIgnoreCase));
            if (order == null) throw new KeyNotFoundException($"Test '{testCode}' not found.");

            return await RemoveOrderAsync(visitId, order.OrderId, actorUserId);
        }

        public async Task<Visit> RemoveOrderAsync(Guid visitId, Guid orderId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Specimens)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            // 1. Visit-Scoped Validation
            if (!_lifecyclePolicy.IsEditable(visit.Status))
                throw new InvalidOperationException($"Cannot delete orders from a visit in {visit.Status} state. Current policy prevents modifications.");

            if (visit.Invoices.Any(i => i.Status == "Paid" || i.Status == "PartiallyPaid"))
                throw new InvalidOperationException("Cannot delete orders. Payment has already been accepted for this visit.");

            var targetOrder = visit.Orders.FirstOrDefault(o => o.OrderId == orderId);
            if (targetOrder == null) throw new KeyNotFoundException($"Order {orderId} not found in visit {visitId}.");

            // 2. Compute Deletion Set
            var deleteSet = new List<Order> { targetOrder };

            if (targetOrder.ParentOrderId == null)
            {
                // Is Parent: Add all children
                var children = visit.Orders.Where(o => o.ParentOrderId == targetOrder.OrderId).ToList();
                deleteSet.AddRange(children);
            }
            else
            {
                // Is Child: Check if last child of this parent
                var otherChildrenExist = visit.Orders.Any(o => o.ParentOrderId == targetOrder.ParentOrderId && o.OrderId != targetOrder.OrderId);
                if (!otherChildrenExist)
                {
                    var parent = visit.Orders.FirstOrDefault(o => o.OrderId == targetOrder.ParentOrderId);
                    if (parent != null) deleteSet.Add(parent);
                }
            }

            // 3. Order-Scoped Validation
            var deleteOrderIds = deleteSet.Select(o => o.OrderId).ToList();

            foreach (var order in deleteSet)
            {
                if (order.SpecimenId != null)
                {
                    var specimen = visit.Specimens.FirstOrDefault(s => s.SpecimenId == order.SpecimenId);
                    if (specimen != null && specimen.Status != SpecimenStatus.Pending)
                        throw new InvalidOperationException($"Cannot delete order {order.TestCode}. A specimen ({specimen.AccessionNumber}) has already been collected/processed.");
                }
            }

            var resultsExist = await _context.Results.AnyAsync(r => deleteOrderIds.Contains(r.OrderId));
            if (resultsExist)
                throw new InvalidOperationException("Cannot delete orders. Results have already been entered for one or more tests in the deletion set.");

            // 4. Action
            _context.Orders.RemoveRange(deleteSet);
            await _context.SaveChangesAsync();

            // 5. Sync Revenue & Events
            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            string actorName = await GetActorNameAsync(actorUserId);
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Deleted {deleteSet.Count} orders (Target: {targetOrder.TestCode})",
                actorName,
                actorUserId.ToString(),
                true
            );

            return visit;
        }

        public async Task RemoveDiscountFromVisitAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient) // ADDED
                .Include(v => v.Orders) //.ThenInclude(o => o.Samples) // REFACTOR: Removed
                .Include(v => v.Invoices)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (IsSampleCollectionStarted(visit))
                throw new InvalidOperationException("Cannot modify discount. Sample collection has already started.");

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice != null)
            {
                var discountFacts = await _context.DiscountFacts
                    .Where(df => df.InvoiceId == invoice.InvoiceId && df.IsActive)
                    .ToListAsync();

                foreach (var df in discountFacts) { df.IsActive = false; }
                await _context.SaveChangesAsync();
            }

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";
            var meta = JsonSerializer.Serialize(new { PatientName = patientName, TokenId = visit.Token, ActorName = actorName, Action = "Discount Removed" });

             await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                "Discount removed",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                visit.VisitId,
                meta
            );
        }

        public async Task ApplyDiscountToVisitAsync(Guid visitId, Guid discountMasterId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient) // ADDED
                .Include(v => v.Orders) //.ThenInclude(o => o.Samples) // REFACTOR: Removed
                .Include(v => v.Invoices)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (IsSampleCollectionStarted(visit))
                throw new InvalidOperationException("Cannot apply discount. Sample collection has already started.");

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) throw new InvalidOperationException("No invoice.");

            var master = await _context.DiscountMasters.FindAsync(discountMasterId);
            if (master == null || !master.IsActive) throw new InvalidOperationException("Invalid discount.");

            var oldFacts = await _context.DiscountFacts.Where(df => df.InvoiceId == invoice.InvoiceId && df.IsActive).ToListAsync();
            var replacedId = oldFacts.OrderByDescending(f => f.AppliedAt).FirstOrDefault()?.DiscountFactId;
            foreach (var f in oldFacts) f.IsActive = false;

            var newFact = new DiscountFact
            {
                DiscountFactId = Guid.NewGuid(),
                InvoiceId = invoice.InvoiceId,
                DiscountDefinitionId = discountMasterId,
                AppliedBy = actorUserId.ToString(),
                AppliedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                ReplacedDiscountFactId = replacedId,
                Type = master.Type,
                Value = master.Value,
                MaxLimit = master.MaxLimit,
                GrossAmount = 0, DiscountAmount = 0, NetAmountAfterDiscount = 0
            };
            _context.DiscountFacts.Add(newFact);
            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);
            
            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";
            var meta = JsonSerializer.Serialize(new { PatientName = patientName, TokenId = visit.Token, ActorName = actorName, DiscountCode = master.Code, Action = "Discount Applied" });

             await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Discount {master.Code} applied",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                visit.VisitId,
                meta
            );
        }

        public async Task SetVisitReferralAsync(Guid visitId, Guid referralPartnerId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient) // ADDED
                .Include(v => v.Orders) //.ThenInclude(o => o.Samples) // REFACTOR: Removed
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (IsSampleCollectionStarted(visit))
            {
                if (visit.ReferralPartnerId != null)
                    throw new InvalidOperationException("Cannot change referral partner after sample collection. This visit is physically locked.");

                _logger.LogInformation("LATE ATTRIBUTION: Referral Partner {PartnerId} set for locked visit {VisitId}", referralPartnerId, visitId);
            }

            visit.ReferralPartnerId = referralPartnerId;
            visit.IsReferred = true;
            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            var partner = await _context.ReferralPartners.FindAsync(referralPartnerId);
            var partnerName = partner?.Name ?? referralPartnerId.ToString();

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";

            var referralMetadata = JsonSerializer.Serialize(new 
            { 
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                PartnerName = partnerName, 
                PartnerId = referralPartnerId, 
                Action = "Set" 
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visitId.ToString(),
                visit.Token,
                $"Referral Partner updated to {partnerName}",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                Guid.NewGuid(),
                referralMetadata
            );
        }

        public async Task RemoveVisitReferralAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (IsSampleCollectionStarted(visit))
                throw new InvalidOperationException("Cannot remove referral partner after sample collection.");

            visit.ReferralPartnerId = null;
            visit.IsReferred = false;
            
            // 2. Clear Prepaid Financial State (PartnerAccount payments)
            // If we remove the partner, any system-generated prepaid payments must be voided/removed.
            visit.PaymentCollectionModel = "LabCollects"; // Reset to standard
            
            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice != null)
            {
                var systemPayments = invoice.Payments.Where(p => p.Method == "PartnerAccount").ToList();
                if (systemPayments.Any())
                {
                    _context.Payments.RemoveRange(systemPayments);
                    
                    // Also clear associated ReceivableFacts to prevent ledger leaks
                    var receivables = await _context.ReceivableFacts.Where(r => r.SourceVisitId == visitId).ToListAsync();
                    _context.ReceivableFacts.RemoveRange(receivables);
                }
            }

            await _context.SaveChangesAsync();
            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";

            var removeReferralMetadata = JsonSerializer.Serialize(new 
            { 
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                Action = "Removed" 
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visitId.ToString(),
                visit.Token,
                "Referral Partner removed",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                Guid.NewGuid(),
                removeReferralMetadata
            );
        }

        public async Task UpdateVisitReferrerTextAsync(Guid visitId, string? referrerText, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);
                
            if (visit == null) return;

            CheckVisitOwnership(visit);

            visit.ReferrerText = referrerText;
            await _context.SaveChangesAsync();
            
            // ENRICHED METADATA (Even for hidden events, consistency helps debugging)
             string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visitId.ToString(),
                visit.Token,
                "Referrer text updated",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Hide,
                 // Even if hidden, metadata might be useful if visibility changes later
                 visit.VisitId,
                 JsonSerializer.Serialize(new { PatientName = patientName, ActorName = actorName })
            );
        }

        public async Task MarkVisitAsPrepaidAsync(Guid visitId, Guid actorUserId, Guid? intentId = null)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient) 
                .Include(v => v.Invoices) // ADDED: Need invoice for Total Amount
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");

            CheckVisitOwnership(visit);

            visit.PaymentCollectionModel = "PartnerCollects";
            visit.Status = VisitStatus.Paid;
            if (visit.Token.StartsWith("DRAFT")) await AssignOfficialTokenAsync(visitId, actorUserId);
            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";
            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(); // Get Invoice

            var prepaidMetadata = JsonSerializer.Serialize(new 
            { 
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                Method = "PartnerCollects", 
                Status = "Paid",
                Amount = invoice.Total, // Added Amount for Frontend Display
                Total = invoice.Total   // Alias for robustness
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_FINALIZED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                "Visit marked as Paid (Partner Collects)",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                intentId ?? Guid.NewGuid(),
                prepaidMetadata
            );
        }

        public async Task<string> AssignOfficialTokenAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits.FindAsync(visitId);
            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");

            // Only assign if it's still a DRAFT or doesn't have a proper token yet
            if (!visit.Token.StartsWith("DRAFT")) return visit.Token;

            var newToken = await GenerateDailyTokenAsync(visit.Department, _labTimeProvider.GetLabToday(), actorUserId);
            
            visit.Token = newToken;
            visit.UpdatedAt = DateTimeOffset.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Assigned Official Token {Token} to Visit {VisitId}", newToken, visitId);
            return newToken;
        }

        public async Task RecalculateFinancialsAsync(Guid visitId, Guid actorUserId)
        {
            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);
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

        public async Task<IEnumerable<Visit>> GetVisitsAsync(string department, VisitStatus status, int limit)
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
                                      .Include(v => v.Patient) // ADDED just in case
                                      .Include(v => v.Invoices)
                                      .ThenInclude(i => i.Payments)
                                      .Include(v => v.Invoices)
                                      .ThenInclude(i => i.PartialPayments)
                                      .Include(v => v.Orders)
                                      .Include(v => v.Specimens) // ADDED: Specimen Architecture
                                      .FirstOrDefaultAsync(v => v.VisitId == visitId);
            if (visit == null) throw new KeyNotFoundException($"Visit with ID {visitId} not found.");

            if (IsSampleCollectionStarted(visit))
                throw new InvalidOperationException("Cannot cancel visit. Specimen collection has already started. Contact medical supervisor for discard flow.");

            if (visit.Status == VisitStatus.Cancelled) throw new InvalidOperationException("Visit is already cancelled.");

            visit.Status = VisitStatus.Cancelled;

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
                // Refund logic if needed
            }

            // Cancel all Specimens not yet processed
            foreach (var specimen in visit.Specimens)
            {
                if (specimen.Status != SpecimenStatus.Collected && specimen.Status != SpecimenStatus.Accessioned)
                {
                    specimen.Status = SpecimenStatus.Cancelled;
                }
            }

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(cancelDto.CancelledByUserId, "CancelVisit", "Visit", visitId, cancellation);
            
            // ENRICHED EVENT for Cancellation
            string actorName = await GetActorNameAsync(cancelDto.CancelledByUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";
            
             await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                visit.BranchId.HasValue ? visit.BranchId.Value.ToString() : "GLOBAL",
                visit.VisitId.ToString(),
                visit.Token,
                $"Visit Cancelled: {cancelDto.Reason}",
                actorName,
                cancelDto.CancelledByUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                visit.VisitId,
                JsonSerializer.Serialize(new { PatientName = patientName, ActorName = actorName, Status = "Cancelled" })
            );

            return cancellation;
        }

        private async Task<string> GenerateDailyTokenAsync(string department, DateTime labLocalDay, Guid actorUserId)
        {
            var branchId = _userContext.CurrentBranchId;
            var branch = await _context.Branches.FindAsync(branchId);
            
            // Use first 3 letters of branch code as prefix, fallback to LAB
            string prefix = "LAB";
            if (branch != null && !string.IsNullOrWhiteSpace(branch.Code))
            {
                prefix = branch.Code.Trim().ToUpper();
                if (prefix.Length > 3) prefix = prefix.Substring(0, 3);
            }

            // We use a branch-specific counter for better isolation
            var tokenCounter = await _context.TokenCounters
                .FirstOrDefaultAsync(tc => tc.Day == labLocalDay && tc.BranchId == branchId && tc.Department == department);

            if (tokenCounter == null)
            {
                tokenCounter = new TokenCounter
                {
                    CounterId = Guid.NewGuid(),
                    Department = department,
                    Day = labLocalDay,
                    BranchId = branchId,
                    Prefix = prefix,
                    LastNumber = 0,
                    MaxPerSeries = 9999, // Allow more tokens per day if needed
                    UpdatedAt = DateTime.UtcNow
                };
                _context.TokenCounters.Add(tokenCounter);
            }
            else
            {
                // Ensure we have the latest number from DB (basic concurrency guard)
                await _context.Entry(tokenCounter).ReloadAsync();
            }

            tokenCounter.LastNumber++;
            tokenCounter.UpdatedAt = DateTime.UtcNow;

            // Save immediately to reserve the number
            await _context.SaveChangesAsync();
            
            await _auditService.LogAsync(actorUserId, "TokenGenerated", "TokenCounter", tokenCounter.CounterId, tokenCounter);

            return $"{prefix}-{tokenCounter.LastNumber:D3}";
        }
        
        private class ResolvedTestDto
        {
            public Guid TestId { get; set; }
            public string TestCode { get; set; }
            public string TestName { get; set; }
            public string MacroDepartment { get; set; } // Broad operational branch
            public string Department { get; set; } // Specific specialization
            public string DepartmentCode { get; set; } // Routing code (e.g., BIO)
            public decimal BasePrice { get; set; }
            public Guid? PriceConfigId { get; set; }
        }

        private async Task<ResolvedTestDto?> ResolveTestForReceptionAsync(string testCode, bool isChild = false)
        {
            var normalized = testCode?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(normalized)) return null;

            var allTests = await _testsCacheService.GetCachedTestsAsync();

            // Unified Visit Model: Decouple from Visit.Department gating.
            // Resolve purely by Code, Active status, and valid pricing.
            var test = allTests
                .FirstOrDefault(t => t.TestCode.ToUpper() == normalized && t.IsActive);

            if (test == null) return null;

            // Diagnostic Logging
            _logger.LogWarning($"[Validation] Resolving Test: {test.TestCode}, IsProfile: {test.IsProfile}, HasChildren: {test.ProfileChildren?.Any() == true}, SpecimenType: {test.SpecimenTypeCode}");

            // NEW: SpecimenType Validation Rule for Billable Non-Profile Tests
            if (string.IsNullOrEmpty(test.SpecimenTypeCode))
            {
                if (!test.IsProfile || (test.ProfileChildren != null && !test.ProfileChildren.Any()))
                {
                    throw new InvalidOperationException($"Specimen type not configured for test {test.TestCode}");
                }
            }

            // --- PRICE BYPASS START ---
            if (isChild)
            {
                // For profile children, we completely skip all pricing table checks and return the test data with 0 price.
                return new ResolvedTestDto
                {
                    TestId = test.TestId,
                    TestCode = test.TestCode,
                    TestName = test.TestName,
                    MacroDepartment = test.DepartmentMaster?.MacroDepartment ?? "Unknown",
                    Department = test.DepartmentMaster?.Name ?? "Unknown",
                    DepartmentCode = test.DepartmentMaster?.Code ?? "Unknown",
                    BasePrice = 0,
                    PriceConfigId = null
                };
            }
            // --- PRICE BYPASS END ---

            // Price Logic: Get currently active price from TestPricings
            var currentPriceObj = test.TestPricings?
                .Where(tp => tp.EffectiveFrom <= DateTime.UtcNow)
                .OrderByDescending(tp => tp.EffectiveFrom)
                .FirstOrDefault();

            decimal basePrice = currentPriceObj?.BasePrice ?? 0;
            
            // RULE: Standalone tests MUST have a price > 0. Profile children logic handled above.
            if (basePrice <= 0) return null;

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
                MacroDepartment = test.DepartmentMaster?.MacroDepartment ?? "Unknown",
                Department = test.DepartmentMaster?.Name ?? "Unknown",
                DepartmentCode = test.DepartmentMaster?.Code ?? "Unknown",
                BasePrice = basePrice,
                PriceConfigId = priceConfig?.PriceId
            };
        }

        private bool IsSampleCollectionStarted(Visit visit)
        {
            if (visit.Specimens == null || !visit.Specimens.Any()) return false;

            return visit.Specimens.Any(s => 
                s.Status == SpecimenStatus.Collected || 
                s.Status == SpecimenStatus.Accessioned);
        }

        private async Task ExpandAndAddOrdersInternalAsync(Guid visitId, string testCode, List<Order> collection, bool isChild, Guid? parentOrderId = null)
        {
            _logger.LogInformation($"[ExpansionDebug] Starting expansion for {testCode}. isChild: {isChild}, parentOrderId: {parentOrderId}");

            var resolved = await ResolveTestForReceptionAsync(testCode, isChild);
            if (resolved == null)
            {
                _logger.LogWarning($"[ExpansionDebug] ResolveTestForReceptionAsync returned NULL for {testCode}");
                return;
            }

            // Prevent duplicates in same visit
            if (collection.Any(o => o.TestId == resolved.TestId && o.Status != SynOS.Models.Enums.OrderStatus.Cancelled))
            {
                _logger.LogInformation($"[ExpansionDebug] Test {testCode} (Id: {resolved.TestId}) already exists in visit. Skipping.");
                return;
            }

            // Fetch full test from cache to check IsOutsourced and children
            var allTests = await _testsCacheService.GetCachedTestsAsync();
            var test = allTests.FirstOrDefault(t => t.TestId == resolved.TestId);

            // Resolve Outsourcing Data if applicable
            bool isOutsourced = test?.IsOutsourced ?? false;
            Guid? refLabId = null;
            string? refLabName = null;
            decimal? outsourceCost = null;
            bool isPricingResolved = false;

            if (isOutsourced && test != null)
            {
                // Attempt to link a Reference Lab Rule (Take first available as default for quick-add)
                var rule = await _context.ReferenceLabRateRules
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.TestId == test.TestId);
                
                if (rule != null)
                {
                    refLabId = rule.ReferenceLabId;
                    outsourceCost = rule.Cost;
                    isPricingResolved = true;

                    var lab = await _context.ReferenceLabs.FindAsync(rule.ReferenceLabId);
                    refLabName = lab?.Name;
                }
            }

            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                VisitId = visitId,
                TestId = resolved.TestId,
                TestCode = resolved.TestCode,
                Department = isOutsourced ? "Outsourced" : resolved.DepartmentCode,
                Status = SynOS.Models.Enums.OrderStatus.Pending,
                Price = isChild ? 0 : resolved.BasePrice,
                ParentOrderId = parentOrderId,
                Discount = 0,
                CreatedAt = DateTime.UtcNow,
                IsOutsourced = isOutsourced,
                ReferenceLabId = refLabId,
                ReferenceLabName = refLabName,
                OutsourceCost = outsourceCost,
                IsPricingResolved = isPricingResolved,
                OutsourcedAt = isOutsourced ? DateTime.UtcNow : (DateTime?)null
            };

            _logger.LogInformation($"[ExpansionDebug] Creating Order entry: {order.TestCode}, ID: {order.OrderId}, Parent: {order.ParentOrderId}");
            _context.Orders.Add(order);
            collection.Add(order);
            _logger.LogInformation($"[ExpansionDebug] Order {order.TestCode} added to context and local collection.");


            if (test != null && test.IsProfile)
            {
                var childCount = test.ProfileChildren?.Count ?? 0;
                _logger.LogInformation($"[ExpansionDebug] Test {test.TestCode} is a Profile. Children found in cache: {childCount}");

                if (childCount > 0)
                {
                    // Ensure current order is saved if it's a parent, so children can reference it? 
                    // Actually EF handles the graph, but for clarity:
                    // await _context.SaveChangesAsync(); 

                    foreach (var mapping in test.ProfileChildren!)
                    {
                        var childDef = allTests.FirstOrDefault(t => t.TestId == mapping.ChildTestId);
                        if (childDef != null)
                        {
                            _logger.LogInformation($"[ExpansionDebug] Expanding child: {childDef.TestCode} (ID: {childDef.TestId}) for parent: {test.TestCode}");
                            await ExpandAndAddOrdersInternalAsync(visitId, childDef.TestCode, collection, true, order.OrderId);
                        }
                        else
                        {
                            _logger.LogWarning($"[ExpansionDebug] Child TestId {mapping.ChildTestId} not found in cache for parent {test.TestCode}");
                        }
                    }
                }
                else
                {
                    _logger.LogWarning($"[ExpansionDebug] Profile {test.TestCode} has ZERO children in cache.");
                }
            }
        }

        private async Task<string> GetActorNameAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            return user?.Name ?? "Unknown User";
        }

        private void CheckVisitOwnership(Visit visit)
        {
            if (visit == null) throw new KeyNotFoundException("Visit not found.");
            
            var role = _userContext.CurrentRole;
            var currentUserId = _userContext.CurrentUserId;
            
            // Exempt Admin, Manager, and System (Empty Guid)
            if (role == "Admin" || role == "Manager" || currentUserId == Guid.Empty) return;

            if (role == "Receptionist" && visit.AssignedReceptionistId != currentUserId)
            {
                throw new UnauthorizedAccessException($"Visit {visit.Token} is assigned to another desk. Modification denied.");
            }
        }

        private async Task CheckVisitOwnershipAsync(Guid visitId)
        {
            var role = _userContext.CurrentRole;
            var currentUserId = _userContext.CurrentUserId;
            
            if (role == "Admin" || role == "Manager" || currentUserId == Guid.Empty) return;

            var ownership = await _context.Visits
                .Where(v => v.VisitId == visitId)
                .Select(v => new { v.AssignedReceptionistId, v.Token })
                .FirstOrDefaultAsync();

            if (ownership == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (role == "Receptionist" && ownership.AssignedReceptionistId != currentUserId)
            {
                throw new UnauthorizedAccessException($"Visit {ownership.Token} is assigned to another desk. Modification denied.");
            }
        }
    }
}