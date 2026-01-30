using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Models.DTOs; // ADDED
using SynOS.Models.Entities; 
using SynOS.Models.Enums;
using SynOS.Services.Operational;
using System.Collections.Generic; // ADDED

namespace SynOS.Services.Operations
{
    public class OperationsEngine : IOperationsEngine
    {
        private readonly SynOSDbContext _context;
        private readonly IOperationalEventWriter _eventWriter;

        public OperationsEngine(SynOSDbContext context, IOperationalEventWriter eventWriter)
        {
            _context = context;
            _eventWriter = eventWriter;
        }

        public async Task<OperationsStatsDto> GetDailyOperationsStatsAsync(Guid branchId)
        {
            if (branchId == Guid.Empty) throw new ArgumentException("BranchId required");

            // Server Local Time boundaries
            DateTime localStart = DateTime.Today; 
            DateTime localEnd = DateTime.Now;
            DateTime utcStart = localStart.ToUniversalTime();
            DateTime utcEnd = localEnd.ToUniversalTime();

            // 1. Pending Reports (Operational State)
            // Definition: Report exists, Visit is in this branch, Status is NOT Signed/Finalized
            var pendingReports = await _context.Reports
                .Join(_context.Visits, r => r.VisitId, v => v.VisitId, (r, v) => new { r, v })
                .CountAsync(x => x.v.BranchId == branchId && x.r.Status != "Signed" && x.r.Status != "Finalized");

            // 2. TAT (Operational Metric)
            var finalizedReports = await _context.Reports
                .Join(_context.Visits, r => r.VisitId, v => v.VisitId, (r, v) => new { r, v })
                .Where(x => x.v.BranchId == branchId && x.r.Status == "Signed" && x.r.SignedAt >= utcStart && x.r.SignedAt <= utcEnd)
                .Select(x => new { x.r.SignedAt, x.r.SourceId, x.r.SourceType })
                .ToListAsync();

            double avgTime = 0;
            if (finalizedReports.Any())
            {
                var durations = new System.Collections.Generic.List<double>();
                foreach (var report in finalizedReports)
                {
                    if (report.SourceType == "Order")
                    {
                        var sampleCollectedAt = await _context.Samples
                            .Where(s => s.OrderId == report.SourceId && s.CollectedAt.HasValue)
                            .Select(s => s.CollectedAt)
                            .FirstOrDefaultAsync();

                        if (sampleCollectedAt.HasValue && report.SignedAt.HasValue)
                        {
                            var minutes = (report.SignedAt.Value - sampleCollectedAt.Value).TotalMinutes;
                            if (minutes > 0) durations.Add(minutes);
                        }
                    }
                }
                if (durations.Any()) avgTime = durations.Average();
            }

            return new OperationsStatsDto
            {
                PendingReports = pendingReports,
                AvgReportTimeMinutes = Math.Round(avgTime, 2)
            };
        }

