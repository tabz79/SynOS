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

namespace SynOS.Services
{
    public class VisitService : IVisitService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<VisitService> _logger;
        private readonly ITestsCacheService _testsCacheService; // Injected
        private readonly IAuditService _auditService; // Injected
        private readonly IOperationalEventWriter _operationalEventWriter; // ADDED
        private readonly IUserContext _userContext; // ADDED

        // TODO: Configure lab timezone in appsettings or a dedicated config service
        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; // Default to server local timezone

        public VisitService(
            SynOSDbContext context, 
            ILogger<VisitService> logger, 
            ITestsCacheService testsCacheService, 
            IAuditService auditService,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext) // ADDED
        {
            _context = context;
            _logger = logger;
            _testsCacheService = testsCacheService;
            _auditService = auditService;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext)); // ADDED
        }

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
            // TODO: Implement full idempotency record table and check here
            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                // For now, just log that an idempotency key was provided
                _logger.LogInformation("Idempotency key received for CreateVisit: {IdempotencyKey}", idempotencyKey);
            }

            var patient = await _context.Patients.FindAsync(visitDto.PatientId);
            if (patient == null || patient.IsSoftDeleted)
            {
                throw new KeyNotFoundException($"Patient with ID {visitDto.PatientId} not found or is inactive.");
            }

            var labLocalToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var token = await GenerateDailyTokenAsync(visitDto.Department, labLocalToday, actorUserId);

            var visit = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = visitDto.PatientId,
                BranchId = _userContext.CurrentBranchId, // FIX: Set from context
                Token = token,
                TokenDate = labLocalToday,
                Department = visitDto.Department,
                Status = "PendingPayment",
                CreatedAt = DateTime.UtcNow,
                // Persist referral metadata
                IsReferred = visitDto.IsReferred ?? false,
                ReferralPartnerId = visitDto.ReferralPartnerId,
                PaymentCollectionModel = visitDto.PaymentCollectionModel
            };

            _context.Visits.Add(visit);

            decimal grossAmount = 0;
            var orders = new List<Order>();

            foreach (var testCode in visitDto.TestCodes)
            {
                // Robust lookup for Test and active PriceConfig
                var resolvedTest = await ResolveTestForReceptionAsync(testCode, visitDto.Department);

                if (resolvedTest == null)
                {
                    throw new KeyNotFoundException($"Test '{testCode}' not found or no active price config for department '{visitDto.Department}'.");
                }
                
                var order = new Order
                {
                    OrderId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    TestId = resolvedTest.TestId,
                    TestCode = resolvedTest.TestCode,
                    Department = resolvedTest.Department,
                    Status = "Pending",
                    Price = resolvedTest.BasePrice, // Use resolved BasePrice
                    Discount = 0, // TODO: Implement discount logic
                    CreatedAt = DateTime.UtcNow
                };
                orders.Add(order);
                grossAmount += resolvedTest.BasePrice;
            }
            _context.Orders.AddRange(orders);

            // TODO: Implement proper tax calculation logic
            decimal taxRate = 0.05m; // 5% tax placeholder
            decimal netAmount = grossAmount; // Assuming no discounts for now
            decimal taxAmount = netAmount * taxRate;
            decimal totalAmount = netAmount + taxAmount;

            var invoice = new Invoice
            {
                InvoiceId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                GrossAmount = grossAmount,
                DiscountAmount = 0, // TODO: Implement discount logic
                NetAmount = netAmount,
                TaxAmount = taxAmount,
                Total = totalAmount,
                Currency = "INR", // Mandatory field
                Status = "PendingPayment",
                DueDate = labLocalToday.AddDays(7), // Due in 7 days from local date
                CreatedAt = DateTime.UtcNow
            };
            _context.Invoices.Add(invoice);

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(actorUserId, "CreateVisit", "Visit", visit.VisitId, visitDto); // Audit visit creation

            // Emit Operational Event: BILL_GENERATED
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.BILL_GENERATED,
                _userContext.CurrentBranchId.ToString(), // FIX: Use context
                visit.VisitId.ToString(),
                visit.Token,
                $"Bill generated for {invoice.Total:F2}",
                "User",
                actorUserId.ToString()
            );

            return visit;
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