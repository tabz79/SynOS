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

        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local;

        public VisitService(
            SynOSDbContext context,
            ILogger<VisitService> logger,
            ITestsCacheService testsCacheService,
            IAuditService auditService,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext,
            IReferralFinancialService referralFinancialService,
            IRevenueFactWriter revenueFactWriter,
            IRevenueEngine revenueEngine)
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

            var labLocalToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var token = $"DRAFT-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

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

            // Create Orders (with recursive expansion)
            var currentOrders = new List<Order>();
            foreach (var testCode in visitDto.TestCodes)
            {
                await ExpandAndAddOrdersInternalAsync(visit.VisitId, testCode, visitDto.Department, currentOrders, false);
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
                    ReceivedByUserId = actorUserId
                };
                _context.Payments.Add(payment);
                invoice.Status = "Paid";
                visit.Status = "Paid";

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
                Status = visit.Status
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

            return visit;
        }

        public async Task<Visit> AddTestToVisitAsync(Guid visitId, string testCode, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient) // ADDED
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                // .Include(v => v.Orders).ThenInclude(o => o.Samples) // REFACTOR: Sample removed
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null)
                throw new KeyNotFoundException("Visit not found.");

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
            await ExpandAndAddOrdersInternalAsync(visitId, testCode, visit.Department, currentOrders, false);

            await _context.SaveChangesAsync();

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

            return visit;
        }

        public async Task<Visit> RemoveTestFromVisitAsync(Guid visitId, string testCode, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient) // ADDED
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.Orders) //.ThenInclude(o => o.Samples) // REFACTOR: Removed
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (IsSampleCollectionStarted(visit))
                throw new InvalidOperationException("Cannot remove test. Sample collection has already started.");

            if (visit.Status == "Cancelled")
                throw new InvalidOperationException($"Cannot modify a cancelled visit.");

            var order = visit.Orders.FirstOrDefault(o => o.TestCode.Equals(testCode, StringComparison.OrdinalIgnoreCase));
            if (order == null) throw new KeyNotFoundException($"Test '{testCode}' not found.");

            // REFACTOR: Disable Sample Check
            /*
            var hasCollectedSample = await _context.Samples.AnyAsync(s => s.OrderId == order.OrderId && s.Status != SampleStatus.Pending);
            if (hasCollectedSample)
            {
                throw new InvalidOperationException($"Cannot remove test '{testCode}' because the sample has already been collected or processed. Use a proper clinical cancellation flow instead.");
            }
            */

            order.Status = SynOS.Models.Enums.OrderStatus.Cancelled;
            order.CancellationReason = SynOS.Models.Enums.OrderCancellationReason.ReceptionCorrection;
            order.CancelledAt = DateTime.UtcNow;
            order.CancelledByUserId = actorUserId;

            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, actorUserId);

            // ENRICHED METADATA
            string actorName = await GetActorNameAsync(actorUserId);
            string patientName = $"{visit.Patient.FirstName} {visit.Patient.LastName}";

            var removeTestMetadata = JsonSerializer.Serialize(new 
            { 
                PatientName = patientName,
                TokenId = visit.Token,
                ActorName = actorName,
                TestCode = testCode, 
                Action = "Removed" 
            });

            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_UPDATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Removed test {testCode}",
                actorName,
                actorUserId.ToString(),
                true, null, null,
                TimelineVisibility.Surface,
                visit.VisitId,
                removeTestMetadata
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
                .Include(v => v.Patient) // ADDED
                .Include(v => v.Orders) //.ThenInclude(o => o.Samples) // REFACTOR: Removed
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            if (IsSampleCollectionStarted(visit))
                throw new InvalidOperationException("Cannot remove referral partner after sample collection.");

            visit.ReferralPartnerId = null;
            visit.IsReferred = false;
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

            visit.PaymentCollectionModel = "PartnerCollects";
            visit.Status = "Paid";
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
            return await GenerateDailyTokenAsync("Pathology", DateTime.Today, actorUserId);
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
                            && (string.IsNullOrEmpty(dept) || (t.DepartmentMaster != null && t.DepartmentMaster.Name == dept)));

            if (test == null) return null;

            // Price Logic: Get currently active price from TestPricings
            // If no pricing found, default to 0 (or handle as error)
            var currentPriceObj = test.TestPricings?
                .Where(tp => tp.EffectiveFrom <= DateTime.UtcNow)
                .OrderByDescending(tp => tp.EffectiveFrom)
                .FirstOrDefault();

            decimal basePrice = currentPriceObj?.BasePrice ?? 0;
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
                Department = test.DepartmentMaster?.Name ?? "Unknown",
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

        private async Task ExpandAndAddOrdersInternalAsync(Guid visitId, string testCode, string dept, List<Order> collection, bool isChild)
        {
            var resolved = await ResolveTestForReceptionAsync(testCode, dept);
            if (resolved == null) return;

            // Prevent duplicates in same visit
            if (collection.Any(o => o.TestId == resolved.TestId && o.Status != SynOS.Models.Enums.OrderStatus.Cancelled))
                 return;

            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                VisitId = visitId,
                TestId = resolved.TestId,
                TestCode = resolved.TestCode,
                Department = resolved.Department,
                Status = SynOS.Models.Enums.OrderStatus.Pending,
                Price = isChild ? 0 : resolved.BasePrice, // Children in profile are 0-priced
                Discount = 0,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.Orders.Add(order);
            collection.Add(order);

            // Fetch full test from cache to check for children
            var allTests = await _testsCacheService.GetCachedTestsAsync();
            var test = allTests.FirstOrDefault(t => t.TestId == resolved.TestId);

            if (test != null && test.IsProfile && test.ProfileChildren != null)
            {
                foreach (var mapping in test.ProfileChildren)
                {
                    var child = allTests.FirstOrDefault(t => t.TestId == mapping.ChildTestId);
                    if (child != null)
                    {
                        await ExpandAndAddOrdersInternalAsync(visitId, child.TestCode, dept, collection, true);
                    }
                }
            }
        }

        private async Task<string> GetActorNameAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            return user?.Name ?? "Unknown User";
        }
    }
}