        public async Task<List<ActionQueueRowDto>> GetActionQueueAsync(Guid branchId, DateTime date, bool includeHistory = false)
        {
            if (branchId == Guid.Empty) throw new ArgumentException("BranchId required");

            // Define Time Window (Local Date -> UTC Range)
            var today = date.Date;
            var startDate = includeHistory ? today.AddDays(-7) : today;
            var nextDay = today.AddDays(1); // Always cap at tomorrow (future visits not in queue)

            // DEBUG TRACING
            Console.WriteLine($"[ActionQueue] Query: Branch={branchId}, Date={date}, Today={today}, Window=[{startDate} - {nextDay})");

            // Fetch Data Graph (No Tracking for Read-Only Projection)
            var visits = await _context.Visits
                .AsNoTracking()
                .Where(v => v.BranchId == branchId && 
                            v.Status != "Cancelled" &&
                            (
                                // Rule 1: Show ALL Active (Unpaid) visits from recent window (7 days) covers clock skew/backlog
                                (v.Status != "Paid" && v.Status != "FullPaid" && v.TokenDate >= startDate)
                                ||
                                // Rule 2: Show FINALIZED (Paid) visits ONLY from Today (to keep list clean)
                                ((v.Status == "Paid" || v.Status == "FullPaid") && v.TokenDate >= today && v.TokenDate < nextDay)
                            ))
                .Include(v => v.Patient)
                .Include(v => v.ReferralPartner)
                .Include(v => v.Orders).ThenInclude(o => o.Test) // To get TestCode if denorm is missing, but Order has TestCode.
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .OrderByDescending(v => v.TokenDate) // Group by Date (Newest Day First)
                .ThenBy(v => v.Token) // Sequential Tokens within Day
                .ToListAsync();

            Console.WriteLine($"[ActionQueue] Found {visits.Count} raw visits.");

            // Fetch Status-Relevant Entities in Batch (Avoid N+1)
            var visitIds = visits.Select(v => v.VisitId).ToList();
            
            var samples = await _context.Samples
                .AsNoTracking()
                .Where(s => visitIds.Contains(s.Order.VisitId))
                .Select(s => new { s.Order.VisitId, s.Status, s.CollectedAt })
                .ToListAsync();

            var results = await _context.Results
                .AsNoTracking()
                .Where(r => visitIds.Contains(r.Order.VisitId))
                .Select(r => new { r.Order.VisitId, r.Status, r.EnteredAt }) // Changed UpdatedAt to EnteredAt
                .ToListAsync();

            var reports = await _context.Reports
                .AsNoTracking()
                .Where(r => visitIds.Contains(r.VisitId))
                .Select(r => new { r.VisitId, r.Status, r.SignedAt }) // Changed VerifiedAt to SignedAt
                .ToListAsync();

            // Projection Loop
            var queue = new List<ActionQueueRowDto>();

            foreach (var visit in visits)
            {
                var invoice = visit.Invoices.FirstOrDefault(); // Assuming 1 invoice per visit for V1
                if (invoice == null) 
                {
                    Console.WriteLine($"[ActionQueue] Skipping Visit {visit.Token}: No Invoice Found.");
                    continue; 
                }

                Console.WriteLine($"[ActionQueue] Processing Visit {visit.Token}. Invoice Status: {invoice.Status}.");
                
                var visitSamples = samples.Where(s => s.VisitId == visit.VisitId).ToList();
                var visitResults = results.Where(r => r.VisitId == visit.VisitId).ToList();
                var visitReport = reports.FirstOrDefault(r => r.VisitId == visit.VisitId);

                var dto = new ActionQueueRowDto
                {
                    VisitId = visit.VisitId,
                    Token = visit.Token,
                    CreatedAt = visit.CreatedAt,
                    
                    PatientName = visit.Patient != null 
                        ? (!string.IsNullOrEmpty(visit.Patient.DisplayName) ? visit.Patient.DisplayName : $"{visit.Patient.FirstName} {visit.Patient.LastName}")
                        : "Unknown",
                    
                    PatientAgeGender = FormatPatientAgeGender(visit.Patient),
                    
                    TestCodes = visit.Orders
                        .Where(o => o.Status != SynOS.Models.Enums.OrderStatus.Cancelled)
                        .Select(o => o.TestCode).ToList(),
                    
                    PaymentDisplay = DerivePaymentDisplay(visit, invoice),
                    
                    // Phase 6: Granular Payment Fields
                    TotalAmount = invoice.Total,
                    PaymentMethod = DerivePaymentMethod(visit, invoice),
                    ReferrerName = visit.ReferralPartner?.Name ?? "Self",

                    OperationalStatus = DeriveOperationalStatus(visit, visitSamples.Select(s => s.Status).ToList(), visitResults.Select(r => r.Status).ToList(), visitReport?.Status),
                    
                    LastUpdatedAt = CalculateLastUpdatedAt(visit, visitSamples.Select(s => s.CollectedAt).ToList(), visitResults.Select(r => r.EnteredAt).ToList(), visitReport?.SignedAt),
                    
                    DateGroup = CalculateDateGroup(visit.TokenDate, today),

                    IsFinalized = (invoice.Status == "Paid" || invoice.Status == "FullPaid")
                };

                queue.Add(dto);
            }

            return queue;
        }

        private string CalculateDateGroup(DateTime tokenDate, DateTime today)
        {
            if (tokenDate.Date == today) return "Today";
            if (tokenDate.Date == today.AddDays(-1)) return "Yesterday";
            return tokenDate.ToString("dd MMM (ddd)");
        }

        // --- Helpers (Guardrail 2: Centralized Logic) ---

        private string FormatPatientAgeGender(Patient? patient)
        {
            if (patient == null) return "N/A";
            
            var age = patient.IsDateOfBirthKnown 
                ? (DateTime.UtcNow.Year - patient.DateOfBirth.Year).ToString() 
                : "?";
            
            var gender = !string.IsNullOrEmpty(patient.Gender) ? patient.Gender.Substring(0, 1).ToUpper() : "?";
            
            return $"{age}y / {gender}";
        }

