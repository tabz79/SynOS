using System;
using SynOS.Services.Time; // ADDED
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
using SynOS.Models.Events;

namespace SynOS.Services.Operations
{
    public class OperationsEngine : IOperationsEngine
    {
        private readonly SynOSDbContext _context;
        private readonly IOperationalEventWriter _eventWriter;
        private readonly SynOS.Services.Security.IUserContext _userContext;
        private readonly ILabTimeProvider _labTimeProvider; // ADDED
        private readonly IVisitLifecyclePolicy _lifecyclePolicy; // ADDED
        private readonly IMiddlewareOutboxService _outboxService;

        public OperationsEngine(
            SynOSDbContext context, 
            IOperationalEventWriter eventWriter, 
            SynOS.Services.Security.IUserContext userContext,
            ILabTimeProvider labTimeProvider,
            IVisitLifecyclePolicy lifecyclePolicy,
            IMiddlewareOutboxService outboxService)
        {
            _context = context;
            _eventWriter = eventWriter;
            _userContext = userContext;
            _labTimeProvider = labTimeProvider;
            _lifecyclePolicy = lifecyclePolicy;
            _outboxService = outboxService;
        }

        public async Task<OperationsStatsDto> GetDailyOperationsStatsAsync(Guid branchId, Guid? userId = null)
        {
            if (branchId == Guid.Empty) throw new ArgumentException("BranchId required");

            var today = _labTimeProvider.GetLabToday();
            
            int pendingReports = 0;
            double avgTime = 0;
            int pendingCollections = 0;
            int completedCollections = 0;
            int testsRunning = 0;

            if (userId.HasValue)
            {
                var stats = await _context.UserOperationalStats
                    .FirstOrDefaultAsync(s => s.UserId == userId.Value && s.BranchId == branchId && s.Date == today);
                
                if (stats != null)
                {
                    pendingCollections = stats.PendingCollectionsCount;
                    completedCollections = stats.CompletedCollectionsCount;
                    testsRunning = stats.TestsRunningCount;
                }
            }
            else
            {
                var stats = await _context.BranchOperationalStats
                    .FirstOrDefaultAsync(s => s.BranchId == branchId && s.Date == today);

                if (stats != null)
                {
                    pendingCollections = stats.PendingCollectionsCount;
                    completedCollections = stats.CompletedCollectionsCount;
                    testsRunning = stats.TestsRunningCount;
                }
            }

            // 1. Live Pending Reports Calculation (Avoids negative drift/errors)
            pendingReports = await _context.Reports
                .Where(r => r.Visit.BranchId == branchId 
                         && r.Visit.Status != VisitStatus.Cancelled 
                         && r.Status != "Signed" 
                         && r.Status != "ManualVerified")
                .CountAsync();

            // 2. Live Avg Report Time Calculation (Filters out polluted backlog/draft data)
            var todayStart = new DateTimeOffset(today, TimeSpan.Zero);
            var todayEnd = todayStart.AddDays(1);

            var signedToday = await _context.Reports
                .Where(r => r.Visit.BranchId == branchId 
                         && r.SignedAt.HasValue 
                         && r.SignedAt.Value >= todayStart 
                         && r.SignedAt.Value < todayEnd)
                .ToListAsync();

            if (signedToday.Any())
            {
                var visitIds = signedToday.Select(r => r.VisitId).Distinct().ToList();
                var specimens = await _context.Specimens
                    .Where(s => visitIds.Contains(s.VisitId) && s.CollectedAt.HasValue)
                    .ToListAsync();

                double totalMinutes = 0;
                int count = 0;

                foreach (var r in signedToday)
                {
                    var collectedAt = specimens
                        .Where(s => s.VisitId == r.VisitId)
                        .Select(s => s.CollectedAt)
                        .FirstOrDefault();

                    if (collectedAt.HasValue)
                    {
                        var collectedAtUtc = DateTime.SpecifyKind(collectedAt.Value, DateTimeKind.Utc);
                        var duration = (r.SignedAt.Value.UtcDateTime - collectedAtUtc).TotalMinutes;
                        // Exclude any unreasonable durations (e.g. > 24 hours) as they might be polluted backlog/draft data
                        if (duration > 0 && duration <= 1440) 
                        {
                            totalMinutes += duration;
                            count++;
                        }
                    }
                }

                if (count > 0)
                {
                    avgTime = totalMinutes / count;
                }
            }

            return new OperationsStatsDto
            {
                PendingReports = Math.Max(0, pendingReports),
                AvgReportTimeMinutes = Math.Round(avgTime),
                PendingCollections = Math.Max(0, pendingCollections),
                CompletedCollections = Math.Max(0, completedCollections),
                TestsRunning = Math.Max(0, testsRunning)
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

            // Use Policy-driven operational window
            // Rule 1: Show ALL Active (Non-terminal) visits from the retrospective window (7 days)
            // Rule 2: Show Terminal (Finalized) visits ONLY from the current Operational Today
            
            // We fetch statuses in memory or use a list for EF if needed, but since we are refactoring, 
            // we will use the status definitions from the policy if possible, or keep the list for query performance.
            var terminalStatuses = _lifecyclePolicy.GetTerminalStatuses();
            
            var visitQuery = _context.Visits
                .AsNoTracking()
                .AsSplitQuery()
                .Where(v => v.BranchId == branchId && 
                            v.Status != VisitStatus.Cancelled &&
                            (
                                // LIVE VIEW: Active (7 days) + Terminal (Today)
                                (!includeHistory && 
                                    (
                                        (!terminalStatuses.Contains(v.Status) && v.TokenDate >= startDate) ||
                                        (terminalStatuses.Contains(v.Status) && v.TokenDate >= today && v.TokenDate < nextDay)
                                    )
                                )
                                ||
                                // HISTORY VIEW: Terminal (7 days)
                                (includeHistory && terminalStatuses.Contains(v.Status) && v.TokenDate >= startDate && v.TokenDate < nextDay)
                            ));

            if (_userContext.CurrentRole == "Receptionist")
            {
                var currentUserId = _userContext.CurrentUserId;
                visitQuery = visitQuery.Where(v => v.AssignedReceptionistId == currentUserId);
            }

            // Fetch Data Graph (No Tracking for Read-Only Projection)
            var visits = await visitQuery
                .Include(v => v.Patient)
                .Include(v => v.ReferralPartner)
                .Include(v => v.Orders).ThenInclude(o => o.Test) // To get TestCode if denorm is missing, but Order has TestCode.
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.AssignedReceptionist)
                .OrderByDescending(v => v.TokenDate) // Group by Date (Newest Day First)
                .ThenByDescending(v => v.CreatedAt) // Strict LIFO: Newest registrations on top
                .ToListAsync();

            Console.WriteLine($"[ActionQueue] Found {visits.Count} raw visits.");

            // Fetch Status-Relevant Entities in Batch (Avoid N+1)
            var visitIds = visits.Select(v => v.VisitId).ToList();
            
            // REFACTOR: Disabled for Specimen Migration
            /*
            var samples = await _context.Samples
                .AsNoTracking()
                .Where(s => visitIds.Contains(s.Order.VisitId))
                .Select(s => new { s.Order.VisitId, s.Status, s.CollectedAt })
                .ToListAsync();
            */

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

            var last24HoursUtc = DateTime.UtcNow.AddHours(-24);
            var last24HoursOffset = DateTimeOffset.UtcNow.AddHours(-24);

            var assignments = await _context.ProcessingAssignments
                .AsNoTracking()
                .Where(a => a.Specimen != null && visitIds.Contains(a.Specimen.VisitId))
                .Where(a => a.Status != ProcessingAssignmentStatus.Completed || a.CompletedAt >= last24HoursOffset)
                .Select(a => new { 
                    VisitId = a.Specimen != null ? a.Specimen.VisitId : Guid.Empty, 
                    a.Status, 
                    a.DepartmentCode,
                    AssignedUserId = a.AssignedResource != null ? (Guid?)a.AssignedResource.UserId : null,
                    AssignedUserName = a.AssignedResource != null && a.AssignedResource.User != null ? a.AssignedResource.User.Name : null
                })
                .ToListAsync();

            var workAssignments = await _context.WorkAssignments
                .AsNoTracking()
                .Where(wa => visitIds.Contains(wa.SourceReferenceId) && wa.WorkType == WorkType.SampleCollection)
                .Where(wa => wa.Status != WorkAssignmentStatus.Completed || wa.CompletedAt >= last24HoursUtc)
                .Select(wa => new {
                    VisitId = wa.SourceReferenceId,
                    wa.Status,
                    wa.Department,
                    AssignedUserId = wa.AssignedResource != null ? (Guid?)wa.AssignedResource.UserId : null,
                    AssignedUserName = wa.AssignedResource != null && wa.AssignedResource.User != null ? wa.AssignedResource.User.Name : null
                })
                .ToListAsync();

            // Projection Loop
            var queue = new List<ActionQueueRowDto>();

            foreach (var visit in visits)
            {
                var invoice = visit.Invoices.FirstOrDefault(); // Assuming 1 invoice per visit for V1

                Console.WriteLine($"[ActionQueue] Processing Visit {visit.Token}. Invoice Status: {invoice?.Status ?? "None"}.");
                
                // var visitSamples = samples.Where(s => s.VisitId == visit.VisitId).ToList();
                var visitSamples = new List<object>(); // Stubbed
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
                        .Where(o => o.ParentOrderId == null && !(o.Price == 0 && o.Test != null && !o.Test.IsProfile && visit.Orders.Any(po => po.Test != null && po.Test.IsProfile && po.Status != SynOS.Models.Enums.OrderStatus.Cancelled)))
                        .Select(o => o.TestCode).ToList(),
                    
                    PaymentDisplay = DerivePaymentDisplay(visit, invoice),
                    
                    // Phase 6: Granular Payment Fields
                    TotalAmount = invoice?.Total ?? 0m,
                    PaymentMethod = DerivePaymentMethod(visit, invoice),
                    ReferrerName = visit.ReferralPartner?.Name ?? "Self",

                    // FIXED: Pass empty list instead of null to prevent NRE in DeriveOperationalStatus
                    OperationalStatus = DeriveOperationalStatus(visit, new List<object>(), assignments.Where(a => a.VisitId == visit.VisitId).Select(a => a.Status).ToList(), visitResults.Select(r => r.Status?.ToString()).ToList().Cast<string?>().ToList(), visitReport?.Status),
                    LastUpdatedAt = CalculateLastUpdatedAt(visit, new List<DateTime?>(), visitResults.Select(r => r.EnteredAt).ToList(), visitReport?.SignedAt),
                    DateGroup = CalculateDateGroup(visit.TokenDate, today),
                    IsFinalized = _lifecyclePolicy.IsTerminal(visit.Status),
                    
                    AssignedToUserId = visit.AssignedReceptionistId,
                    AssignedToName = visit.AssignedReceptionist?.Name,
                    
                    // FIXED: Ownership Projection. We filter for != null to prevent "Vanishing" when downstream tasks are unclaimed.
                    AssignedUserId = assignments.Where(a => a.VisitId == visit.VisitId && a.AssignedUserId != null)
                                    .OrderBy(a => a.Status == ProcessingAssignmentStatus.Completed ? 1 : 0)
                                    .Select(a => a.AssignedUserId)
                                    .FirstOrDefault()
                                  ?? workAssignments.Where(wa => wa.VisitId == visit.VisitId && wa.AssignedUserId != null)
                                    .OrderBy(wa => wa.Status == WorkAssignmentStatus.Completed ? 1 : 0)
                                    .Select(wa => wa.AssignedUserId)
                                    .FirstOrDefault(),
                    AssignedUserName = assignments.Where(a => a.VisitId == visit.VisitId && a.AssignedUserId != null)
                                    .OrderBy(a => a.Status == ProcessingAssignmentStatus.Completed ? 1 : 0)
                                    .Select(a => a.AssignedUserName)
                                    .FirstOrDefault()
                                    ?? workAssignments.Where(wa => wa.VisitId == visit.VisitId && wa.AssignedUserId != null)
                                    .OrderBy(wa => wa.Status == WorkAssignmentStatus.Completed ? 1 : 0)
                                    .Select(wa => wa.AssignedUserName)
                                    .FirstOrDefault(),
                    AssignedDepartmentCode = assignments.Where(a => a.VisitId == visit.VisitId && a.AssignedUserId != null)
                                    .OrderBy(a => a.Status == ProcessingAssignmentStatus.Completed ? 1 : 0)
                                    .Select(a => a.DepartmentCode)
                                    .FirstOrDefault()
                                          ?? workAssignments.Where(wa => wa.VisitId == visit.VisitId && wa.AssignedUserId != null)
                                    .OrderBy(wa => wa.Status == WorkAssignmentStatus.Completed ? 1 : 0)
                                    .Select(wa => wa.Department)
                                    .FirstOrDefault(),
                    
                    DepartmentCode = assignments.FirstOrDefault(a => a.VisitId == visit.VisitId)?.DepartmentCode // Check entity or snapshot?
                };

                queue.Add(dto);
            }

