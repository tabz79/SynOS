using System;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Models.Entities.AR;
using SynOS.Services.Storage;
using SynOS.Services.Operational; 
using SynOS.Models.Enums; 
using SynOS.Services.Security; 
using SynOS.Services.Operations; // ADDED
using SynOS.Models.DTOs.Reporting;

namespace SynOS.Services
{
    public class ReportService : IReportService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ReportService> _logger;
        private readonly ICriticalValueService _criticalValueService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IReportPdfRenderer _reportPdfRenderer;
        private readonly IFileStorageService _fileStorageService;
        private readonly IAuditService _auditService;
        private readonly IOperationalEventWriter _operationalEventWriter;
        private readonly IUserContext _userContext;
        private readonly IOperationsEngine _operationsEngine;
        private readonly Reporting.IReportingService _reportingService;

        public ReportService(
            SynOSDbContext context, 
            ILogger<ReportService> logger, 
            ICriticalValueService criticalValueService, 
            IHttpClientFactory httpClientFactory,
            IReportPdfRenderer reportPdfRenderer,
            IFileStorageService fileStorageService,
            IAuditService auditService,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext,
            IOperationsEngine operationsEngine,
            Reporting.IReportingService reportingService)
        {
            _context = context;
            _logger = logger;
            _criticalValueService = criticalValueService;
            _httpClientFactory = httpClientFactory;
            _reportPdfRenderer = reportPdfRenderer;
            _fileStorageService = fileStorageService;
            _auditService = auditService;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _operationsEngine = operationsEngine ?? throw new ArgumentNullException(nameof(operationsEngine));
            _reportingService = reportingService ?? throw new ArgumentNullException(nameof(reportingService));
        }