        private string DerivePaymentDisplay(Visit visit, Invoice invoice)
        {
            if (visit.PaymentCollectionModel == "PartnerCollects")
            {
                var partnerName = visit.ReferralPartner?.Name ?? "Partner";
                return $"Prepaid ({partnerName})";
            }

            if (invoice.Status == "Paid" || invoice.Status == "FullPaid")
            {
                var method = invoice.Payments.FirstOrDefault()?.Method;
                if (!string.IsNullOrEmpty(method))
                {
                    // Normalize Method display
                    return method switch
                    {
                        "PartnerAccount" => "Prepaid (System)", // Should be caught by clause above ideally
                        _ => method
                    };
                }
                return "Paid";
            }

            return "Due";
        }

        private string DerivePaymentMethod(Visit visit, Invoice invoice)
        {
            if (visit.PaymentCollectionModel == "PartnerCollects") return "Prepaid";

            if (invoice.Status == "Paid" || invoice.Status == "FullPaid")
            {
                var method = invoice.Payments.FirstOrDefault()?.Method;
                return method ?? "Paid"; // Fallback
            }
            return "Due";
        }

        private string DeriveOperationalStatus(Visit visit, List<SampleStatus> sampleStatuses, List<string?> resultStatuses, string? reportStatus)
        {
            // 5. Operational Status (SINGLE SOURCE OF TRUTH)
            
            // Completed
            if (reportStatus == "Signed" || reportStatus == "Finalized")
            {
                return "Completed";
            }

            // Reporting (Verification Pending)
            // If any result is "PendingVerification" or Report exists but not signed
            if ((resultStatuses.Any(s => s == "PendingVerification" || s == "Finalized")) || (reportStatus != null && reportStatus != "Signed"))
            {
                return "Reporting";
            }

            // In Lab (Drafting)
            // If any result is entered ("Draft")
            if (resultStatuses.Any(s => s == "Draft"))
            {
                return "In Lab";
            }

            // Sample Collected
            // If we have samples and they are all collected (or at least one collected and none rejected?)
            // Usually "Sample Collected" means at least one valid sample is in.
            if (sampleStatuses.Any(s => s == SampleStatus.Collected))
            {
                return "Sample Collected";
            }

            // Default: Ready for Sample (since we filtered for Paid visits)
            return "Ready for Sample";
        }

        private DateTime CalculateLastUpdatedAt(Visit visit, List<DateTime?> sampleTimes, List<DateTime> resultTimes, DateTimeOffset? reportTime)
        {
            var times = new List<DateTimeOffset>();
            
            times.Add(visit.CreatedAt);

            // Add Entity Timestamps
            foreach (var t in sampleTimes) if (t.HasValue) times.Add(t.Value);
            foreach (var t in resultTimes) times.Add(t);
            if (reportTime.HasValue) times.Add(reportTime.Value);

            // Return Max
            return times.Max().UtcDateTime;
        }

        // Private Helper for Event Emission (Internal Use Only)
        private async Task EmitEventAsync(BranchEventType eventType, Guid branchId, Guid entityId, string token, string description, Guid actorId, Guid? sourceId = null, string? sourceType = null)
        {
            await _eventWriter.WriteEventAsync(
                eventType,
                branchId.ToString(),
                entityId.ToString(),
                token,
                description,
                "User",
                actorId.ToString(),
                saveChanges: false, // ATOMICITY FIX: Defer save to transaction owner
                sourceId: sourceId,
                sourceType: sourceType
            );
        }

        public async Task RecordSampleCollectedAsync(Guid sampleId, Guid branchId, Guid actorId)
        {
            var sample = await _context.Samples
                .Include(s => s.Order)
                .ThenInclude(o => o.Visit)
                .FirstOrDefaultAsync(s => s.SampleId == sampleId);

            if (sample == null) throw new KeyNotFoundException($"Sample {sampleId} not found");

            // Issue 2 Fix: Fail Fast on Data Corruption
            if (sample.Order == null || sample.Order.Visit == null)
            {
                throw new InvalidOperationException($"Data Corruption: Sample {sampleId} is orphaned (missing Order or Visit links).");
            }

            // Issue 2 Fix: Strict Branch Check
            if (sample.Order.Visit.BranchId != branchId)
            {
                throw new UnauthorizedAccessException($"Sample {sampleId} belongs to branch {sample.Order.Visit.BranchId}, access denied for context branch {branchId}.");
            }

            // Invariant: Cannot collect twice
            if (sample.Status != SampleStatus.Pending && sample.Status != SampleStatus.Recollect)
            {
                throw new InvalidOperationException($"Cannot collect sample in state {sample.Status}");
            }

            if (sample.CollectedAt.HasValue)
            {
                throw new InvalidOperationException($"Sample already collected at {sample.CollectedAt}");
            }

            // Update State (Truth)
            sample.Status = SampleStatus.Collected;
            sample.CollectedAt = DateTime.UtcNow; // Standard: UTC
            sample.CollectedByUserId = actorId;

            // Emit Event (Issue 1 Fix: Internal emission only)
            await EmitEventAsync(
                BranchEventType.SAMPLE_COLLECTED,
                branchId,
                sample.Order.VisitId,
                sample.Barcode,
                $"Sample {sample.Barcode} collected",
                actorId
            );

            // Persist (Atomic State + Event)
            await _context.SaveChangesAsync();
        }