            return queue;
        }

        public async Task<ActionQueueRowDto?> ProjectActionQueueRowAsync(Guid visitId)
        {
            if (visitId == Guid.Empty) throw new ArgumentException("VisitId required");

            var visit = await _context.Visits
                .AsNoTracking()
                .Include(v => v.Patient)
                .Include(v => v.ReferralPartner)
                .Include(v => v.Orders).ThenInclude(o => o.Test)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.AssignedReceptionist)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) return null;

            var invoice = visit.Invoices.FirstOrDefault();

            var results = await _context.Results
                .AsNoTracking()
                .Where(r => r.Order.VisitId == visitId)
                .Select(r => new { r.Status, r.EnteredAt }) // Changed UpdatedAt to EnteredAt
                .ToListAsync();

            var report = await _context.Reports
                .AsNoTracking()
                .Where(r => r.VisitId == visitId)
                .Select(r => new { r.Status, r.SignedAt }) // Changed VerifiedAt to SignedAt
                .FirstOrDefaultAsync();

            var workAssignments = await _context.WorkAssignments
                .AsNoTracking()
                .Where(wa => wa.SourceReferenceId == visitId && wa.WorkType == WorkType.SampleCollection)
                .Where(wa => wa.Status != WorkAssignmentStatus.Completed || wa.CompletedAt >= DateTime.UtcNow.AddHours(-24))
                .Select(wa => new {
                    VisitId = wa.SourceReferenceId,
                    wa.Status,
                    wa.Department,
                    AssignedUserId = wa.AssignedResource != null ? (Guid?)wa.AssignedResource.UserId : null,
                    AssignedUserName = wa.AssignedResource != null && wa.AssignedResource.User != null ? wa.AssignedResource.User.Name : null
                })
                .ToListAsync();

            var last24HoursOffset = DateTimeOffset.UtcNow.AddHours(-24);
            var assignments = await _context.ProcessingAssignments
                .AsNoTracking()
                .Where(a => a.Specimen != null && a.Specimen.VisitId == visitId)
                .Where(a => a.Status != ProcessingAssignmentStatus.Completed || a.CompletedAt >= last24HoursOffset)
                .Select(a => new { 
                    VisitId = a.Specimen != null ? a.Specimen.VisitId : Guid.Empty,
                    a.Status, 
                    a.DepartmentCode,
                    AssignedUserId = a.AssignedResource != null ? (Guid?)a.AssignedResource.UserId : null,
                    AssignedUserName = a.AssignedResource != null && a.AssignedResource.User != null ? a.AssignedResource.User.Name : null
                })
                .ToListAsync();

            var today = _labTimeProvider.GetLabToday();

            return new ActionQueueRowDto
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
                    .Where(o => o.ParentOrderId == null && !(o.Price == 0 && o.Test != null && !o.Test.IsProfile && visit.Orders.Any(po => po.Test != null && po.Test.IsProfile && po.Status != SynOS.Models.Enums.OrderStatus.Cancelled)))
                    .Select(o => o.TestCode).ToList(),
                
                PaymentDisplay = DerivePaymentDisplay(visit, invoice),
                
                TotalAmount = invoice?.Total ?? 0m,
                PaymentMethod = DerivePaymentMethod(visit, invoice),
                ReferrerName = visit.ReferralPartner?.Name ?? "Self",

                OperationalStatus = DeriveOperationalStatus(visit, new List<object>(), assignments.Select(a => a.Status).ToList(), results.Select(r => r.Status.ToString()).ToList().Cast<string?>().ToList(), report?.Status),
                
                LastUpdatedAt = CalculateLastUpdatedAt(visit, new List<DateTime?>(), results.Select(r => r.EnteredAt).ToList(), report?.SignedAt),
                
                DateGroup = CalculateDateGroup(visit.TokenDate, today),

                IsFinalized = _lifecyclePolicy.IsTerminal(visit.Status),
                
                AssignedToUserId = visit.AssignedReceptionistId,
                AssignedToName = visit.AssignedReceptionist?.Name,
                
                // FIXED: Ownership Projection. We filter for != null to prevent "Vanishing" when downstream tasks are unclaimed.
                AssignedUserId = assignments.Where(a => a.AssignedUserId != null)
                                .OrderBy(a => a.Status == ProcessingAssignmentStatus.Completed ? 1 : 0)
                                .Select(a => a.AssignedUserId)
                                .FirstOrDefault()
                              ?? workAssignments.Where(wa => wa.AssignedUserId != null)
                                .OrderBy(wa => wa.Status == WorkAssignmentStatus.Completed ? 1 : 0)
                                .Select(wa => wa.AssignedUserId)
                                .FirstOrDefault(),
                AssignedUserName = assignments.Where(a => a.AssignedUserId != null)
                                .OrderBy(a => a.Status == ProcessingAssignmentStatus.Completed ? 1 : 0)
                                .Select(a => a.AssignedUserName)
                                .FirstOrDefault()
                                ?? workAssignments.Where(wa => wa.AssignedUserId != null)
                                .OrderBy(wa => wa.Status == WorkAssignmentStatus.Completed ? 1 : 0)
                                .Select(wa => wa.AssignedUserName)
                                .FirstOrDefault(),
                AssignedDepartmentCode = assignments.Where(a => a.AssignedUserId != null)
                                .OrderBy(a => a.Status == ProcessingAssignmentStatus.Completed ? 1 : 0)
                                .Select(a => a.DepartmentCode)
                                .FirstOrDefault()
                                      ?? workAssignments.Where(wa => wa.AssignedUserId != null)
                                .OrderBy(wa => wa.Status == WorkAssignmentStatus.Completed ? 1 : 0)
                                .Select(wa => wa.Department)
                                .FirstOrDefault(),
                
                DepartmentCode = assignments.FirstOrDefault()?.DepartmentCode,
                HasPhlebotomy = visit.Orders.Any(o => o.Status != SynOS.Models.Enums.OrderStatus.Cancelled && (o.Test == null || (o.Test.ModalityId == null && !string.Equals(o.Test.Category, "Radiology", StringComparison.OrdinalIgnoreCase) && !string.Equals(o.Test.DepartmentMaster?.Name, "Radiology", StringComparison.OrdinalIgnoreCase))))
            };
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
            
            var calculatedAge = patient.DateOfBirth > DateTime.MinValue && patient.DateOfBirth.Year > 1900
                ? Math.Max(0, (int)((DateTime.UtcNow - patient.DateOfBirth).TotalDays / 365.25))
                : 0;
            
            var ageStr = calculatedAge > 0 ? calculatedAge.ToString() : "-";
            var gender = !string.IsNullOrEmpty(patient.Gender) ? patient.Gender.Substring(0, 1).ToUpper() : "?";
            
            return $"{ageStr}y / {gender}";
        }

        private string DerivePaymentDisplay(Visit visit, Invoice? invoice)
        {
            if (visit.PaymentCollectionModel == "PartnerCollects")
            {
                var partnerName = visit.ReferralPartner?.Name ?? "Partner";
                return $"Prepaid ({partnerName})";
            }

            if (invoice != null && (invoice.Status == "Paid" || invoice.Status == "FullPaid"))
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

        private string DerivePaymentMethod(Visit visit, Invoice? invoice)
        {
            if (visit.PaymentCollectionModel == "PartnerCollects") return "Prepaid";

            if (invoice != null && (invoice.Status == "Paid" || invoice.Status == "FullPaid"))
            {
                var method = invoice.Payments.FirstOrDefault()?.Method;
                return method ?? "Paid"; // Fallback
            }
            return "Due";
        }

        private string DeriveOperationalStatus(Visit visit, List<object>? sampleStatuses, List<ProcessingAssignmentStatus> processingStatuses, List<string?> resultStatuses, string? reportStatus)
        {
            // 5. Operational Status (SINGLE SOURCE OF TRUTH)
            
            // Completed
            if (reportStatus == "Signed" || reportStatus == "Finalized")
            {
                return "Completed";
            }

            // Reporting (Verification Pending)
            if ((resultStatuses.Any(s => s == "PendingVerification" || s == "Finalized")) || (reportStatus != null && reportStatus != "Signed"))
            {
                return "Reporting";
            }

            // In Lab (Drafting)
            if (resultStatuses.Any(s => s == "Draft"))
            {
                return "In Lab";
            }

            // --- STEP 5: PROJECTION UPDATE ---
            // "In Processing" logic
            // 1. Visit has Specimens?
            bool hasSpecimens = visit.Orders != null && visit.Orders.Any(o => o.SpecimenId != null);

            if (hasSpecimens)
            {
                // 2. Are there any INCOMPLETE ProcessingAssignments?
                // Logic: If NO assignments exist, we assume legacy flow and bypass to "Collected".
                // If assignments exist, ANY that are not Completed trigger "In Processing".
                if (processingStatuses.Any() && processingStatuses.Any(s => s != ProcessingAssignmentStatus.Completed))
                {
                    return "In Processing";
                }

                // 3. If all complete or none exist, we are at least "Collected"
                return "Collected";
            }

            // Default: Ready for Sample
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
            string actorNameStr = actorId != Guid.Empty ? actorId.ToString() : (_userContext.CurrentUserId != Guid.Empty ? _userContext.CurrentUserId.ToString() : "");
            string actorTypeStr = !string.IsNullOrWhiteSpace(_userContext.UserName) ? _userContext.UserName : "Lab Tech";

            if (actorId != Guid.Empty)
            {
                var u = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == actorId);
                if (u != null)
                {
                    actorTypeStr = u.Name;
                }
            }

            await _eventWriter.WriteEventAsync(
                eventType,
                branchId.ToString(),
                entityId.ToString(),
                token,
                description,
                actorTypeStr,
                actorNameStr,
                saveChanges: false, // ATOMICITY FIX: Defer save to transaction owner
                sourceId: sourceId,
                sourceType: sourceType
            );
        }

