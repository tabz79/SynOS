using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Models.Enums; // Required for TubeType

namespace SynOS.Services
{
    public class ReceptionFlowService : IReceptionFlowService
    {
        private readonly SynOSDbContext _context;
        private readonly IVisitService _visitService;
        private readonly IInvoiceService _invoiceService;
        private readonly IAccessionService _accessionService;
        private readonly ILogger<ReceptionFlowService> _logger;
        private readonly ITestsCacheService _testsCacheService; // Injected to retrieve test details

        public ReceptionFlowService(
            SynOSDbContext context,
            IVisitService visitService,
            IInvoiceService invoiceService,
            IAccessionService accessionService,
            ILogger<ReceptionFlowService> logger,
            ITestsCacheService testsCacheService) // Injected
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _visitService = visitService ?? throw new ArgumentNullException(nameof(visitService));
            _invoice_service_check(context, visitService, invoiceService, accessionService, logger);

            _invoiceService = invoiceService ?? throw new ArgumentNullException(nameof(invoiceService));
            _accessionService = accessionService ?? throw new ArgumentNullException(nameof(accessionService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _testsCacheService = testsCacheService; // can be null; code tolerates null and falls back to DB
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
        /// </summary>
        public async Task<ReceptionStartVisitResponse> StartVisitAsync(ReceptionStartVisitRequest request, Guid actorUserId)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (request.TestCodes == null || request.TestCodes.Length == 0) throw new ArgumentException("At least one test code is required");

            // Validate tests exist before attempting to create the visit.
            await EnsureAllTestCodesExistAsync(request.TestCodes, request.Dept);

            // Create visit DTO for VisitService (reuse your existing VisitService orchestration)
            var visitDto = new VisitCreateDto
            {
                PatientId = request.PatientId,
                Department = request.Dept,
                TestCodes = request.TestCodes.ToList(), // Convert array to list
                ReferrerId = request.ReferrerId,
                AppointmentId = request.AppointmentId,
                DiscountAmount = request.DiscountAmount,
                DiscountPercent = request.DiscountPercent,
                TaxPercent = request.TaxPercent,
                Notes = request.Notes,
                CombinedBillingGroupId = request.CombinedBillingGroupId
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
            }

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
    }
}