        public async Task RecordSampleRejectedAsync(Guid sampleId, Guid branchId, Guid actorId, string reason, bool requiresRecollection = false)
        {
            var sample = await _context.Samples
                .Include(s => s.Order)
                .ThenInclude(o => o.Visit)
                .FirstOrDefaultAsync(s => s.SampleId == sampleId);

            if (sample == null) throw new KeyNotFoundException($"Sample {sampleId} not found");

            // Issue 2 Fix: Fail Fast on Data Corruption
            if (sample.Order == null || sample.Order.Visit == null)
            {
                throw new InvalidOperationException($"Data Corruption: Sample {sampleId} is orphaned (missing Order or Visit links).");
            }

            // Issue 2 Fix: Strict Branch Check
            if (sample.Order.Visit.BranchId != branchId)
            {
                throw new UnauthorizedAccessException($"Sample {sampleId} belongs to branch {sample.Order.Visit.BranchId}, access denied for context branch {branchId}.");
            }

            // Update State
            sample.Status = requiresRecollection ? SampleStatus.Recollect : SampleStatus.Rejected;
            sample.IsRejected = true;

            // Add Rejection Record
            sample.Rejections.Add(new SampleRejection
            {
                RejectionId = Guid.NewGuid(),
                SampleId = sampleId,
                Reason = reason,
                RequiresRecollection = requiresRecollection,
                RejectedAt = DateTime.UtcNow,
                RejectedByUserId = actorId
            });

            // Emit Event (Issue 1 Fix: Internal emission only)
            await EmitEventAsync(
                BranchEventType.SAMPLE_REJECTED,
                branchId,
                sample.Order.VisitId,
                sample.Barcode,
                $"Sample rejected: {reason} (Recollect: {requiresRecollection})",
                actorId
            );

            // Persist (Atomic State + Event)
            await _context.SaveChangesAsync();
        }

        public async Task RecordResultDraftStartedAsync(Guid visitId, Guid resultId, Guid actorId)
        {
            var visit = await _context.Visits.FindAsync(visitId);
            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");

            // Idempotency Guard (Rule 1): Check if "Reporting" has already started for this visit.
            // We check the last 24 hours of events for this Visit ID.
            var alreadyStarted = await _context.BranchOperationalEvents
                .AnyAsync(e => e.VisitId == visitId.ToString() 
                               && e.EventType == BranchEventType.RESULT_DRAFT_STARTED.ToString()
                               && e.OccurredAt > DateTime.UtcNow.AddHours(-24));

            if (alreadyStarted)
            {
                // NO-OP: "Reporting" state is already active.
                return;
            }

            // Emit Event
            if (visit.BranchId.HasValue)
            {
                await EmitEventAsync(
                    BranchEventType.RESULT_DRAFT_STARTED,
                    visit.BranchId.Value,
                    visitId,
                    visit.Token,
                    "Result drafting started",
                    actorId,
                    resultId,
                    "Result"
                );
            }
        }

        public async Task RecordReportReadyAsync(Guid visitId, Guid reportId, Guid actorId)
        {
            var visit = await _context.Visits.FindAsync(visitId);
            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found");

            // Validation: Report must exist (Rule 2 Safety)
            var reportExists = await _context.Reports.AnyAsync(r => r.ReportId == reportId);
            if (!reportExists)
            {
                throw new InvalidOperationException($"Data Consistency Error: Report {reportId} does not exist. Cannot emit Ready event.");
            }

            // Idempotency: Check if already marked ready
            var alreadyReady = await _context.BranchOperationalEvents
                .AnyAsync(e => e.SourceId == reportId 
                               && e.EventType == BranchEventType.REPORT_READY_FOR_VERIFICATION.ToString());

            if (alreadyReady) return;

            if (visit.BranchId.HasValue)
            {
                await EmitEventAsync(
                    BranchEventType.REPORT_READY_FOR_VERIFICATION,
                    visit.BranchId.Value,
                    visitId,
                    visit.Token,
                    "Report ready for verification",
                    actorId,
                    reportId,
                    "Report"
                );
            }
        }