#if false
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
            // REFACTOR: Disabled for Specimen Migration
            await Task.CompletedTask;
            /*
            var sample = await _context.Samples
                .Include(s => s.Order).ThenInclude(o => o.Visit)
                .FirstOrDefaultAsync(s => s.SampleId == sampleId);

            if (sample == null)
                throw new KeyNotFoundException("Sample not found.");

            if (sample.Status == SampleStatus.Collected)
            {
                _logger.LogInformation("Sample {SampleId} is already marked as collected. Skipping event emission.", sampleId);
                return;
            }

            // 1. Update State
            sample.Status = SampleStatus.Collected;
            sample.CollectedAt = DateTime.UtcNow; // Standard: UTC
            sample.CollectedByUserId = actorId;

            // 2. Emit Event (Fact)
            await EmitEventAsync(
                BranchEventType.SAMPLE_COLLECTED,
                branchId,
                sampleId,
                sample.Order.Visit.Token, // Token needed for UI grouping
                $"Sample collected for {sample.Order.TestCode}",
                actorId,
                sampleId,
                "Sample"
            );

            await _context.SaveChangesAsync();
            */
        }
#endif

#if false
        public async Task RecordSampleRejectedAsync(Guid sampleId, Guid branchId, Guid actorId, string reason, bool requiresRecollection = false)
        {
            // REFACTOR: Disabled for Specimen Migration
            await Task.CompletedTask;
            /*
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
            */
        }
