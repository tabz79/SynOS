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
using SynOS.Services.Operational; // ADDED
using SynOS.Models.Enums; // ADDED

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
        private readonly IAuditService _auditService; // Injected
        private readonly IOperationalEventWriter _operationalEventWriter; // ADDED

        public ReportService(
            SynOSDbContext context, 
            ILogger<ReportService> logger, 
            ICriticalValueService criticalValueService, 
            IHttpClientFactory httpClientFactory,
            IReportPdfRenderer reportPdfRenderer,
            IFileStorageService fileStorageService,
            IAuditService auditService, // Injected
            IOperationalEventWriter operationalEventWriter) // ADDED
        {
            _context = context;
            _logger = logger;
            _criticalValueService = criticalValueService;
            _httpClientFactory = httpClientFactory;
            _reportPdfRenderer = reportPdfRenderer;
            _fileStorageService = fileStorageService;
            _auditService = auditService; // Assigned
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter)); // ADDED
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

            if (report == null)
            {
                throw new KeyNotFoundException("Report not found.");
            }

            if (report.SourceType != "Order")
            {
                throw new InvalidOperationException($"Report ID {reportId} is not a Pathology report (SourceType: {report.SourceType}). This service only handles Pathology reports.");
            }

            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(o => o.OrderId == report.SourceId);

            if (order == null)
            {
                throw new KeyNotFoundException($"Order with ID {report.SourceId} not found for report {reportId}.");
            }

            // Assuming a status like 'Validated' or 'ReadyForSigning'
            if (report.Status != "Validated" && report.Status != "ReadyForSignature")
            {
                throw new InvalidOperationException($"Report is not in a state that can be signed. Current state: {report.Status}");
            }

            var hasPendingCriticals = await _criticalValueService.HasPendingCriticalAlerts(report.SourceId);
            if (hasPendingCriticals)
            {
                throw new InvalidOperationException("Report has pending critical alerts that must be acknowledged before signing.");
            }

            // 2. Determine logical report version
            var newVersion = report.CurrentVersion + 1;

            // 3. Build canonical payload for hashing
            var timestamp = DateTimeOffset.UtcNow;
            var canonicalPayload = $"{report.ReportId}:{newVersion}:{signedByUserId}:{timestamp:o}"; // Simple version, can be expanded
            
            string signatureHash;
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                var bytes = System.Text.Encoding.UTF8.GetBytes(canonicalPayload);
                var hashBytes = sha256.ComputeHash(bytes);
                signatureHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
            }

            // 4. Insert a row into ReportSignatures
            var reportSignature = new ReportSignature
            {
                ReportId = reportId,
                SignedByUserId = signedByUserId,
                SignedAt = timestamp,
                SignatureImageUrl = user.SignatureImageUrl,
                SignatureHash = signatureHash,
                ReportVersion = newVersion,
            };
            await _context.ReportSignatures.AddAsync(reportSignature);

            // 5. Update report status
            report.Status = "Signed";
            report.CurrentVersion = newVersion;
            report.SignedByUserId = signedByUserId; // Keep track of the last signer on the main report table
            report.SignedAt = timestamp;

            // 6. Audit log
            await _auditService.LogAsync(signedByUserId, "ReportSigned", "Report", reportId, new { NewVersion = newVersion });

            await _context.SaveChangesAsync();

            // Emit Operational Event: REPORT_READY
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.REPORT_READY,
                order.Visit?.BranchId?.ToString() ?? "Main",
                order.VisitId.ToString(),
                order.Visit?.Token ?? "Unknown",
                $"Report signed and ready (v{newVersion})",
                "User",
                signedByUserId.ToString()
            );

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
                    var invoice = visit.Invoices.Single(); // Fails if not exactly one invoice

                    var newReceivableFact = new ReceivableFact
                    {
                        ReceivableFactId = Guid.NewGuid(),
                        SourceVisitId = visit.VisitId,
                        ReferralPartnerId = visit.ReferralPartnerId.Value,
                        Amount = invoice.Total,
                        Currency = invoice.Currency,
                        OccurredAt = report.SignedAt.Value,
                        RecordedAt = DateTimeOffset.UtcNow
                    };

                    _context.ReceivableFacts.Add(newReceivableFact);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("ReceivableFact created for VisitId {VisitId} for partner {PartnerId}", visit.VisitId, visit.ReferralPartnerId);
                }
            }
            // --- END FLOW B ---

            // 7. Proper Fix: Generate and Save PDF, then create ReportVersion
            try
            {
                var reportData = await GetReportDataForPdfAsync(order.Visit.VisitId);
                if (reportData != null)
                {
                    // Fetch default template for the modality
                    var template = await _context.ReportTemplates
                        .FirstOrDefaultAsync(t => t.Modality == order.Department && t.IsDefault);
                    
                    if (template != null)
                    {
                        var templateModel = System.Text.Json.JsonSerializer.Deserialize<SynOS.Models.DTOs.ReportTemplateDsl.TemplateModel>(template.TemplateJson);
                        var pdfBytes = await _reportPdfRenderer.GeneratePdfAsync(reportData, templateModel);
                        
                        var fileName = $"{report.ReportId}_v{newVersion}.pdf";
                        var relativePath = await _fileStorageService.SaveFileAsync(pdfBytes, fileName, "reports");

                        var reportVersion = new ReportVersion
                        {
                            ReportId = report.ReportId,
                            VersionNumber = newVersion,
                            PdfPath = relativePath,
                            SignedByUserId = signedByUserId,
                            SignedAt = timestamp
                        };
                        _context.ReportVersions.Add(reportVersion);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Successfully generated and saved PDF for Report {ReportId}, Version {Version}. Path: {Path}", report.ReportId, newVersion, relativePath);
                    }
                    else
                    {
                        _logger.LogWarning("No default report template found for department {Department}. PDF not generated.", order.Department);
                    }
                }
                else
                {
                    _logger.LogWarning("Could not retrieve report data for PDF generation for VisitId {VisitId}.", order.Visit.VisitId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate and save PDF for Report {ReportId} after signing.", report.ReportId);
                // The signing itself is already committed, so this is a subsequent failure that needs attention.
                // Depending on requirements, you might want to enqueue a retry job.
            }
            
            // 8. Return response
            return new ReportSignatureResponseDto
            {
                ReportId = report.ReportId,
                SignedByUserId = signedByUserId,
                SignedAt = timestamp,
                SignatureHash = signatureHash,
                ReportVersion = newVersion
            };
        }

        public async Task SaveFinalResultsAsync(Guid orderId, SaveFinalResultsRequestDto request)
        {
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.SourceId == orderId && r.SourceType == "Order");
            if (report == null)
            {
                throw new KeyNotFoundException($"Pathology report for order ID {orderId} not found.");
            }

            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Invoices)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
            {
                throw new InvalidOperationException($"Order with ID {orderId} not found.");
            }

            // Rule: Order must be paid or report save is rejected.
            if (order.Visit == null || !order.Visit.Invoices.Any(i => i.Status == "FullPaid"))
            {
                throw new InvalidOperationException("Order must be fully paid before results can be finalized for reporting.");
            }

            foreach (var finalResultDto in request.Results)
            {
                var result = await _context.Results
                    .FirstOrDefaultAsync(r => r.OrderId == orderId && r.ParameterCode == finalResultDto.ParameterCode);

                if (result == null)
                {
                    // Rule: Only tests belonging to that order may be updated.
                    _logger.LogWarning("Attempted to save result for parameter '{ParameterCode}' which does not belong to order '{OrderId}'.", finalResultDto.ParameterCode, orderId);
                    continue; // Skip this result instead of throwing
                }

                result.Value = finalResultDto.Value;
                result.TechComments = finalResultDto.Remarks;
                result.Status = "Finalized"; // Mark as finalized data ready for reporting
            }

            // Rule: All required parameters for selected tests must have a value.
            // For now, we ensure all results submitted in the request have a value.
            foreach (var result in request.Results)
            {
                if (string.IsNullOrWhiteSpace(result.Value))
                {
                    throw new InvalidOperationException($"Parameter '{result.ParameterCode}' requires a value.");
                }
            }
            
            await _context.SaveChangesAsync();

            // Emit Operational Event: REPORT_VERIFIED
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.REPORT_VERIFIED,
                order.Visit?.BranchId?.ToString() ?? "Main",
                order.VisitId.ToString(),
                order.Visit?.Token ?? "Unknown",
                "Results finalized and verified",
                "User",
                "Unknown" // Actor ID not passed to SaveFinalResultsAsync
            );
        }

        public async Task<FinalReportDto> GetFinalReportAsync(Guid orderId)
        {
            var report = await _context.Reports
                .Include(r => r.PathologyReport) // Include PathologyReport for specific fields
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


            var results = await _context.Results
                .Where(r => r.OrderId == orderId)
                .ToListAsync();

            // Group results by TestCode/TestName as per FinalReportDto structure
            var testResults = results
                .GroupBy(r => r.Order.TestCode)
                .Select(g => new TestResultDto
                {
                    TestCode = g.Key,
                    TestName = g.First().Order.Test.TestName ?? g.Key, // Corrected to o.Test.TestName
                    Parameters = g.Select(r => new ReportParameterResultDto
                    {
                        ParameterCode = r.ParameterCode,
                        ParameterName = r.ParameterCode, // Assuming parameter name is same as code if not explicitly stored
                        Value = r.Value,
                        Unit = r.Unit, // Assuming Unit is available on Result entity
                        ReferenceRange = r.ReferenceRange, // Assuming ReferenceRange is available on Result entity
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
                SignedAt = report.SignedAt,
                Delivered = report.Delivered,
                DeliveredAt = report.DeliveredAt,
                PathologistComments = report.PathologyReport?.PathologistComments, // Access through PathologyReport
                Interpretation = report.PathologyReport?.Interpretation, // Access through PathologyReport
                Recommendations = report.PathologyReport?.Recommendations, // Access through PathologyReport
                TestResults = testResults
            };
        }

        public async Task MarkReportAsDeliveredAsync(Guid orderId)
        {
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.SourceId == orderId && r.SourceType == "Order");

            if (report == null)
            {
                throw new InvalidOperationException($"Pathology report for Order ID {orderId} not found.");
            }

            if (report.Status != "Signed")
            {
                throw new InvalidOperationException($"Report for Order ID {orderId} must be signed before it can be marked as delivered.");
            }

            // Critical Value check - ensure all critical alerts are acknowledged
            var hasPendingCriticals = await _context.CriticalAlerts
                .AnyAsync(a => a.Result.OrderId == orderId && a.Status == "Pending");

            if (hasPendingCriticals)
            {
                throw new InvalidOperationException("Critical alerts must be acknowledged by a specialist before report delivery.");
            }

            // Idempotent: Only update if not already delivered
            if (!report.Delivered)
            {
                report.Delivered = true;
                report.DeliveredAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();
            }
            else
            {
                _logger.LogInformation("Report for Order ID {OrderId} was already marked as delivered.", orderId);
            }
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

            var patient = order.Visit.Patient;
            var visit = order.Visit;
            
            var results = await _context.Results
                .Where(r => r.OrderId == order.OrderId)
                .Select(r => new ParameterResult
                {
                    Name = r.ParameterCode,
                    Value = r.Value.ToString(),
                    Unit = r.Unit,
                    ReferenceRange = r.ReferenceRange,
                    IsCritical = r.Flag == "C"
                })
                .ToListAsync();

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
    }
}