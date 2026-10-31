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
            var token = $"D-{Guid.NewGuid():N}"[..12].ToUpperInvariant();

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
            var effectiveUserId = validUserId ?? fallbackUserId;
            if (effectiveUserId == Guid.Empty)
            {
                var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "admin");
                effectiveUserId = adminUser?.UserId ?? Guid.NewGuid();
            }

            // Resilient BranchId resolution: If current user context has no branch claim (e.g. headless token / external orchestrator),
            // safely fallback to the primary lab branch (MAIN) or the first available branch in the database.
            var effectiveBranchId = _userContext.CurrentBranchId;
            if (effectiveBranchId == Guid.Empty)
            {
                var defaultBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Code == "MAIN" || b.BranchId == SynOS.Data.DbInitializer.DefaultBranchId);
                effectiveBranchId = defaultBranch?.BranchId ?? await _context.Branches.Select(b => b.BranchId).FirstOrDefaultAsync();
            }

            var visit = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = visitDto.PatientId,
                BranchId = effectiveBranchId,
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
                CreatedByUserId = effectiveUserId,
                AssignedReceptionistId = effectiveUserId
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
                            AppliedBy = effectiveUserId.ToString(),
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

            int maxRetries = 3;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    await _context.SaveChangesAsync();
                    break;
                }
                catch (DbUpdateException dbEx) when (attempt < maxRetries)
                {
                    _logger.LogWarning(dbEx, "Concurrency retry during CreateVisit SaveChangesAsync (Attempt {Attempt}/{MaxRetries})", attempt, maxRetries);
                    visit.Token = $"D-{Guid.NewGuid():N}"[..12].ToUpperInvariant();
                    await Task.Delay(50 * attempt);
                }
            }

            // CALL REVENUE ENGINE
            await _revenueEngine.ApplySnapshotAsync(visit.VisitId, effectiveUserId);
            
            await _auditService.LogAsync(effectiveUserId, "CreateVisit", "Visit", visit.VisitId, visitDto);

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
                    ReceivedByUserId = effectiveUserId
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
                
                await MarkVisitAsPrepaidAsync(visit.VisitId, effectiveUserId, visit.VisitId);
            }

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(effectiveUserId);
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
                effectiveBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Visit created for {patientName} by {actorName}",
                actorName, // Use Real Name
                effectiveUserId.ToString(),
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
            await _consumptionService.ConsumeForVisitAsync(visit.VisitId, effectiveUserId);

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

            // GUARD: Institutional / Insurance Packages can NEVER be added to Direct / Standard or B2B visits
            if (visit.BillingType != SynOS.Models.Enums.BillingType.Insurance && visit.BillingType != SynOS.Models.Enums.BillingType.Corporate)
            {
                if (testCode.StartsWith("PKG-", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Package '{testCode}' is an institutional package and can only be ordered under Insurance mode.");
                }
            }

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

        public async Task ApplyCustomDiscountToVisitAsync(Guid visitId, string mode, decimal value, string? reason, Guid actorUserId)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new InvalidOperationException("An authorized discount reason preset is required before applying a discount.");

            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                .Include(v => v.Invoices)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (IsSampleCollectionStarted(visit))
                throw new InvalidOperationException("Cannot apply discount. Sample collection has already started.");

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) throw new InvalidOperationException("No invoice found.");

            // Find or create the generic custom concession master
            var customMaster = await _context.DiscountMasters.FirstOrDefaultAsync(dm => dm.Code == "CUSTOM");
            if (customMaster == null)
            {
                customMaster = new DiscountMaster
                {
                    DiscountDefinitionId = Guid.NewGuid(),
                    Code = "CUSTOM",
                    Name = "Manual Desk Concession",
                    Type = mode.Equals("Flat", StringComparison.OrdinalIgnoreCase) ? DiscountType.Flat : DiscountType.Percentage,
                    Value = value,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.DiscountMasters.Add(customMaster);
                await _context.SaveChangesAsync();
            }

            var discType = mode.Equals("Flat", StringComparison.OrdinalIgnoreCase) ? DiscountType.Flat : DiscountType.Percentage;

            var oldFacts = await _context.DiscountFacts.Where(df => df.InvoiceId == invoice.InvoiceId && df.IsActive).ToListAsync();
            var replacedId = oldFacts.OrderByDescending(f => f.AppliedAt).FirstOrDefault()?.DiscountFactId;
            foreach (var f in oldFacts) f.IsActive = false;

            string actorName = await GetActorNameAsync(actorUserId);
            string appliedByNote = string.IsNullOrWhiteSpace(reason) ? actorName : $"{actorName} - {reason.Trim()}";

            var newFact = new DiscountFact
            {
                DiscountFactId = Guid.NewGuid(),
                InvoiceId = invoice.InvoiceId,
                DiscountDefinitionId = customMaster.DiscountDefinitionId,
                AppliedBy = appliedByNote,
                AppliedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                ReplacedDiscountFactId = replacedId,
                Type = discType,
                Value = value,
                MaxLimit = null,
                GrossAmount = 0,
                DiscountAmount = 0,
                NetAmountAfterDiscount = 0
            };

            _context.DiscountFacts.Add(newFact);
            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            string patientName = $"{visit.Patient?.FirstName} {visit.Patient?.LastName}".Trim();
            var meta = JsonSerializer.Serialize(new
            {
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                Mode = mode,
                Value = value,
                Reason = reason,
                Action = "CustomDiscountApplied"
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Custom {mode} concession ({value}) applied by {actorName}",
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

        public async Task SetSecondaryReferralAsync(Guid visitId, Guid? secondaryPartnerId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            visit.SecondaryReferralPartnerId = secondaryPartnerId;
            if (secondaryPartnerId.HasValue)
            {
                visit.IsReferred = true;
            }

            // Sync financial attribution facts (Receivables and Payables) to Secondary Partner
            var targetPartnerId = secondaryPartnerId ?? visit.ReferralPartnerId;
            if (targetPartnerId.HasValue)
            {
                var targetPartner = await _context.ReferralPartners.FindAsync(targetPartnerId.Value);
                if (targetPartner != null)
                {
                    var recs = await _context.ReceivableFacts
                        .Where(r => r.SourceVisitId == visitId && r.DebtorType == DebtorType.Partner)
                        .ToListAsync();

                    foreach (var r in recs)
                    {
                        r.DebtorId = targetPartnerId.Value;
                        r.ReferralPartnerId = targetPartnerId.Value;
                        r.DebtorName = targetPartner.Name;
                        r.ClaimReference = $"Prepaid Partner Bill: {targetPartner.Name}";
                    }

                    var payables = await _context.ReferralPayableFacts
                        .Where(f => f.SourceVisitId == visitId)
                        .ToListAsync();

                    foreach (var p in payables)
                    {
                        p.ReferralPartnerId = targetPartnerId.Value;
                    }
                }
            }

            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            string partnerName = "None";
            if (secondaryPartnerId.HasValue)
            {
                var partner = await _context.ReferralPartners.FindAsync(secondaryPartnerId.Value);
                partnerName = partner?.Name ?? secondaryPartnerId.Value.ToString();
            }

            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient?.FirstName} {visit.Patient?.LastName}".Trim();

            var meta = JsonSerializer.Serialize(new
            {
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                SecondaryPartnerName = partnerName,
                SecondaryPartnerId = secondaryPartnerId,
                Action = "SetSecondaryReferral"
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                secondaryPartnerId.HasValue ? $"Secondary Referral Doctor (RMP) set to {partnerName}" : "Secondary Referral Doctor (RMP) removed",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                visit.VisitId,
                meta
            );
        }

        public async Task SetB2BPrepaidRateAsync(Guid visitId, decimal b2bDiscountAmount, string? discountType, decimal? discountValue, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.Invoices)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            string actorName = await GetActorNameAsync(actorUserId);

            visit.B2BDiscountAmount = b2bDiscountAmount;
            visit.B2BDiscountType = discountType;
            visit.B2BDiscountValue = discountValue;
            visit.B2BDiscountEnteredBy = actorName;
            visit.B2BDiscountEnteredAt = DateTimeOffset.UtcNow;

            // Self-Learning Rate Engine:
            // When a receptionist enters a contracted B2B discount for this partner, learn it safely
            var effectivePartnerId = visit.SecondaryReferralPartnerId ?? visit.ReferralPartnerId;
            if (effectivePartnerId.HasValue && visit.Orders.Any())
            {
                try
                {
                    decimal totalGross = visit.Orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.Price);
                    if (totalGross > 0)
                    {
                        decimal discountRatio = Math.Min(1m, Math.Max(0m, b2bDiscountAmount / totalGross));
                        decimal discountPercentage = Math.Round(discountRatio * 100m, 2);
                        var today = DateOnly.FromDateTime(DateTime.UtcNow);

                        var testIds = visit.Orders
                            .Where(o => o.Status != OrderStatus.Cancelled && o.TestId != Guid.Empty)
                            .Select(o => o.TestId)
                            .Distinct()
                            .ToList();

                        foreach (var testId in testIds)
                        {
                            var existingRules = await _context.ReferralCommissionRules
                                .Where(r => r.ReferralPartnerId == effectivePartnerId.Value && r.TestId == testId)
                                .ToListAsync();

                            var ruleForToday = existingRules.FirstOrDefault(r => r.EffectiveFrom == today);
                            if (ruleForToday != null)
                            {
                                ruleForToday.CommissionType = SynOS.Models.Enums.Referral.CommissionType.Percentage;
                                ruleForToday.CommissionValue = discountPercentage;
                                ruleForToday.IsActive = true;
                            }
                            else
                            {
                                var activeRule = existingRules.FirstOrDefault(r => r.IsActive);
                                if (activeRule != null)
                                {
                                    activeRule.CommissionType = SynOS.Models.Enums.Referral.CommissionType.Percentage;
                                    activeRule.CommissionValue = discountPercentage;
                                }
                                else
                                {
                                    _context.ReferralCommissionRules.Add(new ReferralCommissionRule
                                    {
                                        RuleId = Guid.NewGuid(),
                                        ReferralPartnerId = effectivePartnerId.Value,
                                        TestId = testId,
                                        CommissionType = SynOS.Models.Enums.Referral.CommissionType.Percentage,
                                        CommissionValue = discountPercentage,
                                        EffectiveFrom = today,
                                        IsActive = true
                                    });
                                }
                            }
                        }
                    }
                }
                catch (Exception learnEx)
                {
                    _logger.LogWarning(learnEx, "Non-fatal: Failed to auto-learn referral rate rule for partner {PartnerId}", effectivePartnerId);
                }
            }

            // If a ReceivableFact already exists for this visit, adjust its amount in-place (no delete/re-insert to prevent unique key violation)
            var receivable = await _context.ReceivableFacts.FirstOrDefaultAsync(r => r.SourceVisitId == visitId);
            if (receivable != null)
            {
                var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                decimal invoiceTotal = invoice?.Total ?? 0m;
                decimal oldAmount = receivable.Amount;
                decimal newAmount = Math.Max(0m, invoiceTotal - b2bDiscountAmount);
                receivable.DebtorId = effectivePartnerId ?? receivable.DebtorId;
                receivable.ReferralPartnerId = effectivePartnerId ?? receivable.ReferralPartnerId;
                receivable.Amount = newAmount;
                receivable.RecordedAt = DateTimeOffset.UtcNow;

                decimal diff = newAmount - oldAmount;
                if (diff != 0)
                {
                    var today = visit.CreatedAt.Date;
                    var bStats = await _context.BranchOperationalStats.FirstOrDefaultAsync(s => s.BranchId == visit.BranchId && s.Date == today);
                    if (bStats != null) bStats.PrepaidBillsTotal += diff;

                    var uStats = await _context.UserOperationalStats.FirstOrDefaultAsync(s => s.UserId == actorUserId && s.Date == today);
                    if (uStats != null) uStats.PrepaidBillsTotal += diff;
                }
            }

            await _context.SaveChangesAsync();

            string patientName = $"{visit.Patient?.FirstName} {visit.Patient?.LastName}".Trim();
            var meta = JsonSerializer.Serialize(new
            {
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                B2BDiscountAmount = b2bDiscountAmount,
                Action = "B2BDiscountUpdated"
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"B2B Referral Discount set to ₹{b2bDiscountAmount:N2} by {actorName}",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                visit.VisitId,
                meta
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
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.ReferralPartner)
                .Include(v => v.SecondaryReferralPartner)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");

            CheckVisitOwnership(visit);

            visit.PaymentCollectionModel = "PartnerCollects";
            visit.BillingType = BillingType.PrepaidPartner;
            visit.Status = VisitStatus.Paid;
            if (visit.Token.StartsWith("DRAFT", StringComparison.OrdinalIgnoreCase) || visit.Token.StartsWith("D-", StringComparison.OrdinalIgnoreCase))
            {
                await AssignOfficialTokenAsync(visitId, actorUserId);
            }
            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            // Re-fetch or use latest invoice
            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            decimal invoiceTotal = invoice?.Total ?? 0m;
            decimal b2bConcession = visit.B2BDiscountAmount ?? 0m;
            decimal partnerReceivableAmount = Math.Max(0m, invoiceTotal - b2bConcession);

            if (invoice != null)
            {
                invoice.Status = "Paid";

                var existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.InvoiceId == invoice.InvoiceId && p.Method == "PartnerAccount");
                if (existingPayment == null)
                {
                    var partnerPayment = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        Amount = invoiceTotal,
                        Method = "PartnerAccount",
                        ReceiptNo = $"SYS-{visit.Token}",
                        ReceivedAt = DateTime.UtcNow,
                        ReceivedByUserId = actorUserId
                    };
                    _context.Payments.Add(partnerPayment);
                }
                else
                {
                    existingPayment.Amount = invoiceTotal;
                }
            }

            // Create or update ReceivableFact for the B2B Partner / Doctor
            var effectivePartnerId = visit.SecondaryReferralPartnerId ?? visit.ReferralPartnerId;
            ReceivableFact? receivable = null;
            if (effectivePartnerId.HasValue)
            {
                receivable = await _context.ReceivableFacts.FirstOrDefaultAsync(r => r.SourceVisitId == visitId);
                bool isNewReceivable = false;
                if (receivable == null)
                {
                    isNewReceivable = true;
                    receivable = new ReceivableFact
                    {
                        ReceivableFactId = Guid.NewGuid(),
                        SourceVisitId = visit.VisitId,
                        ReferralPartnerId = effectivePartnerId.Value,
                        DebtorId = effectivePartnerId.Value,
                        Amount = partnerReceivableAmount,
                        Currency = invoice?.Currency ?? "INR",
                        OccurredAt = DateTimeOffset.UtcNow,
                        RecordedAt = DateTimeOffset.UtcNow
                    };
                    _context.ReceivableFacts.Add(receivable);
                }
                else
                {
                    receivable.Amount = partnerReceivableAmount;
                    receivable.ReferralPartnerId = effectivePartnerId.Value;
                    receivable.DebtorId = effectivePartnerId.Value;
                    receivable.RecordedAt = DateTimeOffset.UtcNow;
                }

                await _context.SaveChangesAsync();

                string actorNameNow = await GetActorNameAsync(actorUserId);
                if (isNewReceivable)
                {
                    await _operationalEventWriter.WriteEventAsync(
                        BranchEventType.RECEIVABLE_CREATED,
                        _userContext.CurrentBranchId.ToString(),
                        visit.VisitId.ToString(),
                        visit.Token,
                        $"Prepaid B2B receivable of ₹{partnerReceivableAmount:N2} created for partner",
                        actorNameNow,
                        actorUserId.ToString(),
                        false,
                        receivable.ReceivableFactId,
                        null,
                        TimelineVisibility.Hide,
                        intentId ?? Guid.NewGuid()
                    );
                }
            }
            else
            {
                await _context.SaveChangesAsync();
            }

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient?.FirstName} {visit.Patient?.LastName}".Trim();

            var testCodes = visit.Orders?.Select(o => o.Test?.TestCode).Where(c => !string.IsNullOrEmpty(c)).ToList() ?? new List<string?>();
            string doctorName = visit.SecondaryReferralPartner?.Name ?? visit.ReferralPartner?.Name ?? "";

            var prepaidMetadata = JsonSerializer.Serialize(new 
            { 
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                Method = "PartnerCollects", 
                Status = "Paid",
                Amount = invoice?.Total ?? 0, // Added Amount for Frontend Display
                Total = invoice?.Total ?? 0,   // Alias for robustness
                TestCodes = testCodes,
                DoctorName = doctorName
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

        public async Task MarkVisitAsInsuranceAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Invoices)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");

            CheckVisitOwnership(visit);

            visit.BillingType = BillingType.Insurance;
            visit.PaymentCollectionModel = "InsuranceClaim";
            visit.Status = VisitStatus.Paid;
            if (visit.Token.StartsWith("DRAFT", StringComparison.OrdinalIgnoreCase) || visit.Token.StartsWith("D-", StringComparison.OrdinalIgnoreCase))
            {
                await AssignOfficialTokenAsync(visitId, actorUserId);
            }
            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);
        }

        public async Task MarkVisitAsCorporateAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Invoices)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");

            CheckVisitOwnership(visit);

            visit.BillingType = BillingType.Corporate;
            visit.PaymentCollectionModel = "CorporateB2B";
            visit.Status = VisitStatus.Paid;
            if (visit.Token.StartsWith("DRAFT", StringComparison.OrdinalIgnoreCase) || visit.Token.StartsWith("D-", StringComparison.OrdinalIgnoreCase))
            {
                await AssignOfficialTokenAsync(visitId, actorUserId);
            }
            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);
        }

        public async Task<string> AssignOfficialTokenAsync(Guid visitId, Guid actorUserId)
        {
            var visit = await _context.Visits.FindAsync(visitId);
            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");

            // Only assign if it's still a DRAFT or doesn't have a proper token yet
            if (!visit.Token.StartsWith("DRAFT", StringComparison.OrdinalIgnoreCase) && !visit.Token.StartsWith("D-", StringComparison.OrdinalIgnoreCase)) 
                return visit.Token;

            var branchId = (visit.BranchId.HasValue && visit.BranchId.Value != Guid.Empty) 
                ? visit.BranchId.Value 
                : _userContext.CurrentBranchId;

            var newToken = await GenerateDailyTokenAsync(visit.Department, _labTimeProvider.GetLabToday(), actorUserId, branchId);
            
            visit.Token = newToken;
            visit.TokenDate = _labTimeProvider.GetLabToday();
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
            decimal totalRefunded = 0m;
            string refundMethod = "None";
            if (invoice != null)
            {
                invoice.Status = "Cancelled";

                // Refund logic: Calculate exact net paid amount
                var netPaid = invoice.Payments.Sum(p => p.Amount);
                if (netPaid > 0)
                {
                    totalRefunded = netPaid;
                    var firstPayment = invoice.Payments.FirstOrDefault(p => p.Amount > 0);
                    refundMethod = !string.IsNullOrWhiteSpace(cancelDto.RefundMethod) 
                        ? (cancelDto.RefundMethod.IndexOf("Cash", StringComparison.OrdinalIgnoreCase) >= 0 ? "Cash" : "UPI") 
                        : (firstPayment?.Method ?? "Cash");

                    var refundPayment = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        Amount = -netPaid,
                        Method = refundMethod,
                        ReceiptNo = $"REF-CAN-{DateTime.UtcNow:yyyyMMdd}-{visit.Token}",
                        ReceivedAt = DateTime.UtcNow,
                        ReceivedByUserId = cancelDto.CancelledByUserId
                    };
                    _context.Payments.Add(refundPayment);
                }

                // If B2B partner receivable existed for this visit, settle/void it
                var partnerReceivable = await _context.ReceivableFacts
                    .FirstOrDefaultAsync(r => r.SourceVisitId == visitId && r.DebtorType == DebtorType.Partner);
                if (partnerReceivable != null)
                {
                    partnerReceivable.SettledAt = DateTimeOffset.UtcNow;
                    partnerReceivable.AmountReceived = partnerReceivable.Amount;
                }
            }

            // Cancel all Orders on the visit
            foreach (var order in visit.Orders)
            {
                if (order.Status != OrderStatus.Cancelled)
                {
                    order.Status = OrderStatus.Cancelled;
                    order.CancellationReason = OrderCancellationReason.PatientRequest;
                    order.CancelledAt = DateTime.UtcNow;
                    order.CancelledByUserId = cancelDto.CancelledByUserId;
                }
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
                BranchEventType.VISIT_CANCELLED,
                visit.BranchId.HasValue ? visit.BranchId.Value.ToString() : "GLOBAL",
                visit.VisitId.ToString(),
                visit.Token,
                $"Visit Cancelled: {cancelDto.Reason}. Refund: ₹{totalRefunded}",
                actorName,
                cancelDto.CancelledByUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                visit.VisitId,
                JsonSerializer.Serialize(new { 
                    PatientName = patientName, 
                    ActorName = actorName, 
                    Status = "Cancelled", 
                    TotalRefunded = totalRefunded, 
                    RefundMethod = refundMethod,
                    Reason = cancelDto.Reason 
                })
            );

            return cancellation;
        }

        private async Task<string> GenerateDailyTokenAsync(string department, DateTime labLocalDay, Guid actorUserId, Guid? targetBranchId = null)
        {
            var branchId = (targetBranchId.HasValue && targetBranchId.Value != Guid.Empty) 
                ? targetBranchId.Value 
                : _userContext.CurrentBranchId;

            var branch = await _context.Branches.FindAsync(branchId)
                ?? await _context.Branches.FirstOrDefaultAsync(b => b.Code == "MAIN")
                ?? await _context.Branches.FirstOrDefaultAsync();

            if (branch != null)
            {
                branchId = branch.BranchId;
            }
            
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

        private async Task<ResolvedTestDto?> ResolveTestForReceptionAsync(string testCode, bool isChild = false, Guid? visitId = null)
        {
            var normalized = testCode?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(normalized)) return null;

            var allTests = await _testsCacheService.GetCachedTestsAsync();

            // Unified Visit Model: Decouple from Visit.Department gating.
            // Resolve purely by Code, Active status, and valid pricing.
            var test = allTests
                .FirstOrDefault(t => t.TestCode.ToUpper() == normalized && t.IsActive);

            if (test == null)
            {
                // Self-healing fallback: If test is missing from cache, query database directly
                test = await _context.Tests
                    .Include(t => t.DepartmentMaster)
                    .Include(t => t.TestPricings)
                    .Include(t => t.ProfileChildren)
                    .FirstOrDefaultAsync(t => t.TestCode.ToUpper() == normalized);

                if (test == null)
                {
                    // If still missing, automatically auto-provision standard test with active pricing
                    var isRad = normalized.Contains("XRAY") || normalized.Contains("CT") || normalized.Contains("MRI") || normalized.Contains("RAD");
                    var dept = isRad
                        ? await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Code == "RAD")
                        : await _context.DepartmentMasters.FirstOrDefaultAsync(d => d.Code == "HEM" || d.Code == "PATHOLOGY");
                    var mod = isRad ? await _context.ModalityMasters.FirstOrDefaultAsync(m => normalized.Contains(m.Code)) : null;

                    test = new Test
                    {
                        TestId = Guid.NewGuid(),
                        TestCode = normalized,
                        TestName = normalized == "CBC" ? "Complete Blood Count (CBC)" : normalized,
                        Category = isRad ? "Radiology" : "Hematology",
                        SpecimenTypeCode = isRad ? "NO_SPECIMEN" : "EDTA",
                        DepartmentId = dept?.DepartmentId,
                        ModalityId = mod?.ModalityId,
                        IsProfile = false,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.Tests.Add(test);

                    var pricing = new TestPricing
                    {
                        PricingId = Guid.NewGuid(),
                        TestId = test.TestId,
                        BasePrice = isRad ? 1500.00m : 250.00m,
                        EffectiveFrom = DateTime.UtcNow.AddMonths(-1),
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    _context.TestPricings.Add(pricing);
                    await _context.SaveChangesAsync();
                    _testsCacheService.InvalidateTestsCache();
                }
            }

            // Diagnostic Logging
            _logger.LogWarning($"[Validation] Resolving Test: {test.TestCode}, IsProfile: {test.IsProfile}, HasChildren: {test.ProfileChildren?.Any() == true}, SpecimenType: {test.SpecimenTypeCode}");

            // Resilient SpecimenType resolution: Default safely if unmapped instead of throwing
            if (string.IsNullOrEmpty(test.SpecimenTypeCode))
            {
                bool isRadiology = string.Equals(test.DepartmentMaster?.MacroDepartment, "Radiology", StringComparison.OrdinalIgnoreCase) ||
                                   string.Equals(test.DepartmentMaster?.Code, "RAD", StringComparison.OrdinalIgnoreCase);
                test.SpecimenTypeCode = isRadiology ? "NO_SPECIMEN" : "EDTA";
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
            if (basePrice <= 0 && test.TestPricings != null && test.TestPricings.Any())
            {
                basePrice = test.TestPricings.OrderByDescending(tp => tp.CreatedAt).Select(tp => tp.BasePrice).FirstOrDefault();
            }
            if (basePrice <= 0)
            {
                // Fallback to reasonable nominal default for catalog test to avoid breaking visit intake
                basePrice = 100.00m;
            }

            // --- MULTI-PAYER CORPORATE PRICING OVERRIDE ---
            if (visitId.HasValue)
            {
                var visitContext = await _context.Visits.AsNoTracking().FirstOrDefaultAsync(v => v.VisitId == visitId.Value);
                if (visitContext != null && visitContext.BillingType == SynOS.Models.Enums.BillingType.Corporate && visitContext.CorporateAccountId.HasValue)
                {
                    var corporateRule = await _context.CorporateRateRules.AsNoTracking()
                        .FirstOrDefaultAsync(r => r.CorporateAccountId == visitContext.CorporateAccountId.Value && r.TestId == test.TestId && r.IsActive);
                    if (corporateRule != null && corporateRule.ContractedPrice > 0)
                    {
                        basePrice = corporateRule.ContractedPrice;
                        _logger.LogInformation("Resolved CONTRACTED CORPORATE price {Price} for Test {TestCode} (CorporateAccountId: {CorpId})", basePrice, test.TestCode, visitContext.CorporateAccountId.Value);
                    }
                }
            }
            // ----------------------------------------------

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

            var resolved = await ResolveTestForReceptionAsync(testCode, isChild, visitId);
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

        public async Task<BatchEditVisitResponseDto> BatchEditVisitAsync(Guid visitId, BatchEditVisitDto dto, Guid actorUserId)
        {
            if (dto == null) throw new ArgumentNullException(nameof(dto));
            if (string.IsNullOrWhiteSpace(dto.Reason)) throw new ArgumentException("A valid operational reason is required for visit amendments.");

            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Invoices).ThenInclude(i => i.PartialPayments)
                .Include(v => v.Orders).ThenInclude(o => o.Test)
                .Include(v => v.Specimens)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");
            CheckVisitOwnership(visit);

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) throw new InvalidOperationException("No invoice associated with this visit.");

            string actorName = await GetActorNameAsync(actorUserId);
            var affectedTubes = new List<string>();
            bool reSignRequired = false;

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // === CAPTURE TRUE "BEFORE" SNAPSHOT FOR FORENSIC AUDIT ===
                    decimal previousInvoiceTotal = invoice.Total;
                    decimal previousGross = invoice.GrossAmount;
                    decimal previousDiscount = invoice.DiscountAmount;
                    Guid? previousPartnerId = visit.ReferralPartnerId;
                    var previousPartner = visit.ReferralPartnerId.HasValue 
                        ? await _context.ReferralPartners.FindAsync(visit.ReferralPartnerId.Value) 
                        : null;
                    string previousDoctorName = previousPartner?.Name ?? visit.ReferrerText ?? "Direct / None";
                    string previousBillingMode = visit.PaymentCollectionModel == "PartnerCollects" ? "PrepaidPartner" : visit.BillingType.ToString();
                    decimal previousB2BDiscountAmount = visit.B2BDiscountAmount ?? 0m;
                    var previousReceivable = await _context.ReceivableFacts.FirstOrDefaultAsync(r => r.SourceVisitId == visitId && r.DebtorType == DebtorType.Partner);
                    decimal previousReceivableAmount = previousReceivable?.Amount ?? 0m;
                    string previousReceivablePartnerName = previousReceivable?.DebtorName ?? previousDoctorName;

                    var previousOrders = visit.Orders
                        .Where(o => o.Status != OrderStatus.Cancelled)
                        .Select(o => new { o.OrderId, o.TestCode, Name = o.Test != null ? o.Test.TestName : o.TestCode, Price = o.Price })
                        .ToList();

                    string prevFirstName = visit.Patient?.FirstName ?? "";
                    string prevLastName = visit.Patient?.LastName ?? "";
                    string prevMobile = visit.Patient?.CurrentPhoneNumber ?? "";
                    string prevGender = visit.Patient?.Gender ?? "";
                    int? prevAge = visit.Patient?.IsDateOfBirthKnown == true && visit.Patient.DateOfBirth > DateTime.MinValue
                        ? (int?)Math.Floor((DateTime.UtcNow - visit.Patient.DateOfBirth).TotalDays / 365.25)
                        : null;

                    // 1. Patient Demographics In-Place Updates
                    if (visit.Patient != null)
                {
                    if (!string.IsNullOrWhiteSpace(dto.FirstName)) visit.Patient.FirstName = dto.FirstName.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.LastName)) visit.Patient.LastName = dto.LastName.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.FirstName) || !string.IsNullOrWhiteSpace(dto.LastName))
                    {
                        visit.Patient.DisplayName = $"{visit.Patient.FirstName} {visit.Patient.LastName}".Trim();
                    }
                    if (dto.Age.HasValue && dto.Age.Value > 0)
                    {
                        var age = dto.Age.Value;
                        var unit = (dto.AgeUnit ?? "Y").ToUpper();
                        DateTime dob;
                        if (unit.StartsWith("M"))
                            dob = DateTime.UtcNow.AddMonths(-age);
                        else if (unit.StartsWith("D"))
                            dob = DateTime.UtcNow.AddDays(-age);
                        else
                            dob = DateTime.UtcNow.AddYears(-age);

                        visit.Patient.DateOfBirth = dob;
                        visit.Patient.IsDateOfBirthKnown = false;
                    }
                    if (!string.IsNullOrWhiteSpace(dto.Gender)) visit.Patient.Gender = dto.Gender.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.Mobile)) visit.Patient.CurrentPhoneNumber = dto.Mobile.Trim();
                    visit.Patient.UpdatedAt = DateTime.UtcNow;
                }

                // 2. Referral & Doctor Updates
                if (dto.UpdateReferralPartner)
                {
                    visit.ReferralPartnerId = dto.ReferralPartnerId;
                    visit.IsReferred = dto.ReferralPartnerId.HasValue;
                }
                else if (dto.ReferralPartnerId.HasValue)
                {
                    visit.ReferralPartnerId = dto.ReferralPartnerId.Value;
                    visit.IsReferred = true;
                }

                if (dto.UpdateSecondaryPartner)
                {
                    visit.SecondaryReferralPartnerId = dto.SecondaryPartnerId;
                }
                else if (dto.SecondaryPartnerId.HasValue)
                {
                    visit.SecondaryReferralPartnerId = dto.SecondaryPartnerId.Value;
                }

                if (dto.ReferrerText != null)
                {
                    visit.ReferrerText = dto.ReferrerText.Trim();
                }

                // 3. Billing Mode
                if (!string.IsNullOrWhiteSpace(dto.BillingMode))
                {
                    if (dto.BillingMode.Equals("PrepaidPartner", StringComparison.OrdinalIgnoreCase))
                    {
                        visit.PaymentCollectionModel = "PartnerCollects";
                        visit.BillingType = BillingType.PrepaidPartner;
                    }
                    else if (dto.BillingMode.Equals("Insurance", StringComparison.OrdinalIgnoreCase))
                    {
                        visit.BillingType = BillingType.Insurance;
                    }
                    else if (dto.BillingMode.Equals("Corporate", StringComparison.OrdinalIgnoreCase))
                    {
                        visit.BillingType = BillingType.Corporate;
                    }
                    else
                    {
                        visit.PaymentCollectionModel = "LabCollects";
                        visit.BillingType = BillingType.Standard;
                    }
                }

                // 4. Test Cancellations (Removals)
                if (dto.RemoveOrderIds != null && dto.RemoveOrderIds.Any())
                {
                    foreach (var orderId in dto.RemoveOrderIds)
                    {
                        var order = visit.Orders.FirstOrDefault(o => o.OrderId == orderId && o.Status != OrderStatus.Cancelled);
                        if (order != null)
                        {
                            order.Status = OrderStatus.Cancelled;
                            order.CancellationReason = OrderCancellationReason.ReceptionCorrection;
                            order.CancelledAt = DateTime.UtcNow;
                            order.CancelledByUserId = actorUserId;

                            // Handle linked specimen
                            if (order.SpecimenId.HasValue)
                            {
                                var otherActiveUsingSpecimen = visit.Orders.Any(o => o.OrderId != order.OrderId && o.SpecimenId == order.SpecimenId && o.Status != OrderStatus.Cancelled);
                                if (!otherActiveUsingSpecimen)
                                {
                                    var spec = visit.Specimens.FirstOrDefault(s => s.SpecimenId == order.SpecimenId.Value);
                                    if (spec != null)
                                    {
                                        spec.Status = SpecimenStatus.Cancelled;
                                        if (!string.IsNullOrEmpty(spec.TubeName)) affectedTubes.Add($"Discard/Cancelled: {spec.TubeName}");
                                    }
                                }
                            }
                        }
                    }
                }

                // 5. Test Additions
                if (dto.AddTestCodes != null && dto.AddTestCodes.Any())
                {
                    var allCachedTests = await _testsCacheService.GetCachedTestsAsync();
                    foreach (var code in dto.AddTestCodes)
                    {
                        if (string.IsNullOrWhiteSpace(code)) continue;
                        if (visit.Orders.Any(o => o.TestCode.Equals(code, StringComparison.OrdinalIgnoreCase) && o.Status != OrderStatus.Cancelled)) continue;

                        var currentOrdersList = visit.Orders.ToList();
                        await ExpandAndAddOrdersInternalAsync(visitId, code, currentOrdersList, false);

                        // Newly added order(s)
                        var newlyAddedOrders = visit.Orders.Where(o => o.TestCode.Equals(code, StringComparison.OrdinalIgnoreCase) && o.Status == OrderStatus.Pending && o.SpecimenId == null).ToList();
                        foreach (var newOrd in newlyAddedOrders)
                        {
                            var testDef = allCachedTests.FirstOrDefault(t => t.TestId == newOrd.TestId);
                            if (testDef != null && !string.IsNullOrEmpty(testDef.SpecimenTypeCode))
                            {
                                // Check if visit has matching active collected/pending specimen with same specimen type code
                                var existingMatch = visit.Specimens.FirstOrDefault(s => s.SpecimenTypeCode == testDef.SpecimenTypeCode && s.Status != SpecimenStatus.Cancelled);
                                if (existingMatch != null)
                                {
                                    // Automatic container re-use!
                                    newOrd.SpecimenId = existingMatch.SpecimenId;
                                    if (existingMatch.Status == SpecimenStatus.Collected)
                                    {
                                        newOrd.Status = OrderStatus.Collected;
                                    }
                                    affectedTubes.Add($"Reused: {existingMatch.TubeName ?? existingMatch.SpecimenTypeCode}");
                                }
                                else
                                {
                                    affectedTubes.Add($"New Collection Needed: {testDef.SpecimenTypeCode}");
                                }
                            }
                        }
                    }
                }

                // 6. Discount Updates
                if (dto.UpdateDiscount)
                {
                    var activeFacts = await _context.DiscountFacts
                        .Where(df => df.InvoiceId == invoice.InvoiceId && df.IsActive)
                        .ToListAsync();
                    foreach (var f in activeFacts) f.IsActive = false;

                    if (dto.DiscountValue.HasValue && dto.DiscountValue.Value > 0)
                    {
                        var mode = dto.DiscountType ?? "Percentage";
                        var discType = mode.Equals("Flat", StringComparison.OrdinalIgnoreCase) ? DiscountType.Flat : DiscountType.Percentage;
                        var customMaster = await _context.DiscountMasters
                            .FirstOrDefaultAsync(dm => dm.Code == "CUSTOM" && dm.IsActive);

                        if (customMaster == null)
                        {
                            customMaster = new DiscountMaster
                            {
                                DiscountDefinitionId = Guid.NewGuid(),
                                Name = "Custom Discount",
                                Code = "CUSTOM",
                                Type = discType,
                                Value = dto.DiscountValue.Value,
                                MaxLimit = 100000,
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.DiscountMasters.Add(customMaster);
                            await _context.SaveChangesAsync();
                        }

                        string appliedNote = string.IsNullOrWhiteSpace(dto.DiscountReason) ? actorName : $"{actorName} - {dto.DiscountReason.Trim()}";
                        var newFact = new DiscountFact
                        {
                            DiscountFactId = Guid.NewGuid(),
                            InvoiceId = invoice.InvoiceId,
                            DiscountDefinitionId = customMaster.DiscountDefinitionId,
                            AppliedBy = appliedNote,
                            AppliedAt = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = true,
                            Type = discType,
                            Value = dto.DiscountValue.Value,
                            GrossAmount = 0, DiscountAmount = 0, NetAmountAfterDiscount = 0
                        };
                        _context.DiscountFacts.Add(newFact);
                    }
                }

                // 6b. B2B Partner Concession Updates
                if (dto.B2BDiscountValue.HasValue || dto.B2BDiscountAmount.HasValue)
                {
                    visit.B2BDiscountAmount = dto.B2BDiscountAmount;
                    visit.B2BDiscountType = dto.B2BDiscountType ?? "Flat";
                    visit.B2BDiscountValue = dto.B2BDiscountValue;
                    visit.B2BDiscountEnteredBy = actorName;
                    visit.B2BDiscountEnteredAt = DateTimeOffset.UtcNow;
                }

                // 7. Re-signing Check for Existing Signed Reports
                var existingReports = await _context.Reports
                    .Where(r => r.VisitId == visitId && (r.Status == "Signed" || r.Status == "ManualVerified"))
                    .ToListAsync();

                if (existingReports.Any())
                {
                    reSignRequired = true;
                    foreach (var rep in existingReports)
                    {
                        rep.Status = "ReadyForVerification";
                        rep.CurrentVersion += 1;
                        rep.SignedAt = null;
                        rep.SignedByUserId = null;
                        rep.VerifiedAt = null;
                        rep.VerifiedByUserId = null;
                        rep.FinalSnapshotJson = null;
                        rep.PdfUrl = null;
                    }
                }

                await _context.SaveChangesAsync();

                // 8. Re-calculate Financials via Revenue Engine
                await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

                // 9. Financial Cash Settlement Reconciliation
                string settlementAction = "None";
                if (dto.SettlementDifference < 0)
                {
                    // Refund to patient via Cash from Register
                    decimal refundAmt = Math.Abs(dto.SettlementDifference);
                    var refundPayment = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        Amount = -refundAmt, // Negative payment reduces total paid
                        Method = "Cash",
                        ReceiptNo = $"REF-{DateTime.UtcNow:yyyyMMdd}-{visit.Token}",
                        ReceivedAt = DateTime.UtcNow,
                        ReceivedByUserId = actorUserId
                    };
                    _context.Payments.Add(refundPayment);
                    settlementAction = "RefundIssued";
                    await _context.SaveChangesAsync();

                    // Re-apply snapshot to lock in status
                    await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);
                }
                else if (dto.SettlementDifference > 0)
                {
                    // Additional payment collected at desk
                    decimal dueAmt = dto.SettlementDifference;
                    var addPayment = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        Amount = dueAmt,
                        Method = !string.IsNullOrWhiteSpace(dto.PaymentMethod) ? dto.PaymentMethod : "Cash",
                        ReceiptNo = $"REC-{DateTime.UtcNow:yyyyMMdd}-{visit.Token}",
                        ReceivedAt = DateTime.UtcNow,
                        ReceivedByUserId = actorUserId
                    };
                    _context.Payments.Add(addPayment);
                    settlementAction = "AdditionalPaymentRecorded";
                    await _context.SaveChangesAsync();

                    // Re-apply snapshot to lock in status
                    await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);
                }

                // 9b. Synchronize B2B Partner Receivable & PartnerAccount Payments
                var effectivePartnerId = visit.SecondaryReferralPartnerId ?? visit.ReferralPartnerId;
                var existingReceivable = await _context.ReceivableFacts.FirstOrDefaultAsync(r => r.SourceVisitId == visitId && r.DebtorType == DebtorType.Partner);

                if (visit.PaymentCollectionModel == "PartnerCollects" || visit.BillingType == BillingType.PrepaidPartner)
                {
                    // Adjust system payment for PartnerAccount to align with revised invoice total
                    var partnerPayment = invoice.Payments.FirstOrDefault(p => p.Method == "PartnerAccount");
                    if (partnerPayment != null)
                    {
                        partnerPayment.Amount = invoice.Total;
                    }
                    else if (invoice.Payments.Count == 0 || invoice.Payments.All(p => p.Method == "PartnerAccount"))
                    {
                        var newPartnerPayment = new Payment
                        {
                            PaymentId = Guid.NewGuid(),
                            InvoiceId = invoice.InvoiceId,
                            Amount = invoice.Total,
                            Method = "PartnerAccount",
                            ReceiptNo = $"SYS-{visit.Token}",
                            ReceivedAt = DateTime.UtcNow,
                            ReceivedByUserId = actorUserId
                        };
                        _context.Payments.Add(newPartnerPayment);
                    }

                    if (effectivePartnerId.HasValue)
                    {
                        var partner = await _context.ReferralPartners.FindAsync(effectivePartnerId.Value);
                        decimal b2bReceivableAmount = invoice.Total;
                        if (visit.B2BDiscountAmount.HasValue && visit.B2BDiscountAmount.Value > 0)
                        {
                            b2bReceivableAmount = Math.Max(0m, invoice.Total - visit.B2BDiscountAmount.Value);
                        }

                        if (existingReceivable != null)
                        {
                            existingReceivable.DebtorId = effectivePartnerId.Value;
                            existingReceivable.ReferralPartnerId = effectivePartnerId.Value;
                            existingReceivable.DebtorName = partner?.Name ?? "Referral Partner";
                            existingReceivable.ClaimReference = $"Prepaid Partner Bill: {partner?.Name ?? "Partner"}";
                            existingReceivable.Amount = b2bReceivableAmount;
                            existingReceivable.RecordedAt = DateTimeOffset.UtcNow;
                            _context.ReceivableFacts.Update(existingReceivable);
                        }
                        else
                        {
                            var newFact = new ReceivableFact
                            {
                                ReceivableFactId = Guid.NewGuid(),
                                SourceVisitId = visit.VisitId,
                                DebtorType = DebtorType.Partner,
                                DebtorId = effectivePartnerId.Value,
                                DebtorName = partner?.Name ?? "Referral Partner",
                                ClaimReference = $"Prepaid Partner Bill: {partner?.Name ?? "Partner"}",
                                ReferralPartnerId = effectivePartnerId.Value,
                                Amount = b2bReceivableAmount,
                                Currency = invoice.Currency ?? "INR",
                                OccurredAt = DateTimeOffset.UtcNow,
                                RecordedAt = DateTimeOffset.UtcNow
                            };
                            _context.ReceivableFacts.Add(newFact);
                        }
                    }
                    await _context.SaveChangesAsync();
                    await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);
                }
                else
                {
                    // Switched away from PartnerCollects to standard lab collection
                    if (existingReceivable != null && existingReceivable.SettledAt == null)
                    {
                        _context.ReceivableFacts.Remove(existingReceivable);
                    }
                    var partnerPayments = invoice.Payments.Where(p => p.Method == "PartnerAccount").ToList();
                    if (partnerPayments.Any())
                    {
                        _context.Payments.RemoveRange(partnerPayments);
                    }
                    await _context.SaveChangesAsync();
                    await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);
                }

                // 10. Compile Dynamic Forensic Audit Diff & Branch Operational Event
                decimal newInvoiceTotal = invoice.Total;
                decimal newGross = invoice.GrossAmount;
                decimal newDiscount = invoice.DiscountAmount;
                var newReceivable = await _context.ReceivableFacts.FirstOrDefaultAsync(r => r.SourceVisitId == visitId && r.DebtorType == DebtorType.Partner);
                decimal newReceivableAmount = newReceivable?.Amount ?? 0m;
                var newPartner = visit.ReferralPartnerId.HasValue 
                    ? await _context.ReferralPartners.FindAsync(visit.ReferralPartnerId.Value) 
                    : null;
                string newDoctorName = newPartner?.Name ?? visit.ReferrerText ?? "Direct / None";
                string newReceivablePartnerName = newReceivable?.DebtorName ?? newDoctorName;
                string newBillingMode = visit.PaymentCollectionModel == "PartnerCollects" ? "PrepaidPartner" : visit.BillingType.ToString();

                var newOrders = visit.Orders
                    .Where(o => o.Status != OrderStatus.Cancelled)
                    .Select(o => new { o.OrderId, o.TestCode, Name = o.Test != null ? o.Test.TestName : o.TestCode, Price = o.Price })
                    .ToList();

                var changeSummary = new List<string>();

                // 1. Doctor / Referral Shift
                bool doctorChanged = !string.Equals(previousDoctorName, newDoctorName, StringComparison.OrdinalIgnoreCase);
                if (doctorChanged)
                {
                    changeSummary.Add($"Doctor: {previousDoctorName} → {newDoctorName}");
                }

                // 2. B2B Partner Receivable Shift
                bool receivableChanged = (previousReceivableAmount != newReceivableAmount) || 
                                         (previousPartnerId != visit.ReferralPartnerId && newReceivableAmount > 0);
                if (receivableChanged)
                {
                    decimal shift = newReceivableAmount - previousReceivableAmount;
                    string shiftSign = shift >= 0 ? $"+₹{shift:N0}" : $"-₹{Math.Abs(shift):N0}";
                    if (previousPartnerId != visit.ReferralPartnerId && previousPartnerId.HasValue && visit.ReferralPartnerId.HasValue)
                    {
                        changeSummary.Add($"Receivable Reallocated: {previousReceivablePartnerName} (₹{previousReceivableAmount:N0}) → {newReceivablePartnerName} (₹{newReceivableAmount:N0})");
                    }
                    else
                    {
                        changeSummary.Add($"Partner Receivable: ₹{previousReceivableAmount:N0} → ₹{newReceivableAmount:N0} ({shiftSign})");
                    }
                }

                // 3. Billing Mode Shift
                bool modeChanged = !string.Equals(previousBillingMode, newBillingMode, StringComparison.OrdinalIgnoreCase);
                if (modeChanged)
                {
                    changeSummary.Add($"Mode: {previousBillingMode} → {newBillingMode}");
                }

                // 4. Test Additions
                var addedOrders = newOrders.Where(no => !previousOrders.Any(po => po.TestCode.Equals(no.TestCode, StringComparison.OrdinalIgnoreCase))).ToList();
                if (addedOrders.Any())
                {
                    changeSummary.Add($"+Tests: {string.Join(", ", addedOrders.Select(a => $"{a.Name} (₹{a.Price:N0})"))}");
                }

                // 5. Test Removals
                var removedOrders = previousOrders.Where(po => !newOrders.Any(no => no.OrderId == po.OrderId)).ToList();
                if (removedOrders.Any())
                {
                    changeSummary.Add($"-Cancelled: {string.Join(", ", removedOrders.Select(r => $"{r.Name} (₹{r.Price:N0})"))}");
                }

                // 6. Discount Shift
                if (previousDiscount != newDiscount)
                {
                    changeSummary.Add($"Discount: ₹{previousDiscount:N0} → ₹{newDiscount:N0}");
                }

                // 7. Demographics Shift
                var demoDiffs = new List<string>();
                string newFirst = visit.Patient?.FirstName ?? "";
                string newLast = visit.Patient?.LastName ?? "";
                if (!string.Equals(prevFirstName, newFirst, StringComparison.OrdinalIgnoreCase) || !string.Equals(prevLastName, newLast, StringComparison.OrdinalIgnoreCase))
                {
                    demoDiffs.Add($"Name: '{prevFirstName} {prevLastName}'.Trim() → '{newFirst} {newLast}'.Trim()");
                }
                if (dto.Age.HasValue && prevAge.HasValue && prevAge.Value != dto.Age.Value)
                {
                    demoDiffs.Add($"Age: {prevAge.Value}Y → {dto.Age.Value}Y");
                }
                if (!string.IsNullOrWhiteSpace(dto.Gender) && !string.Equals(prevGender, dto.Gender, StringComparison.OrdinalIgnoreCase))
                {
                    demoDiffs.Add($"Gender: {prevGender} → {dto.Gender}");
                }
                if (!string.IsNullOrWhiteSpace(dto.Mobile) && !string.Equals(prevMobile, dto.Mobile, StringComparison.OrdinalIgnoreCase))
                {
                    demoDiffs.Add($"Phone: {prevMobile} → {dto.Mobile}");
                }
                if (demoDiffs.Any())
                {
                    changeSummary.Add($"Demographics: {string.Join(", ", demoDiffs)}");
                }

                // 8. Bill Amount Net Shift
                if (previousInvoiceTotal != newInvoiceTotal)
                {
                    decimal billShift = newInvoiceTotal - previousInvoiceTotal;
                    string shiftSign = billShift >= 0 ? $"+₹{billShift:N0}" : $"-₹{Math.Abs(billShift):N0}";
                    changeSummary.Add($"Bill Total: ₹{previousInvoiceTotal:N0} → ₹{newInvoiceTotal:N0} ({shiftSign})");
                }

                // 9. Settlement Desk Action
                if (settlementAction == "RefundIssued")
                {
                    changeSummary.Add($"Cash Refund: ₹{Math.Abs(dto.SettlementDifference):N0} disbursed at desk");
                }
                else if (settlementAction == "AdditionalPaymentRecorded")
                {
                    changeSummary.Add($"Payment Collected: ₹{dto.SettlementDifference:N0} received at desk");
                }

                if (!changeSummary.Any())
                {
                    changeSummary.Add("Visit Details Verified (Zero Financial Shift)");
                }

                var correctionType = addedOrders.Any() ? CorrectionType.AddTest :
                    (removedOrders.Any() ? CorrectionType.RemoveTest :
                    (doctorChanged ? CorrectionType.ChangeReferral :
                    (previousDiscount != newDiscount ? CorrectionType.ChangeDiscount :
                    (previousInvoiceTotal != newInvoiceTotal ? CorrectionType.PriceOverride : CorrectionType.PriceOverride))));

                var auditCorrectionFact = new CorrectionFact
                {
                    CorrectionId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    InvoiceId = invoice.InvoiceId,
                    CorrectionType = correctionType,
                    PreviousAmount = previousInvoiceTotal,
                    NewAmount = newInvoiceTotal,
                    CreatedBy = actorUserId,
                    CreatedAt = DateTime.UtcNow,
                    Reason = dto.Reason,
                    PayloadJson = JsonSerializer.Serialize(new
                    {
                        ChangeSummary = changeSummary,
                        DetailedDiff = new
                        {
                            Doctor = new { Previous = previousDoctorName, New = newDoctorName, Changed = doctorChanged },
                            Receivable = new { 
                                Previous = previousReceivableAmount, 
                                New = newReceivableAmount, 
                                Shift = newReceivableAmount - previousReceivableAmount,
                                PreviousPartner = previousReceivablePartnerName,
                                NewPartner = newReceivablePartnerName,
                                Changed = receivableChanged 
                            },
                            BillingMode = new { Previous = previousBillingMode, New = newBillingMode, Changed = modeChanged },
                            BillTotal = new { Previous = previousInvoiceTotal, New = newInvoiceTotal, Shift = newInvoiceTotal - previousInvoiceTotal },
                            TestsAdded = addedOrders,
                            TestsRemoved = removedOrders,
                            Demographics = demoDiffs,
                            Settlement = new { Action = settlementAction, Difference = dto.SettlementDifference }
                        },
                        dto.FirstName,
                        dto.LastName,
                        dto.Age,
                        dto.Gender,
                        dto.Mobile,
                        dto.AddTestCodes,
                        dto.RemoveOrderIds,
                        dto.ReferralPartnerId,
                        dto.SecondaryPartnerId,
                        dto.ReferrerText,
                        dto.BillingMode,
                        dto.DiscountValue,
                        dto.DiscountReason,
                        DoctorChange = doctorChanged ? $"{previousDoctorName} → {newDoctorName}" : newDoctorName,
                        dto.SettlementDifference,
                        SettlementAction = settlementAction,
                        dto.Reason,
                        ActorName = actorName
                    })
                };
                _context.CorrectionFacts.Add(auditCorrectionFact);
                await _context.SaveChangesAsync();

                await _operationalEventWriter.WriteEventAsync(
                    BranchEventType.VISIT_UPDATED,
                    _userContext.CurrentBranchId.ToString(),
                    visit.VisitId.ToString(),
                    visit.Token,
                    $"Visit amended by {actorName}. Reason: {dto.Reason}",
                    actorName,
                    actorUserId.ToString(),
                    true, null, null,
                    TimelineVisibility.Surface,
                    visit.VisitId,
                    auditCorrectionFact.PayloadJson
                );

                await transaction.CommitAsync();

                return new BatchEditVisitResponseDto
                {
                    Success = true,
                    Message = "Visit successfully amended.",
                    VisitId = visit.VisitId,
                    Token = visit.Token,
                    RevisedNetTotal = invoice.Total,
                    SettlementDifference = dto.SettlementDifference,
                    SettlementAction = settlementAction,
                    AffectedTubes = affectedTubes,
                    ReSignRequired = reSignRequired
                };
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to batch edit visit {VisitId}: {Message}", visitId, ex.Message);
                    throw;
                }
            });
        }
    }
}