#endif

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
            // GPT-5 Note: Version increment should be handled by the initiating service 
            // to ensure signature alignment. Engine records the fact.

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

            // Resolve demographics and referral dimensions for event
            Guid? patientId = report.PatientId;
            string? gender = null;
            DateTime? dob = null;
            Guid? referrerId = null;
            string? referrerName = null;
            Guid? referralPartnerId = null;
            string? referralPartnerName = null;
            string? referralPartnerLocation = null;

            var patient = await _context.Patients.FindAsync(patientId);
            if (patient != null)
            {
                gender = patient.Gender;
                dob = patient.DateOfBirth;
            }

            if (visit != null)
            {
                referrerId = visit.ReferrerId;
                if (referrerId.HasValue)
                {
                    var referrer = await _context.Referrers.FindAsync(referrerId.Value);
                    referrerName = referrer?.ProviderName ?? visit.ReferrerText;
                }

                referralPartnerId = visit.ReferralPartnerId;
                if (referralPartnerId.HasValue)
                {
                    var partner = await _context.ReferralPartners.FindAsync(referralPartnerId.Value);
                    referralPartnerName = partner?.Name;
                    referralPartnerLocation = partner?.Location;
                }
            }

            // Enqueue ReportSignedEvent
            _outboxService.Enqueue(new ReportSignedEvent(
                report.ReportId,
                report.VisitId,
                report.PatientId,
                report.Department,
                report.Status,
                report.SignedByUserId,
                report.SignedAt,
                branchId,
                gender,
                dob,
                referrerId,
                referrerName,
                referralPartnerId,
                referralPartnerName,
                referralPartnerLocation,
                null, // PatientLocation
                null  // PatientPincode
            ));

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

            // Invariant: Revenue Guard (Bypassed for PartnerCollects or Admin/SystemAdmin users)
            bool isPartnerCollect = order.Visit.PaymentCollectionModel == "PartnerCollects";
            bool isAdmin = _userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin";
            
            if (!isPartnerCollect && !isAdmin && !order.Visit.Invoices.Any(i => i.Status == "Paid" || i.Status == "FullPaid"))
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

                result.Value = resultDto.Value ?? "";
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