        public async Task RecordReportSignedAsync(Guid reportId, Guid branchId, Guid actorId)
        {
            var report = await _context.Reports
                .FirstOrDefaultAsync(r => r.ReportId == reportId);

            if (report == null) throw new KeyNotFoundException($"Report {reportId} not found");

            var visit = await _context.Visits.FindAsync(report.VisitId);

            // Fail Fast: Data Integrity
            if (visit == null)
            {
                throw new InvalidOperationException($"Data Corruption: Report {reportId} is orphaned (missing Visit {report.VisitId}).");
            }

            // Fail Fast: Branch Security
            if (visit.BranchId != branchId)
            {
                throw new UnauthorizedAccessException($"Report {reportId} belongs to branch {visit.BranchId}, access denied for context branch {branchId}.");
            }

            // Invariant: Cannot sign twice
            if (report.Status == "Signed" || report.Status == "Finalized")
            {
                throw new InvalidOperationException($"Cannot sign report in state {report.Status}");
            }

            // Update State (Truth)
            report.Status = "Signed";
            report.SignedAt = DateTime.UtcNow;
            report.SignedByUserId = actorId;
            report.CurrentVersion++; // Increment version on sign-off

            // Emit Event
            await EmitEventAsync(
                BranchEventType.REPORT_SIGNED,
                branchId,
                report.VisitId,
                report.ReportId.ToString(),
                $"Report signed (Version {report.CurrentVersion})",
                actorId,
                report.ReportId,
                "Report"
            );

            // Persist (Atomic State + Event)
            await _context.SaveChangesAsync();
        }

        public async Task RecordReportDeliveredAsync(Guid reportId, Guid branchId, Guid actorId)
        {
            var report = await _context.Reports
                .FirstOrDefaultAsync(r => r.ReportId == reportId);

            if (report == null) throw new KeyNotFoundException($"Report {reportId} not found");

            var visit = await _context.Visits.FindAsync(report.VisitId);

            if (visit == null)
            {
                throw new InvalidOperationException($"Data Corruption: Report {reportId} is orphaned (missing Visit link).");
            }

            if (visit.BranchId != branchId)
            {
                throw new UnauthorizedAccessException($"Report {reportId} belongs to branch {visit.BranchId}, access denied for context branch {branchId}.");
            }

            // Invariant: Must be signed to deliver
            if (report.Status != "Signed" && report.Status != "Finalized")
            {
                throw new InvalidOperationException($"Cannot deliver report in state {report.Status}. Must be Signed first.");
            }

            if (report.Delivered)
            {
                if (report.DeliveredAt.HasValue) return; 
            }

            // Update State
            report.Delivered = true;
            report.DeliveredAt = DateTime.UtcNow;

            await EmitEventAsync(
                BranchEventType.REPORT_DELIVERED,
                branchId,
                report.VisitId,
                report.ReportId.ToString(),
                "Report delivered",
                actorId
            );

            // Persist (Atomic State + Event)
            await _context.SaveChangesAsync();
        }

        public async Task RecordResultsVerifiedAsync(Guid orderId, Guid branchId, Guid actorId, List<FinalResultDto> results)
        {
            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Invoices)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null) throw new KeyNotFoundException($"Order {orderId} not found.");

            if (order.Visit == null)
            {
                throw new InvalidOperationException($"Data Corruption: Order {orderId} is orphaned (missing Visit link).");
            }

            if (order.Visit.BranchId != branchId)
            {
                throw new UnauthorizedAccessException($"Order {orderId} belongs to branch {order.Visit.BranchId}, access denied for context branch {branchId}.");
            }

            // Invariant: Revenue Guard
            if (!order.Visit.Invoices.Any(i => i.Status == "FullPaid"))
            {
                throw new InvalidOperationException("Order must be fully paid before results can be verified.");
            }

            // Fetch Results
            var orderResults = await _context.Results
                .Where(r => r.OrderId == orderId)
                .ToListAsync();

            foreach (var resultDto in results)
            {
                var result = orderResults.FirstOrDefault(r => r.ParameterCode == resultDto.ParameterCode);

                if (result == null) continue;

                if (string.IsNullOrWhiteSpace(resultDto.Value))
                {
                     throw new InvalidOperationException($"Parameter '{resultDto.ParameterCode}' requires a value.");
                }

                result.Value = resultDto.Value;
                result.TechComments = resultDto.Remarks;
                result.Status = "Finalized"; 
            }

            await EmitEventAsync(
                BranchEventType.REPORT_VERIFIED,
                branchId,
                order.VisitId,
                order.Visit.Token,
                "Results finalized and verified",
                actorId
            );

            // Persist (Atomic State + Event)
            await _context.SaveChangesAsync();
        }
    }
}