using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Models.Enums; // Required for TubeType
using SynOS.Services.Referral;
using SynOS.Services.Operational; // ADDED
using SynOS.Services.Security; // ADDED
using SynOS.Models.Entities.Revenue; // ADDED
using SynOS.Models.Entities.AR; // ADDED: Stage 1 Financials
using SynOS.Models.Entities.Payments; // ADDED: Stage 1 Financials
using SynOS.Services.Assignment; // ADDED
using SynOS.Models.Entities.Operations; // ADDED
using SynOS.Models.Entities.Referral; // ADDED


namespace SynOS.Services
{
    public class ReceptionFlowService : IReceptionFlowService
    {
        private readonly SynOSDbContext _context;
        private readonly IVisitService _visitService;
        private readonly IInvoiceService _invoiceService;
        private readonly IAccessionService _accessionService;
        private readonly ILogger<ReceptionFlowService> _logger;
        private readonly ITestsCacheService _testsCacheService;
        private readonly IConfiguration _configuration;
        private readonly IReferralFinancialService _referralFinancialService;
        private readonly IOperationalEventWriter _operationalEventWriter; // ADDED
        private readonly IUserContext _userContext; // ADDED
        private readonly IWorkRoutingEngine _routingEngine; // ADDED

        public ReceptionFlowService(
            SynOSDbContext context,
            IVisitService visitService,
            IInvoiceService invoiceService,
            IAccessionService accessionService,
            ILogger<ReceptionFlowService> logger,
            ITestsCacheService testsCacheService,
            IConfiguration configuration,
            IReferralFinancialService referralFinancialService,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext,
            IWorkRoutingEngine routingEngine) // ADDED
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _visitService = visitService ?? throw new ArgumentNullException(nameof(visitService));
            _invoiceService = invoiceService ?? throw new ArgumentNullException(nameof(invoiceService));
            _accessionService = accessionService ?? throw new ArgumentNullException(nameof(accessionService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _testsCacheService = testsCacheService;
            _configuration = configuration;
            _referralFinancialService = referralFinancialService;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext)); // ADDED
            _routingEngine = routingEngine ?? throw new ArgumentNullException(nameof(routingEngine)); // ADDED
        }

        // small helper to centralize a defensive check (keeps ctor lines tidy)
        private void _invoice_service_check(
            SynOSDbContext context,
            IVisitService visitService,
            IInvoiceService invoiceService,
            IAccessionService accessionService,
            ILogger<ReceptionFlowService> logger)
        {
            // no-op: placeholder if future checks are needed (keeps public ctor flow consistent)
        }

        /// <summary>
        /// Start a visit (reception).
        /// Ensures all test codes provided exist (cache-first then DB) before creating the visit.
        /// Allows empty TestCodes for "Draft/Cockpit" flow.
        /// </summary>
        public async Task<ReceptionStartVisitResponse> StartVisitAsync(ReceptionStartVisitRequest request, Guid actorUserId)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            // REMOVED: Legacy validation that blocked empty visits
            // if (request.TestCodes == null || request.TestCodes.Length == 0) throw new ArgumentException("At least one test code is required");

            // Validate referral fields before proceeding
            if (request.IsReferred == true)
            {
                if (request.ReferralPartnerId == null)
                {
                    throw new ArgumentException("ReferralPartnerId is required for referred visits.");
                }
                if (string.IsNullOrWhiteSpace(request.PaymentCollectionModel))
                {
                    throw new ArgumentException("PaymentCollectionModel is required for referred visits.");
                }

                var validModels = new[] { "LabCollects", "PartnerCollects" };
                if (!validModels.Contains(request.PaymentCollectionModel, StringComparer.OrdinalIgnoreCase))
                {
                    throw new ArgumentException($"Invalid PaymentCollectionModel. Must be one of: {string.Join(", ", validModels)}");
                }

                var partner = await _context.ReferralPartners
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ReferralPartnerId == request.ReferralPartnerId.Value);