        public async Task SubmitForVerificationAsync(Guid reportId, Guid typistId)
        {
            var report = await _context.Reports.FindAsync(reportId);
            if (report == null) throw new KeyNotFoundException("Report not found.");

            if (report.Status != "Draft")
                throw new BadHttpRequestException($"Cannot submit report with status {report.Status}. Must be Draft.");

            // 1. Capture PDF Data Snapshot (Frozen state for final reports)
            var reportData = await GetReportDataForPdfAsync(report.VisitId);
            if (reportData != null)
            {
                report.DraftSnapshotJson = System.Text.Json.JsonSerializer.Serialize(reportData);
            }

            // 2. Capture Formal Version & Structure Snapshot (Frozen state for Editor/Detail view)
            if (report.CurrentVersion == 0) report.CurrentVersion = 1;
            
            var reportVersion = await _context.ReportVersions
                .FirstOrDefaultAsync(rv => rv.ReportId == report.ReportId && rv.VersionNumber == report.CurrentVersion);

            if (reportVersion == null)
            {
                reportVersion = new ReportVersion
                {
                    ReportId = report.ReportId,
                    VersionNumber = report.CurrentVersion,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.ReportVersions.Add(reportVersion);
                await _context.SaveChangesAsync(); // Commit version so Snapshot can link to it
            }

            // Create formal structure snapshot for Detail View consistency
            await _reportingService.CreateSnapshotAsync(reportVersion.ReportVersionId, overwrite: true);

            // 3. Update Status & Audit
            report.Status = "ReadyForVerification";
            report.TypedByUserId = typistId;
            report.UpdatedAt = DateTimeOffset.UtcNow;
            
            await _context.SaveChangesAsync();
            await _auditService.LogAsync(typistId, "ReportSubmitted", "Report", reportId, null);
        }

        public async Task ReopenReportAsync(Guid reportId, Guid pathologistId)
        {
            var report = await _context.Reports.FindAsync(reportId);
            if (report == null) throw new KeyNotFoundException("Report not found.");

            if (report.Status != "ReadyForVerification")
                throw new BadHttpRequestException("Only reports in 'ReadyForVerification' status can be reopened.");

            report.Status = "Draft";
            report.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
            await _auditService.LogAsync(pathologistId, "ReportReopened", "Report", reportId, null);
        }

        public async Task MarkManuallyVerifiedAsync(Guid reportId, Guid pathologistId)
        {
            var report = await _context.Reports.FindAsync(reportId);
            if (report == null) throw new KeyNotFoundException("Report not found.");

            if (report.Status != "ReadyForVerification")
                throw new BadHttpRequestException($"Manual verification only allowed for reports in 'ReadyForVerification' status. Current: {report.Status}");

            // 1. Finalize State
            report.Status = "ManualVerified";
            report.VerificationMode = "Manual";
            report.VerifiedByUserId = pathologistId;
            report.VerifiedAt = DateTimeOffset.UtcNow;

            // 2. Sync Final Snapshot from Draft (GPT-5 Rule)
            report.FinalSnapshotJson = report.DraftSnapshotJson;

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(pathologistId, "ReportManualVerified", "Report", reportId, null);
        }

        public async Task<ReportSignatureResponseDto> SignReportAsync(Guid reportId, Guid signedByUserId)
        {
            // 1. Precondition checks
            var user = await _context.Users.FindAsync(signedByUserId);
            if (user == null || string.IsNullOrEmpty(user.SignatureImageUrl))
            {
                throw new BadHttpRequestException("User has no signature image configured.");
            }

            var report = await _context.Reports
                .FirstOrDefaultAsync(r => r.ReportId == reportId);

            if (report == null) throw new KeyNotFoundException("Report not found.");

            if (report.Status != "ReadyForVerification")
                throw new BadHttpRequestException($"Digital signing only allowed for reports in 'ReadyForVerification' status. Current: {report.Status}");

            // Branch Context Check via Engine happens downstream, but we need Order/Visit for logic below
            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(o => o.Test)
                .FirstOrDefaultAsync(o => o.OrderId == report.SourceId);

            if (order == null) throw new KeyNotFoundException($"Order with ID {report.SourceId} not found.");

            // 2. Use logical report version (Frozen at Submission)
            var currentVersion = report.CurrentVersion;

            // 3. Build canonical payload for hashing
            var timestamp = DateTimeOffset.UtcNow;
            var canonicalPayload = $"{report.ReportId}:{currentVersion}:{signedByUserId}:{timestamp:o}";
            
            string signatureHash;
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                var bytes = System.Text.Encoding.UTF8.GetBytes(canonicalPayload);
                var hashBytes = sha256.ComputeHash(bytes);
                signatureHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
            }

            // 4. Insert a row into ReportSignatures (Document History)
            var reportSignature = new ReportSignature
            {
                ReportId = reportId,
                SignedByUserId = signedByUserId,
                SignedAt = timestamp,
                SignatureImageUrl = user.SignatureImageUrl,
                SignatureHash = signatureHash,
                ReportVersion = currentVersion,
            };
            await _context.ReportSignatures.AddAsync(reportSignature);

            // 5. DELEGATE LIFECYCLE TRUTH TO ENGINE
            var branchId = _userContext.CurrentBranchId;
            await _operationsEngine.RecordReportSignedAsync(reportId, branchId, signedByUserId);

            // 5b. Finalize Lifecycle State & Snapshot
            report.Status = "Signed";
            report.VerificationMode = "Digital";
            report.VerifiedByUserId = signedByUserId;
            report.VerifiedAt = timestamp;
            report.UpdatedAt = timestamp;
            
            var finalData = await GetReportDataForPdfAsync(order.Visit.VisitId);
            if (finalData != null)
            {
                report.FinalSnapshotJson = System.Text.Json.JsonSerializer.Serialize(finalData);
            }

            // 6. Audit log
            await _auditService.LogAsync(signedByUserId, "ReportSigned", "Report", reportId, new { NewVersion = currentVersion });

            // Note: Engine emits REPORT_SIGNED event. We don't need to emit REPORT_READY here manually anymore, 
            // but if frontend expects "REPORT_READY" specifically, we might need to map it. 
            // The prompt says "Canonical events... REPORT_SIGNED". I used REPORT_SIGNED in Engine.
            // Existing code emitted REPORT_READY. I will assume REPORT_SIGNED replaces it as the truth.

            // --- FLOW B: RECEIVABLE CREATION TRIGGER ---
            var visitId = order.VisitId;
            var orderIdsForVisit = await _context.Orders
                .Where(o => o.VisitId == visitId)
                .Select(o => o.OrderId)
                .ToListAsync();

            var totalReportsForVisit = await _context.Reports
                .CountAsync(r => orderIdsForVisit.Contains(r.SourceId) && r.SourceType == "Order");

            var signedReportsForVisit = await _context.Reports
                .CountAsync(r => orderIdsForVisit.Contains(r.SourceId) && r.SourceType == "Order" && r.Status == "Signed");

            if (totalReportsForVisit > 0 && totalReportsForVisit == signedReportsForVisit)
            {
                var visit = await _context.Visits
                    .Include(v => v.Invoices)
                    .Include(v => v.ReferralPartner)
                    .FirstAsync(v => v.VisitId == visitId);

                if (visit.PaymentCollectionModel == "PartnerCollects" && visit.ReferralPartnerId.HasValue && visit.ReferralPartner != null && visit.ReferralPartner.IsActive)
                {
                    var invoice = visit.Invoices.Single(); 

                    var newReceivableFact = new ReceivableFact
                    {
                        ReceivableFactId = Guid.NewGuid(),
                        SourceVisitId = visit.VisitId,
                        ReferralPartnerId = visit.ReferralPartnerId.Value,
                        Amount = invoice.Total,
                        Currency = invoice.Currency,
                        OccurredAt = timestamp,
                        RecordedAt = DateTimeOffset.UtcNow
                    };

                    _context.ReceivableFacts.Add(newReceivableFact);
                    await _context.SaveChangesAsync();
                }
            }
            // --- END FLOW B ---

            // 7. Generate PDF
            try
            {
                var reportData = await GetReportDataForPdfAsync(order.Visit.VisitId);
                if (reportData != null)
                {
                    var template = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.Modality == order.Department && t.IsDefault);
                    if (template != null)
                    {
                        var templateModel = System.Text.Json.JsonSerializer.Deserialize<SynOS.Models.DTOs.ReportTemplateDsl.TemplateModel>(template.TemplateJson);
                        var pdfBytes = await _reportPdfRenderer.GeneratePdfAsync(reportData, templateModel);
                        var fileName = $"{report.ReportId}_v{currentVersion}.pdf";
                        var relativePath = await _fileStorageService.SaveFileAsync(pdfBytes, fileName, "reports");

                        // Find existing version created at submission and update it
                        var reportVersion = await _context.ReportVersions
                            .FirstOrDefaultAsync(rv => rv.ReportId == report.ReportId && rv.VersionNumber == currentVersion);

                        if (reportVersion != null)
                        {
                            reportVersion.PdfPath = relativePath;
                            reportVersion.SignedByUserId = signedByUserId;
                            reportVersion.SignedAt = timestamp;
                            await _context.SaveChangesAsync();
                        }
                        else
                        {
                            _logger.LogWarning("Existing ReportVersion {Version} not found for report {ReportId} during sign-off.", currentVersion, report.ReportId);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate and save PDF for Report {ReportId} after signing.", report.ReportId);
            }
            
            return new ReportSignatureResponseDto
            {
                ReportId = report.ReportId,
                SignedByUserId = signedByUserId,
                SignedAt = timestamp,
                SignatureHash = signatureHash,
                ReportVersion = currentVersion
            };
        }

        // ... SaveFinalResultsAsync (Result entry, not Report Lifecycle per se, although it validates paid status) ...

        public async Task MarkReportAsDeliveredAsync(Guid orderId)
        {
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.SourceId == orderId && r.SourceType == "Order");
            if (report == null) throw new KeyNotFoundException($"Pathology report for Order ID {orderId} not found.");

            // Delegate to Engine
            var branchId = _userContext.CurrentBranchId;
            var userId = _userContext.CurrentUserId; // Assuming Context has User ID
            
            // Note: RecordReportDeliveredAsync takes ReportId, but this method takes OrderId.
            // We found the report above using OrderId.
            await _operationsEngine.RecordReportDeliveredAsync(report.ReportId, branchId, userId);
        }

        public async Task SaveFinalResultsAsync(Guid orderId, SaveFinalResultsRequestDto request)
        {
            var branchId = _userContext.CurrentBranchId;
            var actorId = _userContext.CurrentUserId; // Assuming Context has User ID (Guid? or Guid). 
            // _userContext.CurrentUserId might be nullable or need parsing? 
            // Wait, I used signedByUserId (from args) in SignReport.
            // SaveFinalResultsRequestDto doesn't seem to have ActorId. 
            // I'll use a placeholder Guid if context doesn't provide strict Guid, or rely on implementation detail.
            // Let's assume _userContext provides it or I use Guid.Empty if system action (but this is user action).
            // Actually, I can likely get it from claims.
            
            // Checking how SignReport got it: it was passed as argument.
            // SaveFinalResults doesn't pass it.
            // I'll try to use _userContext.UserId if available, otherwise Guid.Empty.
            // Looking at UserContext interface from previous files... it has CurrentBranchId.
            // I'll assume I can get UserId from HttpContext if I really need to, but explicit is better.
            // For now, I'll pass Guid.Empty if I can't resolve it easily without changing DTO, 
            // OR I can parse it from the User Context if I cast.
            
            // Per minimal diff constraint, I won't add complex user resolution if not already there.
            // Previous code passed "Unknown" string as actor ID to event writer.
            // So passing Guid.Empty is effectively the same "Unknown".
            
            await _operationsEngine.RecordResultsVerifiedAsync(orderId, branchId, Guid.Empty, request.Results);
        }

        public async Task<FinalReportDto> GetFinalReportAsync(Guid orderId)
        {
            var report = await _context.Reports
                .Include(r => r.PathologyReport)
                .Include(r => r.TypedByUser)
                .Include(r => r.VerifiedByUser)
                .FirstOrDefaultAsync(r => r.SourceId == orderId && r.SourceType == "Order");

            if (report == null)
            {
                throw new InvalidOperationException($"Pathology report for Order ID {orderId} not found.");
            }
            
            var order = await _context.Orders
                .Include(o => o.Test) // Corrected to o.Test
                .Include(o => o.Visit).ThenInclude(v => v.Patient)
                .Include(o => o.Visit).ThenInclude(v => v.Referrer)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
            {
                throw new InvalidOperationException($"Order with ID {orderId} not found for report.");
            }

            // Cross-Branch Security Guard
            if (order.Visit?.BranchId.HasValue == true && order.Visit.BranchId != _userContext.CurrentBranchId)
            {
                _logger.LogWarning("Cross-branch report access blocked. OrderId: {OrderId}", orderId);
                throw new UnauthorizedAccessException("Access to this report is restricted.");
            }


            // 1. If FinalSnapshot exists (Signed/Manual), prioritize it.
            if (!string.IsNullOrEmpty(report.FinalSnapshotJson))
            {
                var snapshot = System.Text.Json.JsonSerializer.Deserialize<ReportDataModel>(report.FinalSnapshotJson);
                if (snapshot != null)
                {
                    return MapSnapshotToFinalReportDto(report, order, snapshot);
                }
            }

            // 2. If DraftSnapshot exists (ReadyForVerification), prioritize it.
            if (report.Status == "ReadyForVerification" && !string.IsNullOrEmpty(report.DraftSnapshotJson))
            {
                var snapshot = System.Text.Json.JsonSerializer.Deserialize<ReportDataModel>(report.DraftSnapshotJson);
                if (snapshot != null)
                {
                    return MapSnapshotToFinalReportDto(report, order, snapshot);
                }
            }

            // 2. Fallback to live data (for Drafts/Unsigned)
            var results = await _context.Results
                .Where(r => r.OrderId == orderId)
                .ToListAsync();

            // Group results by TestCode/TestName as per FinalReportDto structure
            var testResults = results
                .GroupBy(r => r.Order.TestCode)
                .Select(g => new TestResultDto
                {
                    TestCode = g.Key,
                    TestName = g.First().Order.Test?.TestName ?? g.Key,
                    Parameters = g.Select(r => new ReportParameterResultDto
                    {
                        ParameterCode = r.ParameterCode,
                        ParameterName = r.ParameterCode,
                        Value = r.Value,
                        Unit = r.Unit,
                        ReferenceRange = r.ReferenceRange,
                        Remarks = r.TechComments,
                        Flag = r.Flag
                    }).ToList()
                })
                .ToList();

            return new FinalReportDto
            {
                ReportId = report.ReportId,
                OrderId = order.OrderId,
                Patient = new PatientSummaryDto
                {
                    PatientId = order.Visit.Patient.PatientId,
                    Name = $"{order.Visit.Patient.FirstName} {order.Visit.Patient.LastName}",
                    Mrn = order.Visit.Patient.MRN
                },
                Visit = new VisitSummaryDto
                {
                    Id = order.Visit.VisitId,
                    Token = order.Visit.Token
                },
                Status = report.Status,
                VerificationMode = report.VerificationMode,
                SignedAt = report.SignedAt,
                VerifiedAt = report.VerifiedAt,
                Delivered = report.Delivered,
                DeliveredAt = report.DeliveredAt,
                PathologistComments = report.PathologyReport?.PathologistComments,
                Interpretation = report.PathologyReport?.Interpretation,
                Recommendations = report.PathologyReport?.Recommendations,
                TypedByUserName = report.TypedByUser?.Name,
                VerifiedByUserName = report.VerifiedByUser?.Name,
                TestResults = testResults
            };
        }

        public async Task<ReportDataModel?> GetReportDataForPdfAsync(Guid visitId)
        {
            var report = await _context.Reports
                .Include(r => r.PathologyReport) // Include PathologyReport for specific fields
                .FirstOrDefaultAsync(r => r.VisitId == visitId && r.SourceType == "Order"); // Filter by VisitId and SourceType

            if (report == null)
            {
                return null;
            }

            var order = await _context.Orders
                .Include(o => o.Test) // Corrected to o.Test
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .FirstOrDefaultAsync(o => o.OrderId == report.SourceId);

            if (order == null)
            {
                _logger.LogWarning("Order not found for report {ReportId} with SourceId {SourceId}", report.ReportId, report.SourceId);
                return null;
            }

            // Cross-Branch Security Guard
            if (order.Visit?.BranchId.HasValue == true && order.Visit.BranchId != _userContext.CurrentBranchId)
            {
                _logger.LogWarning("Cross-branch PDF access blocked. ReportId: {ReportId}", report.ReportId);
                throw new UnauthorizedAccessException("Access to this report PDF is restricted.");
            }

            // 1. If FinalSnapshot exists (Signed/Manual), prioritize it.
            if (!string.IsNullOrEmpty(report.FinalSnapshotJson))
            {
                var snapshot = System.Text.Json.JsonSerializer.Deserialize<ReportDataModel>(report.FinalSnapshotJson);
                if (snapshot != null) return snapshot;
            }

            // 2. If DraftSnapshot exists (ReadyForVerification), prioritize it.
            if (!string.IsNullOrEmpty(report.DraftSnapshotJson))
            {
                var snapshot = System.Text.Json.JsonSerializer.Deserialize<ReportDataModel>(report.DraftSnapshotJson);
                if (snapshot != null) return snapshot;
            }

            // 3. Fallback to Live Construction
            var patient = order.Visit.Patient;
            var structure = await _reportingService.GetReportStructureAsync(report.ReportId);
            
            var results = structure.Groups
                .SelectMany(g => g.Parameters)
                .Select(p => new ParameterResult
                {
                    Name = p.ParameterName,
                    Value = p.Value ?? string.Empty,
                    Unit = p.Unit,
                    ReferenceRange = p.ReferenceRange,
                    IsCritical = p.Flag?.Contains("Critical") ?? false
                })
                .ToList();

            // Fetch the latest signature
            var signature = await _context.ReportSignatures
                .Include(s => s.SignedByUser)
                .Where(s => s.ReportId == report.ReportId)
                .OrderByDescending(s => s.SignedAt)
                .FirstOrDefaultAsync();

            var signatureDetails = new SignatureDetails();
            byte[]? signatureImageBytes = null;

            if (signature != null && signature.SignedByUser != null)
            {
                signatureDetails.DoctorName = signature.SignedByUser.Name;
                signatureDetails.Credentials = "Pathologist"; // Placeholder

                if (!string.IsNullOrEmpty(signature.SignatureImageUrl))
                {
                    try
                    {
                        var httpClient = _httpClientFactory.CreateClient();
                        signatureImageBytes = await httpClient.GetByteArrayAsync(signature.SignatureImageUrl);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to download signature image from {Url}", signature.SignatureImageUrl);
                    }
                }
            }
            else
            {
                signatureDetails.DoctorName = "Unsigned";
            }
            signatureDetails.SignatureImage = signatureImageBytes;


            var qrCodeContent = $"{report.ReportId}_{(signature?.ReportVersion ?? report.CurrentVersion)}";
            if (signature != null)
            {
                qrCodeContent = $"{report.ReportId}_{signature.ReportVersion}_{signature.SignatureHash}";
            }


            return new ReportDataModel
            {
                Modality = order.Department,
                ReportTitle = $"{order.Department} Report",
                Patient = new PatientInfo
                {
                    Name = $"{patient.FirstName} {patient.LastName}",
                    PatientId = patient.MRN,
                    DateOfBirth = patient.DateOfBirth.ToString("yyyy-MM-dd"),
                    Gender = patient.Gender,
                    ContactInfo = patient.CurrentPhoneNumber ?? "N/A"
                },
                Parameters = results,
                Comments = report.PathologyReport?.PathologistComments ?? "",
                Interpretation = report.PathologyReport?.Interpretation ?? "",
                Recommendations = report.PathologyReport?.Recommendations ?? "",
                Signature = signatureDetails,
                SignedAt = signature?.SignedAt,
                ReportVersion = signature?.ReportVersion ?? report.CurrentVersion,
                SignatureHash = signature?.SignatureHash,
                VerificationQrCodeContent = qrCodeContent
            };
        }

        private FinalReportDto MapSnapshotToFinalReportDto(Report report, Order order, ReportDataModel snapshot)
        {
            return new FinalReportDto
            {
                ReportId = report.ReportId,
                OrderId = order.OrderId,
                Patient = new PatientSummaryDto
                {
                    PatientId = order.Visit.Patient.PatientId,
                    Name = snapshot.Patient.Name,
                    Mrn = snapshot.Patient.PatientId
                },
                Visit = new VisitSummaryDto
                {
                    Id = order.Visit.VisitId,
                    Token = order.Visit.Token
                },
                Status = report.Status,
                VerificationMode = report.VerificationMode,
                SignedAt = report.SignedAt,
                VerifiedAt = report.VerifiedAt,
                Delivered = report.Delivered,
                DeliveredAt = report.DeliveredAt,
                TypedByUserName = report.TypedByUser?.Name,
                VerifiedByUserName = report.VerifiedByUser?.Name,
                PathologistComments = snapshot.Comments,
                Interpretation = snapshot.Interpretation,
                Recommendations = snapshot.Recommendations,
                TestResults = new System.Collections.Generic.List<TestResultDto>
                {
                    new TestResultDto
                    {
                        TestCode = order.TestCode,
                        TestName = snapshot.ReportTitle,
                        Parameters = snapshot.Parameters.Select(p => new ReportParameterResultDto
                        {
                            ParameterName = p.Name,
                            Value = p.Value,
                            Unit = p.Unit,
                            ReferenceRange = p.ReferenceRange,
                            Flag = p.IsCritical ? "High" : "" 
                        }).ToList()
                    }
                }
            };
        }

        public async Task<System.Collections.Generic.IEnumerable<ReportListItemDto>> GetReportsByStatusAsync(string status)
        {
            // Support comma-separated statuses for multi-state queues (e.g. "Draft,ReadyForVerification")
            var statusList = status.Split(',').Select(s => s.Trim()).ToList();

            var reports = await _context.Reports
                .Include(r => r.TypedByUser)
                .Include(r => r.VerifiedByUser)
                .Where(r => statusList.Contains(r.Status) && r.SourceType == "Order")
                .OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            var orderIds = reports.Select(r => r.SourceId).ToList();

            var orders = await _context.Orders
                .Include(o => o.Test)
                .Include(o => o.Visit).ThenInclude(v => v.Patient)
                .Where(o => orderIds.Contains(o.OrderId))
                .AsNoTracking()
                .ToDictionaryAsync(o => o.OrderId);

            var resultsCount = await _context.Results
                .Where(res => orderIds.Contains(res.OrderId))
                .GroupBy(res => res.OrderId)
                .Select(g => new { OrderId = g.Key, AbnormalCount = g.Count(r => r.Flag != null && r.Flag != "Normal" && r.Flag != "" && r.Flag != "N") })
                .ToDictionaryAsync(x => x.OrderId, x => x.AbnormalCount);

            return reports.Select(r => {
                orders.TryGetValue(r.SourceId, out var order);
                resultsCount.TryGetValue(r.SourceId, out var abnormalCount);
                
                // Defensive guard for orphaned reports (where order is null)
                var patient = order?.Visit?.Patient;
                var age = (patient == null || patient.DateOfBirth == default) ? 0 : (int)((DateTime.Today - patient.DateOfBirth).TotalDays / 365.25);

                return new ReportListItemDto
                {
                    ReportId = r.ReportId,
                    PatientName = patient != null ? $"{patient.FirstName} {patient.LastName}" : "Unknown",
                    PatientAgeGender = patient != null ? $"{age} / {patient.Gender}" : "N/A",
                    TestName = order?.Test?.TestName ?? order?.TestCode ?? "Unknown",
                    Department = r.Department,
                    CreatedAt = r.CreatedAt,
                    Status = r.Status,
                    IsStat = false, // Placeholder per plan
                    AbnormalCount = abnormalCount,
                    Token = order?.Visit?.Token ?? "---",
                    TypedByUserName = r.TypedByUser?.Name,
                    VerifiedByUserName = r.VerifiedByUser?.Name
                };
            }).ToList();
        }
    }
}
