using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class ReportService : IReportService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ReportService> _logger;
        private readonly ICriticalValueService _criticalValueService;

        public ReportService(SynOSDbContext context, ILogger<ReportService> logger, ICriticalValueService criticalValueService)
        {
            _context = context;
            _logger = logger;
            _criticalValueService = criticalValueService;
        }

        public async Task<ReportVersionDto> SignReportAsync(Guid orderId, Guid pathologistId, ReportSignRequestDto metadata)
        {
            var hasPendingCriticals = await _context.CriticalAlerts
                .AnyAsync(a => a.Result.OrderId == orderId && a.Status == "Pending");

            if (hasPendingCriticals)
            {
                if (!metadata.ConfirmCriticalValuesReviewed)
                {
                    throw new InvalidOperationException("This report has pending critical alerts. To sign, set ConfirmCriticalValuesReviewed = true after reviewing them.");
                }
                
                // Bulk-acknowledge all pending critical alerts for this order
                await _criticalValueService.AcknowledgeAlertsForOrderAsync(orderId, pathologistId, "Acknowledged at report sign-off.");
            }

            // Find or create the report
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.OrderId == orderId);
            if (report == null)
            {
                report = new Report
                {
                    ReportId = Guid.NewGuid(),
                    OrderId = orderId,
                    Status = "Draft",
                    CurrentVersion = 0
                };
                _context.Reports.Add(report);
            }

            // Set Report status
            report.Status = "Signed";
            report.SignedByUserId = pathologistId;
            report.SignedAt = DateTimeOffset.UtcNow;
            report.PathologistComments = metadata.PathologistComments;
            report.Interpretation = metadata.Interpretation;
            report.Recommendations = metadata.Recommendations;
            report.CurrentVersion += 1;

            // Create ReportVersion
            var reportVersion = new ReportVersion
            {
                ReportVersionId = Guid.NewGuid(),
                ReportId = report.ReportId,
                VersionNumber = report.CurrentVersion,
                CreatedAt = DateTimeOffset.UtcNow,
                SignedByUserId = pathologistId,
                SignedAt = report.SignedAt.Value
            };

            _context.ReportVersions.Add(reportVersion);

            // Write CriticalAudit entry for the signing action itself
            var alertIds = await _context.CriticalAlerts
                .Where(a => a.Result.OrderId == orderId)
                .Select(a => a.AlertId)
                .ToListAsync();

            if (alertIds.Any())
            {
                 foreach (var alertId in alertIds)
                {
                    _context.CriticalAudits.Add(new CriticalAudit
                    {
                        AlertId = alertId,
                        Action = "SpecialistSigned",
                        ActedByUserId = pathologistId,
                        Details = $"Report signed, implicitly acknowledging critical alert."
                    });
                }
            }

            await _context.SaveChangesAsync();

            return new ReportVersionDto
            {
                ReportVersionId = reportVersion.ReportVersionId,
                ReportId = report.ReportId,
                VersionNumber = reportVersion.VersionNumber,
                CreatedAt = reportVersion.CreatedAt,
                SignedByUserId = reportVersion.SignedByUserId.Value,
                SignedAt = reportVersion.SignedAt.Value
            };
        }

        public async Task SaveFinalResultsAsync(Guid orderId, SaveFinalResultsRequestDto request)
        {
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
        }

        public async Task<FinalReportDto> GetFinalReportAsync(Guid orderId)
        {
            var report = await _context.Reports
                .Include(r => r.Order)
                    .ThenInclude(o => o.TestDefinition)
                .Include(r => r.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(r => r.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Referrer)
                .FirstOrDefaultAsync(r => r.OrderId == orderId);

            if (report == null)
            {
                throw new InvalidOperationException($"Report for Order ID {orderId} not found.");
            }

            var results = await _context.Results
                .Include(r => r.Order)
                .Where(r => r.OrderId == orderId)
                .ToListAsync();

            // Group results by TestCode/TestName as per FinalReportDto structure
            var testResults = results
                .GroupBy(r => r.Order.TestCode)
                .Select(g => new TestResultDto
                {
                    TestCode = g.Key,
                    TestName = g.First().Order.TestDefinition?.Name ?? g.Key,
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
                OrderId = report.OrderId,
                Patient = new PatientSummaryDto
                {
                    PatientId = report.Order.Visit.Patient.PatientId,
                    Name = $"{report.Order.Visit.Patient.FirstName} {report.Order.Visit.Patient.LastName}",
                    Mrn = report.Order.Visit.Patient.MRN
                },
                Visit = new VisitSummaryDto
                {
                    Id = report.Order.Visit.VisitId,
                    Token = report.Order.Visit.Token
                },
                Status = report.Status,
                SignedAt = report.SignedAt,
                Delivered = report.Delivered,
                DeliveredAt = report.DeliveredAt,
                TestResults = testResults
            };
        }

        public async Task MarkReportAsDeliveredAsync(Guid orderId)
        {
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.OrderId == orderId);

            if (report == null)
            {
                throw new InvalidOperationException($"Report for Order ID {orderId} not found.");
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
                .Include(r => r.Order)
                    .ThenInclude(o => o.TestDefinition)
                .Include(r => r.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(r => r.SignedBy) // Include the user who signed the report
                .FirstOrDefaultAsync(r => r.Order.VisitId == visitId); // Filter by VisitId

            if (report == null || report.Order == null || report.Order.Visit == null || report.Order.Visit.Patient == null)
            {
                return null;
            }

            var patient = report.Order.Visit.Patient;
            var visit = report.Order.Visit;
            var order = report.Order;

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

            byte[]? signatureImage = null;

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
                Comments = report.PathologistComments ?? "",
                Interpretation = report.Interpretation ?? "",
                Recommendations = report.Recommendations ?? "",
                Signature = new SignatureDetails
                {
                    DoctorName = report.SignedBy?.Name ?? "Unsigned",
                    Credentials = "Pathologist",
                    SignatureImage = signatureImage
                },
                VerificationQrCodeContent = $"https://synos.com/verify/{report.ReportId}"
            };
        }
    }
}