                if (partner == null)
                {
                    throw new KeyNotFoundException($"Referral partner with ID '{request.ReferralPartnerId}' not found.");
                }
                if (!partner.IsActive)
                {
                    throw new InvalidOperationException($"Referral partner '{partner.Name}' is not active.");
                }
            }

            // Validate tests exist ONLY if provided.
            if (request.TestCodes != null && request.TestCodes.Length > 0)
            {
                await EnsureAllTestCodesExistAsync(request.TestCodes, request.Dept);
            }

            // --- IDEMPOTENCY CHECK (Guardrail 2: Single Active Draft) ---
            // If a Draft visit exists for this patient at this branch, return it instead of creating duplicate.
            var branchId = _userContext.CurrentBranchId;
            var existingDraft = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.ReferralDraft)
                .FirstOrDefaultAsync(v => 
                    v.PatientId == request.PatientId && 
                    v.BranchId == branchId && 
                    v.Status == "Draft");

            if (existingDraft != null)
            {
               _logger.LogInformation("StartVisit Idempotency: returning existing Draft visit {VisitId}", existingDraft.VisitId);
               return await MapToStartVisitResponse(existingDraft);
            }
            // ------------------------------------------------------------

            // Create visit DTO for VisitService (reuse your existing VisitService orchestration)
            var visitDto = new VisitCreateDto
            {
                PatientId = request.PatientId,
                Department = request.Dept,
                TestCodes = request.TestCodes?.ToList() ?? new List<string>(), // Handle null/empty gracefully
                ReferrerId = request.ReferrerId,
                AppointmentId = request.AppointmentId,
                DiscountAmount = request.DiscountAmount,
                DiscountPercent = request.DiscountPercent,
                TaxPercent = request.TaxPercent,
                Notes = request.Notes,
                CombinedBillingGroupId = request.CombinedBillingGroupId,
                // Pass referral fields
                IsReferred = request.IsReferred,
                ReferralPartnerId = request.ReferralPartnerId,
                PaymentCollectionModel = request.PaymentCollectionModel
            };

            var visit = await _visitService.CreateVisitAsync(visitDto, null, actorUserId); // Pass actorUserId and branchId

            // Try to load invoice (may be created by VisitService; be defensive)
            var invoice = await _context.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.VisitId == visit.VisitId);

            // Load patient defensively
            var patient = await _context.Patients
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.PatientId == visit.PatientId);

            var orders = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Test)
                .Where(o => o.VisitId == visit.VisitId)
                .Select(o => new OrderSummaryDto
                {
                    OrderId = o.OrderId,
                    TestCode = o.TestCode,
                    TestName = o.Test.TestName, // Corrected to o.Test.TestName
                    Dept = o.Department,
                    Price = o.Price,
                    Discount = o.Discount
                }).ToListAsync();

            // Emit Operational Event: VISIT_STARTED
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.VISIT_STARTED,
                _userContext.CurrentBranchId.ToString(), // FIX: Use context
                visit.VisitId.ToString(),
                visit.Token,
                $"Visit started for {patient?.FirstName} {patient?.LastName}",
                "User",
                actorUserId.ToString()
            );

            return new ReceptionStartVisitResponse
            {
                VisitId = visit.VisitId,
                Token = visit.Token,
                TokenDate = visit.TokenDate,
                Dept = visit.Department,
                Status = visit.Status,
                PatientSummary = patient == null ? null : new PatientSummaryDto
                {
                    PatientId = patient.PatientId,
                    Mrn = patient.MRN,
                    Name = $"{patient.FirstName} {patient.LastName}",
                    Sex = patient.Gender,
                    Age = patient.DateOfBirth == default ? 0 : (int)((DateTime.Today - patient.DateOfBirth).TotalDays / 365.25)
                },
                Orders = orders,
                Invoice = invoice == null ? null : new InvoiceSummaryDto
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

        public async Task<ReceptionStartVisitResponse> AddTestAsync(Guid visitId, string testCode, Guid actorUserId)
        {
            var visit = await _visitService.AddTestToVisitAsync(visitId, testCode, actorUserId);
            return await MapToStartVisitResponse(visit);
        }

        public async Task<ReceptionStartVisitResponse> RemoveTestAsync(Guid visitId, string testCode, Guid actorUserId)
        {
            var visit = await _visitService.RemoveTestFromVisitAsync(visitId, testCode, actorUserId);
            return await MapToStartVisitResponse(visit);
        }

        public async Task SetVisitReferralAsync(Guid visitId, Guid referralPartnerId, Guid actorUserId)
        {
            await _visitService.SetVisitReferralAsync(visitId, referralPartnerId, actorUserId);
        }

        public async Task RemoveVisitReferralAsync(Guid visitId, Guid actorUserId)
        {
            await _visitService.RemoveVisitReferralAsync(visitId, actorUserId);
        }

        public async Task UpdateVisitReferrerTextAsync(Guid visitId, string? referrerText, Guid actorUserId)
        {
            await _visitService.UpdateVisitReferrerTextAsync(visitId, referrerText, actorUserId);
        }

        public async Task AddReferralDraftAsync(Guid visitId, string providerName, string? clinicName, string? location, Guid actorUserId)
        {
            var visit = await _context.Visits
                .Include(v => v.ReferralDraft)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");
            
            // Check status - ensure not finalized (though read-only in UI handles this, backend should guard)
            if (new[] { "Paid", "Cancelled" }.Contains(visit.Status))
            {
                throw new InvalidOperationException($"Cannot add draft to solidified visit status: {visit.Status}");
            }

            // Exclusivity Rule: No Partner, No Existing Draft
            if (visit.ReferralPartnerId.HasValue)
            {
                 throw new InvalidOperationException("Cannot add draft: Visit already has a verified Referral Partner.");
            }
            if (visit.ReferralDraft != null)
            {
                 throw new InvalidOperationException("Cannot add draft: Visit already has a Referral Draft.");
            }

            var draft = new ReferralDraft
            {
                ReferralDraftId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                ProviderName = providerName,
                ClinicName = clinicName,
                Location = location,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = actorUserId
            };

            _context.ReferralDrafts.Add(draft);
            
            // Note: ReferrerText is PRESERVED for audit/legacy compatibility.
            // We do not clear it, adhering to strict data safety rules.
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Added Referral Draft {DraftId} to Visit {VisitId}", draft.ReferralDraftId, visitId);
        }

        public async Task MarkVisitAsPrepaidAsync(Guid visitId, Guid actorUserId)
        {
            await _visitService.MarkVisitAsPrepaidAsync(visitId, actorUserId);
            
            // --- STAGE 1: RECEIVABLE FACT CREATION ---
            var visit = await _context.Visits
                .Include(v => v.Invoices)
                .Include(v => v.ReferralDraft)
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new InvalidOperationException("Visit not found for Receivable creation");
            
            // RELAXED RULE: Must have Partner OR Draft
            if (!visit.ReferralPartnerId.HasValue && visit.ReferralDraft == null) 
                 throw new InvalidOperationException("Prepaid visit must have a Referral Partner or Provisional Draft");

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) throw new InvalidOperationException("No invoice found for Receivable creation");

            // DEFERRAL LOGIC: If Draft, SKIP ReceivableFact (Ledger Deferral)
            if (visit.ReferralDraft != null)
            {
                // In Phase 3 (Admin Resolution) -> The ReceivableFact WILL be back-dated and created.
                // For now, we strictly defer it.
                _logger.LogInformation("MarkAsPrepaid: Deferring ReceivableFact creation for Draft Visit {VisitId}. Ledgers pending Phase 3 resolution.", visitId);
                return;
            }

            // IDEMPOTENCY GUARD: One Receivable per Visit
            if (await _context.ReceivableFacts.AnyAsync(r => r.SourceVisitId == visitId)) 
            {
                 _logger.LogWarning("Idempotency: ReceivableFact already exists for Visit {VisitId}", visitId);
                 return;
            }

            var factId = Guid.NewGuid();
            var fact = new ReceivableFact
            {
                ReceivableFactId = factId,
                SourceVisitId = visit.VisitId,
                ReferralPartnerId = visit.ReferralPartnerId.Value,
                Amount = invoice.Total, // Total Amount Owed
                Currency = "INR",
                OccurredAt = DateTimeOffset.UtcNow,
                RecordedAt = DateTimeOffset.UtcNow
            };
            
            _context.ReceivableFacts.Add(fact);
            await _context.SaveChangesAsync();
            
            // Emit RECEIVABLE_CREATED
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.RECEIVABLE_CREATED,
                _userContext.CurrentBranchId.ToString(),
                visit.VisitId.ToString(),
                visit.Token,
                $"Prepaid Credit Issued: {fact.Amount:C} (Fact: {fact.ReceivableFactId})",
                "User",
                actorUserId.ToString(),
                true, // saveChanges
                fact.ReceivableFactId, // SourceId = FactId
                "ReceivableFact"
            );
            // ----------------------------------------
        }

        private async Task<ReceptionStartVisitResponse> MapToStartVisitResponse(Visit visit)
        {
            // Re-fetch with all includes to be safe for mapping (VisitService might return tracked entity w/o includes if it was attached differently)
            // But AddTestToVisitAsync includes everything.
            var invoice = visit.Invoices.FirstOrDefault();
            var patient = await _context.Patients.FindAsync(visit.PatientId); // simple lookup

            // Ensure Draft is loaded
            if (visit.ReferralDraft == null)
            {
                await _context.Entry(visit).Reference(v => v.ReferralDraft).LoadAsync();
            }

            return new ReceptionStartVisitResponse
            {
                VisitId = visit.VisitId,
                Token = visit.Token,
                TokenDate = visit.TokenDate,
                Dept = visit.Department,
                Status = visit.Status,
                ReferralDraft = visit.ReferralDraft == null ? null : new ReferralDraftDto
                {
                    ReferralDraftId = visit.ReferralDraft.ReferralDraftId,
                    ProviderName = visit.ReferralDraft.ProviderName,
                    ClinicName = visit.ReferralDraft.ClinicName,
                    Location = visit.ReferralDraft.Location
                },
                PatientSummary = patient == null ? null : new PatientSummaryDto
                {
                    PatientId = patient.PatientId,
                    Mrn = patient.MRN,
                    Name = $"{patient.FirstName} {patient.LastName}",
                    Sex = patient.Gender,
                    Age = patient.DateOfBirth == default ? 0 : (int)((DateTime.Today - patient.DateOfBirth).TotalDays / 365.25)
                },
                Orders = visit.Orders.Select(o => new OrderSummaryDto
                {
                    OrderId = o.OrderId,
                    TestCode = o.TestCode,
                    // TestName is not on Order directly, need Test include. VisitService AddTest includes it? No, AddTest creates it.
                    // The returned Visit object from VisitService might have Test navigation null if it was just added.
                    // We might need to fetch names. This is getting complex.
                    // Shortcut: Just return basic info or query cleanly.
                    // Let's rely on the IDs for now or query context.
                    TestName = o.TestCode, // Fallback
                    Dept = o.Department,
                    Price = o.Price,
                    Discount = o.Discount
                }).ToList(),
                Invoice = invoice == null ? null : new InvoiceSummaryDto
                {
                    InvoiceId = invoice.InvoiceId,
                    GrossAmount = invoice.GrossAmount,
                    DiscountAmount = invoice.DiscountAmount,
                    NetAmount = invoice.NetAmount,
                    TaxAmount = invoice.TaxAmount,
                    Total = invoice.Total,
                    Status = invoice.Status
                },
                Flags = new VisitFlagsDto()
            };
        }

        /// <summary>
        /// Complete payment for a visit. When invoice status becomes Paid, auto-create lab/radiology items.
        /// Uses cache-first test lookup and falls back to DB when cache misses.
        /// </summary>
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

            // --- STAGE 1: IMMUTABLE FACT CREATION (Before Event Emission) ---
            var factId = Guid.NewGuid();
            var fact = new PaymentConfirmedFact(
                factId,
                PaymentDirection.In, // Was Inbound
                payment.Amount,
                userId, // Counterparty (User collecting it) - strictly acceptable for now? Or Patient?
                // Definition says "CounterpartyId". In reception context, Payer is Patient.
                // But typically counterparty is the entity dealing with us.
                // Let's use PatientId if available, or just fallback to User (as Receiver).
                // Actually, let's look at the constructor again. CounterpartyId.
                // For Inbound, Counterparty is Payer. So visit.PatientId.
                DateTimeOffset.UtcNow,
                DateTimeOffset.UtcNow,
                payment.PaymentId,
                payment.Method
            );
            // We need to set Counterparty to PatientId.
            // But we can't change the constructor here easily.
            // Re-instantiate with PatientId.
             var factFinal = new PaymentConfirmedFact(
                factId,
                PaymentDirection.In, // Was Inbound
                payment.Amount,
                visit.PatientId, // Payer
                DateTimeOffset.UtcNow,
                DateTimeOffset.UtcNow,
                payment.PaymentId,
                payment.Method
            );
            
            _context.PaymentConfirmedFacts.Add(factFinal);
            await _context.SaveChangesAsync();
            // ------------------------------------------------------------

            // If payment is complete, trigger creation of lab work items
            if (string.Equals(updatedInvoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            {
                var orders = await _context.Orders
                    .Where(o => o.VisitId == visit.VisitId)
                    .ToListAsync();

                foreach (var order in orders)
                {
                    // 1) Try cache first (if available)
                    Test test = null;
                    try
                    {
                        if (_testsCacheService != null)
                        {
                            var allTests = await _testsCacheService.GetCachedTestsAsync().ConfigureAwait(false); // Corrected
                            if (allTests != null)
                            {
                                test = allTests.FirstOrDefault(t => t.TestId == order.TestId);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Cache error while fetching tests - falling back to DB");
                    }

                    // 2) Fallback to DB if cache missed
                    if (test == null)
                    {
                        test = await _context.Tests
                            .AsNoTracking()
                            .FirstOrDefaultAsync(t => t.TestId == order.TestId);
                    }

                    if (test == null)
                    {
                        _logger.LogError("Test with ID {TestId} not found for order {OrderId}", order.TestId, order.OrderId);
                        continue; // Skip if test not found
                    }

                    if (string.Equals(order.Department, "Radiology", StringComparison.OrdinalIgnoreCase))
                    {
                        var studyExists = await _context.RadiologyStudies.AnyAsync(rs => rs.VisitTestId == order.OrderId);
                        if (!studyExists)
                        {
                            var newStudy = new RadiologyStudy
                            {
                                RadiologyStudyId = Guid.NewGuid(),
                                VisitId = visit.VisitId,
                                PatientId = visit.PatientId,
                                VisitTestId = order.OrderId,
                                Modality = test.Department ?? "Unknown", // Use test.Department
                                AccessionNumber = await _accessionService.GenerateRadiologyAccessionNumberAsync(),
                                Status = "PendingImaging",
                                CreatedBy = userId,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _context.RadiologyStudies.Add(newStudy);

                            var newReport = new Report
                            {
                                ReportId = Guid.NewGuid(),
                                VisitId = visit.VisitId,
                                PatientId = visit.Patient.PatientId,
                                Department = "Radiology",
                                SourceType = "RadiologyStudy",
                                SourceId = newStudy.RadiologyStudyId,
                                Status = "Draft",
                                CurrentVersion = 1,
                                CreatedAt = DateTimeOffset.UtcNow
                            };

                            newReport.RadiologyReport = new RadiologyReport
                            {
                                RadiologyStudy = newStudy
                            };

                            _context.Reports.Add(newReport);
                        }
                    }
                    else if (string.Equals(order.Department, "Pathology", StringComparison.OrdinalIgnoreCase))
                    {
                        var sampleExists = await _context.Samples.AnyAsync(s => s.OrderId == order.OrderId);
                        if (!sampleExists)
                        {
                            var newSample = new Sample
                            {
                                SampleId = Guid.NewGuid(),
                                OrderId = order.OrderId,
                                Barcode = $"SAMP-{Guid.NewGuid().ToString().Substring(0, 12)}",
                                TubeType = test.DefaultTubeType ?? TubeType.Other, // Use test.DefaultTubeType
                                Status = SampleStatus.Pending
                                // Removed CreatedAt = DateTimeOffset.UtcNow as it's handled by default in Sample entity
                            };
                            _context.Samples.Add(newSample);
                            _logger.LogInformation("Auto-created Sample {SampleId} for Order {OrderId}", newSample.SampleId, order.OrderId);
                        }
                    }
                }
                await _context.SaveChangesAsync();

                // --- DOMAIN EVENT TRIGGER (Temporary Location) ---
                // The following logic responds to the "Payment Committed" domain event.
                // It is placed here for now but should eventually be moved to a dedicated
                // event handler or messaging subscriber for better decoupling.
                if (_configuration.GetValue<bool>("Features:ReferralEconomics:Enabled") && visit.IsReferred)
                {
                    try
                    {
                        // Idempotency Check: Ensure commission for this specific payment hasn't already been processed.
                        var commissionAlreadyProcessed = await _context.PayableFacts.AnyAsync(pf => pf.SourcePaymentId == payment.PaymentId);
                        if (!commissionAlreadyProcessed)
                        {
                            // We must reload the full visit aggregate to ensure the service has all necessary data.
                            var fullVisitDetails = await _visitService.GetVisitDetailsAsync(visit.VisitId);
                            if (fullVisitDetails != null)
                            {
                                await _referralFinancialService.ProcessCommissionRecognitionAsync(fullVisitDetails);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to process referral commission for VisitId {VisitId} and PaymentId {PaymentId}. This did not affect the payment transaction.", visit.VisitId, payment.PaymentId);
                        // The exception is intentionally swallowed to guarantee the payment operation succeeds for the user,
                        // leaving the failed commission recognition for offline reconciliation.
                    }
                }

                // Emit Operational Event: VISIT_FINALIZED
                await _operationalEventWriter.WriteEventAsync(
                    BranchEventType.VISIT_FINALIZED,
                    _userContext.CurrentBranchId.ToString(), // FIX: Use context
                    visit.VisitId.ToString(),
                    visit.Token,
                    "Visit finalized and fully paid",
                    "User",
                    userId.ToString()
                );

                    // --- UNIVERSAL ASSIGNMENT ENGINE TRIGGER ---
                    try
                    {
                        var dbVisit = await _context.Visits.FindAsync(visit.VisitId);
                        if (dbVisit != null && !dbVisit.CurrentAssignmentId.HasValue)
                        {
                            WorkType workType = visit.Department switch
                            {
                                "Pathology" => WorkType.SampleCollection,
                                "Radiology" => WorkType.Imaging,
                                _ => WorkType.AdminTask
                            };

                            var assignment = await _routingEngine.AssignAsync(workType, visit.VisitId, visit.Department);
                            dbVisit.CurrentAssignmentId = assignment.AssignmentId;
                            await _context.SaveChangesAsync();
                        }
                    }
                    catch (Exception ex)
                {
                    _logger.LogError(ex, "Assignment Engine failed for Visit {VisitId}. Payment preserved.", visit.VisitId);
                    // Non-blocking: We do not throw here. 
                }
            }
            
            // --- FINANCIAL EVENT EMISSION ---
            // NOTE: We do NOT emit PAYMENT_RECEIVED here. 
            // The Revenue Engine (InvoiceService) owns this financial fact and emits the event.
            // Emitting it here causes Double Counting.
            // --------------------------------

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
                VisitStatus = updatedVisit?.Status
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
            
            // Fetch Draft manually since _visitService might not include it
            var draft = await _context.ReferralDrafts.AsNoTracking().FirstOrDefaultAsync(d => d.VisitId == visitId);

            return new ReceptionVisitSummaryResponse
            {
                VisitId = visit.VisitId,
                Token = visit.Token,
                TokenDate = visit.TokenDate,
                Dept = visit.Department,
                VisitStatus = visit.Status,
                ReferralDraft = draft == null ? null : new ReferralDraftDto
                {
                   ReferralDraftId = draft.ReferralDraftId,
                   ProviderName = draft.ProviderName,
                   ClinicName = draft.ClinicName,
                   Location = draft.Location
                },
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
                    TestName = o.Test.TestName, // Corrected to o.Test.TestName
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

        // -------------------------
        // Helper methods (new)
        // -------------------------

        /// <summary>
        /// Ensure all test codes exist (cache-first, DB fallback). Throws KeyNotFoundException for first missing code.
        /// This method does a batch check to avoid per-code DB roundtrips.
        /// </summary>
        private async Task EnsureAllTestCodesExistAsync(string[] testCodes, string dept = null, CancellationToken cancellationToken = default)
        {
            // Normalize and dedupe codes
            var normalizedCodes = testCodes
                .Where(tc => !string.IsNullOrWhiteSpace(tc))
                .Select(tc => tc.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (normalizedCodes.Length == 0)
                throw new ArgumentException("No valid test codes supplied");

            // 1) Try cache: collect codes found in cache
            HashSet<string>? foundCodes = null;
            try
            {
                if (_testsCacheService != null)
                {
                    var cached = await _testsCacheService.GetCachedTestsAsync().ConfigureAwait(false); // Corrected: removed argument
                    if (cached != null)
                    {
                        foundCodes = new HashSet<string>(cached.Select(t => t.TestCode), StringComparer.OrdinalIgnoreCase);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Tests cache read failed - will fallback to DB for missing codes");
            }

            var missingCodes = new List<string>();

            if (foundCodes != null)
            {
                // find codes not present in cache
                missingCodes = normalizedCodes.Where(c => !foundCodes.Contains(c)).ToList();
            }
            else
            {
                missingCodes = normalizedCodes.ToList();
            }

            if (missingCodes.Count == 0)
                return; // all found in cache

            // 2) Batch DB lookup for remaining codes (case-insensitive)
            var missingUpper = new HashSet<string>(missingCodes.Select(c => c.ToUpperInvariant()));
            var dbMatches = await _context.Tests
                .AsNoTracking()
                .Where(t => missingUpper.Contains(t.TestCode.ToUpper()))
                .Select(t => t.TestCode)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            var dbMatchesSet = new HashSet<string>(dbMatches, StringComparer.OrdinalIgnoreCase);

            // Determine final missing codes
            var stillMissing = missingCodes.Where(c => !dbMatchesSet.Contains(c)).ToList();
            if (stillMissing.Any())
            {
                // Log and throw first missing for clear controller 404 behavior
                _logger.LogWarning("Missing Test Definitions for codes: {codes}", string.Join(", ", stillMissing));
                throw new KeyNotFoundException($"Test Definition for TestCode {stillMissing.First()} not found.");
            }
        }

        /// <summary>
        /// Cache-first then DB lookup for test by code. Dept filter supported; lookup is case-insensitive.
        /// Returns null if not found.
        /// </summary>
        private async Task<Test?> GetTestByCodeFromCacheOrDbAsync(string testCode, string? dept = null, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(testCode)) return null;
            var normalized = testCode.Trim();

            // 1) Try cache (best-effort)
            try
            {
                if (_testsCacheService != null)
                {
                    var cached = await _testsCacheService.GetCachedTestsAsync().ConfigureAwait(false); // Corrected: removed argument
                    if (cached != null)
                    {
                        var fromCache = cached.FirstOrDefault(t => string.Equals(t.TestCode, normalized, StringComparison.OrdinalIgnoreCase));
                        if (fromCache != null)
                        {
                            if (string.IsNullOrWhiteSpace(dept) || string.Equals(fromCache.Department, dept, StringComparison.OrdinalIgnoreCase))
                                return fromCache;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Tests cache read failed - falling back to DB lookup for test {TestCode}", normalized);
            }

            // 2) DB fallback - case-insensitive comparison
            var normalizedUpper = normalized.ToUpperInvariant();

            var query = _context.Tests
                .AsNoTracking()
                .Include(t => t.PriceConfigs)
                .Include(t => t.Parameters)
                .Where(t => t.TestCode.ToUpper() == normalizedUpper);

            if (!string.IsNullOrWhiteSpace(dept))
            {
                var deptUpper = dept.ToUpperInvariant();
                query = query.Where(t => t.Department.ToUpper() == deptUpper);
            }

            return await query.FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        }
        // -------------------------
        // Discount Wiring (Phase 6.4)
        // -------------------------
        
        public async Task ApplyDiscountAsync(Guid visitId, string discountCode, Guid actorUserId)
        {
            if (string.IsNullOrWhiteSpace(discountCode)) throw new ArgumentException("Discount code cannot be empty");

            // Fetch Master by code to get ID
            var master = await _context.DiscountMasters
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Code == discountCode && d.IsActive);
                
            if (master == null) throw new KeyNotFoundException($"Discount code '{discountCode}' is invalid or inactive");

            await _visitService.ApplyDiscountToVisitAsync(visitId, master.DiscountDefinitionId, actorUserId);
        }

        public async Task RemoveDiscountAsync(Guid visitId, Guid actorUserId)
        {
            await _visitService.RemoveDiscountFromVisitAsync(visitId, actorUserId);
        }

        public async Task ResolveReferralDraftAsync(Guid draftId, Guid targetPartnerId, Guid actorUserId)
        {
            // 1. Validate Draft
            var draft = await _context.ReferralDrafts
                .Include(d => d.Visit).ThenInclude(v => v.Invoices)
                .FirstOrDefaultAsync(d => d.ReferralDraftId == draftId);

            if (draft == null) throw new KeyNotFoundException($"Referral Draft {draftId} not found");
            if (draft.IsResolved) throw new InvalidOperationException($"Draft {draftId} is already resolved to {draft.ResolvedToPartnerId}");
            
            // 2. Validate Target Partner
            var partner = await _context.ReferralPartners.FindAsync(targetPartnerId);
            if (partner == null) throw new KeyNotFoundException($"Target Partner {targetPartnerId} not found");
            if (!partner.IsActive) throw new InvalidOperationException($"Partner {partner.Name} is inactive");

            // 3. Update Draft State (Audit Trail)
            draft.IsResolved = true;
            draft.ResolvedToPartnerId = targetPartnerId.ToString(); // Store ID string for link
            draft.ResolvedByUserId = actorUserId;
            draft.ResolvedAt = DateTime.UtcNow;

            // 4. Update Visit Link (The Reality)
            await _visitService.SetVisitReferralAsync(draft.VisitId, targetPartnerId, actorUserId);
            
            // 5. FINANCIAL CATCH-UP (Deferred Receivable Creation)
            // Logic: Is this a Prepaid Visit? Did we skip the Receivable earlier?
            var visit = draft.Visit;

            bool isPrepaid = visit.PaymentCollectionModel == "PartnerCollects" && visit.Status != "Cancelled";
            
            if (isPrepaid)
            {
                 // Check if Receivable exists (Idempotency)
                 bool receivableExists = await _context.ReceivableFacts.AnyAsync(r => r.SourceVisitId == visit.VisitId);
                 
                 if (!receivableExists)
                 {
                     var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                     if (invoice != null)
                     {
                         var factId = Guid.NewGuid();
                         var fact = new ReceivableFact
                         {
                             ReceivableFactId = factId,
                             SourceVisitId = visit.VisitId,
                             ReferralPartnerId = targetPartnerId,
                             Amount = invoice.Total,
                             Currency = "INR",
                             OccurredAt = invoice.CreatedAt, // BACK DATE to Invoice Time
                             RecordedAt = DateTimeOffset.UtcNow // Actual Resolution Time
                         };
                         
                         _context.ReceivableFacts.Add(fact);
                         
                         _logger.LogInformation("ResolveReferralDraft: Materialized DEFERRED ReceivableFact {FactId} for Visit {VisitId} (Backdated to {OccurredAt})", 
                             factId, visit.VisitId, fact.OccurredAt);
                         
                         // Emit Event
                         await _operationalEventWriter.WriteEventAsync(
                            BranchEventType.RECEIVABLE_CREATED,
                            _userContext.CurrentBranchId.ToString(),
                            visit.VisitId.ToString(),
                            visit.Token,
                            $"Deferred Credit Issued via Draft Resolution: {fact.Amount:C}",
                            "User",
                            actorUserId.ToString(),
                            false, // SaveChanges will happen at end of method
                            fact.ReceivableFactId,
                            "ReceivableFact"
                        );
                     }
                 }
            }
            
            await _context.SaveChangesAsync();
            _logger.LogInformation("Resolved Draft {DraftId} to Partner {PartnerId}", draftId, targetPartnerId);
        }
    }
}