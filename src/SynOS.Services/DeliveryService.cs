using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Notifications;
using SynOS.Models.Entities;
using SynOS.Models.Enums;
using SynOS.Services.Storage;
using SynOS.Services.Utils;
using System.Security.Cryptography;
using System.Text;
using System.IO.Compression; // Added for ZipArchive
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration; // Added for IConfiguration // Added for logging
using Microsoft.AspNetCore.Http; // Potentially needed for BadHttpRequestException, as observed previously
using Microsoft.Extensions.Options;
using SynOS.Models.Events;

namespace SynOS.Services;

public class DeliveryService : IDeliveryService
{
    private readonly SynOSDbContext _context;
    private readonly IReportService _reportService;
    private readonly IPatientService _patientService;
    private readonly IUserService _userService;
    private readonly IWhatsAppSender _whatsAppSender;
    private readonly ISmsSender _smsSender;
    private readonly IEmailSender _emailSender;
    private readonly IPrintService _printService;
    private readonly ILogger<DeliveryService> _logger;
    private readonly string _secureLinkBaseUrl;
    private readonly string _publicBaseUrl;
    private readonly IFileStorageService _fileStorageService; // Inject IFileStorageService
    private readonly IMiddlewareOutboxService _outboxService;

    public DeliveryService(
        SynOSDbContext context,
        IReportService reportService,
        IPatientService patientService,
        IUserService userService,
        IWhatsAppSender whatsAppSender,
        ISmsSender smsSender,
        IEmailSender emailSender,
        IPrintService printService,
        ILogger<DeliveryService> logger,
        IConfiguration configuration, // Inject IConfiguration
        IFileStorageService fileStorageService,
        IMiddlewareOutboxService outboxService) // Inject outbox service
    {
        _context = context;
        _reportService = reportService;
        _patientService = patientService;
        _userService = userService;
        _whatsAppSender = whatsAppSender;
        _smsSender = smsSender;
        _emailSender = emailSender;
        _printService = printService;
        _logger = logger;
        _secureLinkBaseUrl = configuration["SecureLink:BaseUrl"] ?? throw new ArgumentNullException("SecureLink:BaseUrl not configured.");
        _publicBaseUrl = configuration["SecureLink:PublicBaseUrl"] ?? "http://127.0.0.1:59999";
        _fileStorageService = fileStorageService;
        _outboxService = outboxService;
    }

    public async Task<List<DeliveryQueueItemDto>> GetDeliveryQueueAsync(string? department, string? status)
    {
        var query = _context.Reports
            .Where(r => r.Status == "Signed"); // Assuming 'Signed' is the final status before delivery

        // Conditionally include related entities based on SourceType
        // For 'Order' (pathology) reports
        var orderReportsQuery = query
            .Where(r => r.SourceType == "Order")
            .Include(r => EF.Property<Order>(r, "SourceId")) // Include Order based on SourceId
                .ThenInclude(o => o.Visit)
                    .ThenInclude(v => v.Patient)
            .Include(r => EF.Property<Order>(r, "SourceId")) // Include Order based on SourceId
                .ThenInclude(o => o.Test); // Corrected to o.Test

        // For 'RadiologyStudy' reports
        var radiologyReportsQuery = query
            .Where(r => r.SourceType == "RadiologyStudy")
            .Include(r => EF.Property<RadiologyStudy>(r, "SourceId")) // Include RadiologyStudy based on SourceId
                .ThenInclude(rs => rs.Visit)
                    .ThenInclude(v => v.Patient)
            .Include(r => EF.Property<RadiologyStudy>(r, "SourceId")) // Include RadiologyStudy to get Order
                .ThenInclude(rs => rs.Order)
                    .ThenInclude(o => o.Test); // Corrected to o.Test

        // Union the results
        var allReports = await orderReportsQuery
            .Union(radiologyReportsQuery)
            .Include(r => r.ReportVersions) // ReportVersions are common
            .ToListAsync();

        var dtos = new List<DeliveryQueueItemDto>();

        foreach (var report in allReports)
        {
            string reportDepartment;
            string testCode;
            string testName;
            Guid visitId;
            Guid patientId;
            string patientFirstName;
            string patientLastName;
            DateTime patientDateOfBirth;
            string patientGender;
            string patientCurrentPhoneNumber;
            string visitToken;
            DateTimeOffset orderCreatedAt;

            if (report.SourceType == "Order")
            {
                var order = await _context.Orders
                    .Include(o => o.Visit)
                        .ThenInclude(v => v.Patient)
                    .Include(o => o.Test) // Corrected to o.Test
                    .FirstOrDefaultAsync(o => o.OrderId == report.SourceId);

                if (order == null) continue; // Should not happen if data is consistent

                reportDepartment = order.Department;
                testCode = order.TestCode;
                testName = order.Test.TestName ?? order.TestCode; // Corrected to order.Test.TestName
                visitId = order.Visit.VisitId;
                patientId = order.Visit.Patient.PatientId;
                patientFirstName = order.Visit.Patient.FirstName;
                patientLastName = order.Visit.Patient.LastName;
                patientDateOfBirth = order.Visit.Patient.DateOfBirth;
                patientGender = order.Visit.Patient.Gender;
                patientCurrentPhoneNumber = order.Visit.Patient.CurrentPhoneNumber;
                visitToken = order.Visit.Token;
                orderCreatedAt = order.CreatedAt;
            }
            else if (report.SourceType == "RadiologyStudy")
            {
                var radiologyStudy = await _context.RadiologyStudies
                    .Include(rs => rs.Visit)
                        .ThenInclude(v => v.Patient)
                    .Include(rs => rs.Order)
                        .ThenInclude(o => o.Test) // Corrected to o.Test
                    .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == report.SourceId);

                if (radiologyStudy == null) continue; // Should not happen

                reportDepartment = "Radiology"; // Explicitly set for Radiology Studies
                testCode = radiologyStudy.Order.TestCode;
                testName = radiologyStudy.Order.Test.TestName ?? radiologyStudy.Order.TestCode; // Corrected to radiologyStudy.Order.Test.TestName
                visitId = radiologyStudy.Visit.VisitId;
                patientId = radiologyStudy.Visit.Patient.PatientId;
                patientFirstName = radiologyStudy.Visit.Patient.FirstName;
                patientLastName = radiologyStudy.Visit.Patient.LastName;
                patientDateOfBirth = radiologyStudy.Visit.Patient.DateOfBirth;
                patientGender = radiologyStudy.Visit.Patient.Gender;
                patientCurrentPhoneNumber = radiologyStudy.Visit.Patient.CurrentPhoneNumber;
                visitToken = radiologyStudy.Visit.Token;
                orderCreatedAt = radiologyStudy.CreatedAt; // Use study's created date as equivalent
            }
            else
            {
                continue; // Skip unknown source types
            }

            // Apply department filter
            if (!string.IsNullOrEmpty(department) && reportDepartment != department)
            {
                continue;
            }

            var latestDeliveryLog = await _context.DeliveryLogs
                .Where(dl => dl.ReportId == report.ReportId)
                .OrderByDescending(dl => dl.CreatedAt)
                .FirstOrDefaultAsync();

            if (status == "Pending" && (latestDeliveryLog?.Status == Models.Enums.DeliveryStatus.Delivered || latestDeliveryLog?.Status == Models.Enums.DeliveryStatus.HandedOver))
            {
                continue; // Skip if status is Pending but it's already delivered/handed over
            }

            DateTimeOffset signedAt = report.SignedAt ?? orderCreatedAt; 

            int age = DateTime.Today.Year - patientDateOfBirth.Year;
            if (patientDateOfBirth.Date > DateTime.Today.AddYears(-age)) age--;

            var tests = new List<string> { testName }; // Use testName

            int criticalCount = 0;
            if (report.SourceType == "Order") // Critical alerts are tied to results/orders
            {
                criticalCount = await _context.CriticalAlerts
                    .Include(ca => ca.Result)
                    .Where(ca => ca.Result != null && ca.Result.OrderId == report.SourceId && ca.Status == "Open")
                    .CountAsync();
            }
            
            var latestReportVersion = report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
            string pdfUrl = "";
            if (latestReportVersion != null && !string.IsNullOrEmpty(latestReportVersion.PdfPath))
            {
                pdfUrl = _fileStorageService.GetFileUrl(latestReportVersion.PdfPath);
            }
            else if (!string.IsNullOrEmpty(report.PdfUrl))
            {
                pdfUrl = _fileStorageService.GetFileUrl(report.PdfUrl);
            }
            else
            {
                _logger.LogWarning("No PDF path found for ReportId: {ReportId}", report.ReportId);
            }

            dtos.Add(new DeliveryQueueItemDto(
                report.ReportId,
                visitToken, // TokenNumber
                $"{patientFirstName} {patientLastName}", // PatientName
                age,
                patientGender,
                patientCurrentPhoneNumber, // PatientPhone
                null, // PatientEmail - Patient entity does not have an email field
                tests,
                signedAt,
                criticalCount,
                pdfUrl,
                latestDeliveryLog?.DeliveryMethod,
                latestDeliveryLog?.Status
            ));
        }

        // Sort: Critical reports first, Then by signed date (oldest first).
        return dtos.OrderByDescending(d => d.CriticalCount > 0)
                   .ThenBy(d => d.SignedAt)
                   .ToList();
    }

    public async Task<DeliveryResultDto> DeliverViaPrintAsync(Guid reportId, Guid userId)
    {
        var report = await _context.Reports
            .Include(r => r.ReportVersions)
            .Include(r => r.Visit)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
        {
            _logger.LogWarning("Attempted to print non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        string pdfUrl = "";
        var latestReportVersion = report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
        if (latestReportVersion != null && !string.IsNullOrEmpty(latestReportVersion.PdfPath))
        {
            pdfUrl = _fileStorageService.GetFileUrl(latestReportVersion.PdfPath);
        }
        else if (!string.IsNullOrEmpty(report.PdfUrl))
        {
            pdfUrl = _fileStorageService.GetFileUrl(report.PdfUrl);
        }
        else
        {
            _logger.LogError("PDF path missing for report {ReportId}", reportId);
            throw new BadHttpRequestException("Report PDF not available for printing.", 400);
        }

        // Queue print
        await _printService.QueuePrintAsync(reportId, pdfUrl);

        // Create DeliveryLog
        var deliveryLog = new DeliveryLog
        {
            ReportId = reportId,
            DeliveryMethod = DeliveryMethod.Print,
            DeliveredBy = userId,
            Status = Models.Enums.DeliveryStatus.Delivered // Treat as delivered once queued
        };
        _context.DeliveryLogs.Add(deliveryLog);

        // Update Report State to Delivered
        report.Delivered = true;
        report.DeliveredAt = DateTimeOffset.UtcNow;
        report.Status = "Delivered";

        // Enqueue ReportDeliveredEvent
        _outboxService.Enqueue(new ReportDeliveredEvent(
            report.ReportId,
            deliveryLog.LogId,
            "Print",
            null,
            null,
            DateTimeOffset.UtcNow,
            userId,
            report.Visit?.BranchId
        ));

        await _context.SaveChangesAsync();

        _logger.LogInformation("Report {ReportId} queued for printing by User {UserId}. LogId: {LogId}", reportId, userId, deliveryLog.LogId);
        return new DeliveryResultDto(deliveryLog.LogId, deliveryLog.Status.ToString());
    }

    public async Task<DeliveryResultWithLinkDto> DeliverViaWhatsAppAsync(Guid reportId, string phone, Guid userId)
    {
        // Validate phone
        if (!IsIndianMobileNumber(phone))
        {
            _logger.LogWarning("Invalid phone number for WhatsApp delivery: {Phone}", phone);
            throw new BadHttpRequestException("Invalid 10-digit Indian mobile number.", 400);
        }

        // Generate Secure Link
        var secureLinkDto = await GenerateSecureLinkInternalAsync(reportId, userId);
        
        var report = await _context.Reports
            .Include(r => r.Visit)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
        {
            _logger.LogWarning("Attempted WhatsApp delivery for non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        string patientName;
        string tests;

        if (report.SourceType == "Order")
        {
            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(o => o.OrderId == report.SourceId);

            if (order == null) throw new KeyNotFoundException("Order not found for report.");
            patientName = $"{order.Visit.Patient.FirstName} {order.Visit.Patient.LastName}";
            tests = order.TestCode; // Simplified, get actual test names
        }
        else if (report.SourceType == "RadiologyStudy")
        {
            var radiologyStudy = await _context.RadiologyStudies
                .Include(rs => rs.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(rs => rs.Order)
                    .ThenInclude(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == report.SourceId);

            if (radiologyStudy == null) throw new KeyNotFoundException("Radiology Study not found for report.");
            patientName = $"{radiologyStudy.Visit.Patient.FirstName} {radiologyStudy.Visit.Patient.LastName}";
            tests = radiologyStudy.Order.TestCode; // Simplified
        }
        else
        {
            throw new InvalidOperationException($"Unsupported Report SourceType: {report.SourceType}");
        }

        // Create DeliveryLog
        var deliveryLog = new DeliveryLog
        {
            ReportId = reportId,
            DeliveryMethod = DeliveryMethod.WhatsApp,
            RecipientPhone = phone,
            DeliveredBy = userId,
            Status = Models.Enums.DeliveryStatus.Pending
        };
        _context.DeliveryLogs.Add(deliveryLog);

        // Update Report State to Delivered
        report.Delivered = true;
        report.DeliveredAt = DateTimeOffset.UtcNow;
        report.Status = "Delivered";

        await _context.SaveChangesAsync();

        var profile = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
        var labId = profile?.LabId ?? "LAB001";

        // Enqueue ReportDeliveryRequestedEvent
        _outboxService.Enqueue(new ReportDeliveryRequestedEvent(
            reportId,
            report.VisitId,
            report.Visit.PatientId,
            labId,
            phone,
            secureLinkDto.Link,
            patientName,
            tests,
            report.Visit?.BranchId
        ));

        await _context.SaveChangesAsync();

        _logger.LogInformation("Report {ReportId} WhatsApp delivery queued for {Phone} by User {UserId}. LogId: {LogId}", reportId, phone, userId, deliveryLog.LogId);
        return new DeliveryResultWithLinkDto(deliveryLog.LogId, deliveryLog.Status.ToString(), secureLinkDto.Link, secureLinkDto.Token, secureLinkDto.ExpiresAt);
    }

    public async Task<DeliveryResultWithLinkDto> DeliverViaSmsAsync(Guid reportId, string phone, Guid userId)
    {
        // Validate phone
        if (!IsIndianMobileNumber(phone))
        {
            _logger.LogWarning("Invalid phone number for SMS delivery: {Phone}", phone);
            throw new BadHttpRequestException("Invalid 10-digit Indian mobile number.", 400);
        }

        // Generate Secure Link
        var secureLinkDto = await GenerateSecureLinkInternalAsync(reportId, userId);
        
        var report = await _context.Reports
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
        {
            _logger.LogWarning("Attempted SMS delivery for non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        string patientName;
        string tests; // Not used in SMS, but kept for consistency if needed later

        if (report.SourceType == "Order")
        {
            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(o => o.OrderId == report.SourceId);

            if (order == null) throw new KeyNotFoundException("Order not found for report.");
            patientName = $"{order.Visit.Patient.FirstName} {order.Visit.Patient.LastName}";
            tests = order.TestCode; // Simplified, get actual test names
        }
        else if (report.SourceType == "RadiologyStudy")
        {
            var radiologyStudy = await _context.RadiologyStudies
                .Include(rs => rs.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(rs => rs.Order)
                    .ThenInclude(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == report.SourceId);

            if (radiologyStudy == null) throw new KeyNotFoundException("Radiology Study not found for report.");
            patientName = $"{radiologyStudy.Visit.Patient.FirstName} {radiologyStudy.Visit.Patient.LastName}";
            tests = radiologyStudy.Order.TestCode; // Simplified
        }
        else
        {
            throw new InvalidOperationException($"Unsupported Report SourceType: {report.SourceType}");
        }

        // Build short SMS-style text
        var message = $"Lab report (w/ images) ready. Download: {secureLinkDto.PackageLink} - SynOS Lab";

        // Create DeliveryLog
        var deliveryLog = new DeliveryLog
        {
            ReportId = reportId,
            DeliveryMethod = DeliveryMethod.SMS,
            RecipientPhone = phone,
            DeliveredBy = userId,
            Status = Models.Enums.DeliveryStatus.Pending
        };
        _context.DeliveryLogs.Add(deliveryLog);

        // Update Report State to Delivered
        report.Delivered = true;
        report.DeliveredAt = DateTimeOffset.UtcNow;
        report.Status = "Delivered";

        await _context.SaveChangesAsync();

        // Create NotificationQueue entry
        var notificationQueue = new NotificationQueue
        {
            Type = NotificationType.SMS,
            TargetId = deliveryLog.LogId,
            Recipient = phone,
            Content = message,
            Status = NotificationStatus.Pending
        };
        _context.NotificationQueues.Add(notificationQueue);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Report {ReportId} SMS delivery queued for {Phone} by User {UserId}. LogId: {LogId}", reportId, phone, userId, deliveryLog.LogId);
        return new DeliveryResultWithLinkDto(deliveryLog.LogId, deliveryLog.Status.ToString(), secureLinkDto.Link, secureLinkDto.Token, secureLinkDto.ExpiresAt);
    }

    public async Task<DeliveryResultDto> DeliverViaEmailAsync(Guid reportId, string email, Guid userId)
    {
        // Basic email validation
        if (!IsValidEmail(email))
        {
            _logger.LogWarning("Invalid email for Email delivery: {Email}", email);
            throw new BadHttpRequestException("Invalid email address.", 400);
        }

        var report = await _context.Reports
            .Include(r => r.ReportVersions)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
        {
            _logger.LogWarning("Attempted Email delivery for non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        string patientName;
        string tests;

        if (report.SourceType == "Order")
        {
            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(o => o.OrderId == report.SourceId);

            if (order == null) throw new KeyNotFoundException("Order not found for report.");
            patientName = $"{order.Visit.Patient.FirstName} {order.Visit.Patient.LastName}";
            tests = order.TestCode; // Simplified, get actual test names
        }
        else if (report.SourceType == "RadiologyStudy")
        {
            var radiologyStudy = await _context.RadiologyStudies
                .Include(rs => rs.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(rs => rs.Order)
                    .ThenInclude(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == report.SourceId);

            if (radiologyStudy == null) throw new KeyNotFoundException("Radiology Study not found for report.");
            patientName = $"{radiologyStudy.Visit.Patient.FirstName} {radiologyStudy.Visit.Patient.LastName}";
            tests = radiologyStudy.Order.TestCode; // Simplified
        }
        else
        {
            throw new InvalidOperationException($"Unsupported Report SourceType: {report.SourceType}");
        }

        var latestReportVersion = report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
        string? attachmentPath = null;
        if (latestReportVersion != null && !string.IsNullOrEmpty(latestReportVersion.PdfPath))
        {
            attachmentPath = latestReportVersion.PdfPath;
        }
        else
        {
            _logger.LogWarning("No PDF path found for ReportId: {ReportId} for email attachment.", report.ReportId);
        }

        // Generate Secure Link
        var secureLinkDto = await GenerateSecureLinkInternalAsync(reportId, userId);

        // Build email payload
        var emailPayload = new EmailPayload(
            Subject: $"Your Lab Report - {patientName}",
            HtmlBody: $"<p>Dear {patientName},</p><p>Your lab report for {tests} is ready (including images). Please find the main report attached. You can also download the complete report package (including images) here: <a href=\"{secureLinkDto.PackageLink}\">{secureLinkDto.PackageLink}</a></p><p>Thank you,</p><p>SynOS Lab</p>",
            AttachmentPath: attachmentPath
        );

        // Create DeliveryLog
        var deliveryLog = new DeliveryLog
        {
            ReportId = reportId,
            DeliveryMethod = DeliveryMethod.Email,
            RecipientEmail = email,
            DeliveredBy = userId,
            Status = Models.Enums.DeliveryStatus.Pending
        };
        _context.DeliveryLogs.Add(deliveryLog);

        // Update Report State to Delivered
        report.Delivered = true;
        report.DeliveredAt = DateTimeOffset.UtcNow;
        report.Status = "Delivered";

        await _context.SaveChangesAsync();

        // Create NotificationQueue entry
        var notificationQueue = new NotificationQueue
        {
            Type = NotificationType.EMAIL,
            TargetId = deliveryLog.LogId,
            Recipient = email,
            Content = System.Text.Json.JsonSerializer.Serialize(emailPayload),
            Status = NotificationStatus.Pending
        };
        _context.NotificationQueues.Add(notificationQueue);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Report {ReportId} Email delivery queued for {Email} by User {UserId}. LogId: {LogId}", reportId, email, userId, deliveryLog.LogId);
        return new DeliveryResultDto(deliveryLog.LogId, deliveryLog.Status.ToString());
    }

    public async Task<SecureLinkDto> GenerateSecureLinkAsync(Guid reportId, Guid userId)
    {
        return await GenerateSecureLinkInternalAsync(reportId, userId);
    }

    private async Task<SecureLinkDto> GenerateSecureLinkInternalAsync(Guid reportId, Guid userId)
    {
        var token = GenerateUniqueToken();
        var expiresAt = DateTimeOffset.UtcNow.AddHours(24);
        const int maxDownloads = 3;

        var downloadLink = new DownloadLink
        {
            ReportId = reportId,
            Token = token,
            CreatedBy = userId,
            ExpiresAt = expiresAt,
            MaxDownloads = maxDownloads,
            IsActive = true
        };
        _context.DownloadLinks.Add(downloadLink);
        await _context.SaveChangesAsync();

        var linkUrl = $"{_publicBaseUrl}/r/{token}";
        var packageLinkUrl = $"{_publicBaseUrl}/r/{token}?pkg=1";
        
        return new SecureLinkDto(token, linkUrl, packageLinkUrl, expiresAt, maxDownloads, maxDownloads);
    }

    public async Task<Stream> VerifyAndDownloadAsync(string token, string phone)
    {
        // Validate phone input
        if (!IsIndianMobileNumber(phone))
        {
            _logger.LogWarning("Invalid phone number format for secure download token {Token}: {Phone}", token, phone);
            throw new BadHttpRequestException("InvalidPhoneOrLink", 401);
        }

        var downloadLink = await _context.DownloadLinks
            .Include(dl => dl.Report)
                .ThenInclude(r => r.ReportVersions)
            .FirstOrDefaultAsync(dl => dl.Token == token);

        if (downloadLink == null || !downloadLink.IsActive)
        {
            _logger.LogWarning("Attempted download with non-existent or inactive token: {Token}", token);
            throw new BadHttpRequestException("InvalidPhoneOrLink", 401);
        }

        // Validate link
        if (downloadLink.ExpiresAt <= DateTimeOffset.UtcNow || downloadLink.DownloadCount >= downloadLink.MaxDownloads)
        {
            downloadLink.IsActive = false; // Deactivate expired/exhausted links
            await _context.SaveChangesAsync();
            _logger.LogWarning("Attempted download with expired or exhausted token: {Token}", token);
            throw new BadHttpRequestException("InvalidPhoneOrLink", 401);
        }

        // Fetch the patient’s registered phone and compare
        string patientPhoneNumber;
        if (downloadLink.Report.SourceType == "Order")
        {
            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .FirstOrDefaultAsync(o => o.OrderId == downloadLink.Report.SourceId);
            
            if (order == null) throw new KeyNotFoundException("Order not found for report.");
            patientPhoneNumber = order.Visit.Patient.CurrentPhoneNumber;
        }
        else if (downloadLink.Report.SourceType == "RadiologyStudy")
        {
            var radiologyStudy = await _context.RadiologyStudies
                .Include(rs => rs.Visit)
                    .ThenInclude(v => v.Patient)
                .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == downloadLink.Report.SourceId);

            if (radiologyStudy == null) throw new KeyNotFoundException("Radiology Study not found for report.");
            patientPhoneNumber = radiologyStudy.Visit.Patient.CurrentPhoneNumber;
        }
        else
        {
            throw new InvalidOperationException($"Unsupported Report SourceType: {downloadLink.Report.SourceType}");
        }

        // Compare strings
        if (phone != patientPhoneNumber)
        {
            _logger.LogWarning("Phone number mismatch for secure download token {Token}. Provided: {ProvidedPhone}, Expected: {ExpectedPhone}", token, phone, patientPhoneNumber);
            throw new BadHttpRequestException("InvalidPhoneOrLink", 401);
        }

        // If valid:
        downloadLink.DownloadCount++;
        if (downloadLink.DownloadedAt == null)
        {
            downloadLink.DownloadedAt = DateTimeOffset.UtcNow;
        }
        if (downloadLink.DownloadCount >= downloadLink.MaxDownloads)
        {
            downloadLink.IsActive = false; // Deactivate if max downloads reached
        }
        await _context.SaveChangesAsync();
        _logger.LogInformation("Secure download successful for token {Token} by phone {Phone}. DownloadCount: {DownloadCount}", token, phone, downloadLink.DownloadCount);

        // Update DeliveryLog (True Delivery Signal)
        var deliveryLog = await _context.DeliveryLogs
            .Where(dl => dl.ReportId == downloadLink.ReportId && dl.RecipientPhone == phone && dl.Status != DeliveryStatus.Delivered)
            .OrderByDescending(dl => dl.CreatedAt)
            .FirstOrDefaultAsync();

        if (deliveryLog != null)
        {
            deliveryLog.Status = DeliveryStatus.Delivered;
            deliveryLog.DeliveredAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        // Fetch the report’s PDF as a Stream
        string? pdfPath = null;
        var latestReportVersion = downloadLink.Report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
        if (latestReportVersion != null && !string.IsNullOrEmpty(latestReportVersion.PdfPath))
        {
            pdfPath = latestReportVersion.PdfPath;
        }
        else if (!string.IsNullOrEmpty(downloadLink.Report.PdfUrl))
        {
            pdfPath = downloadLink.Report.PdfUrl;
        }

        if (string.IsNullOrEmpty(pdfPath))
        {
            _logger.LogError("PDF path missing for report {ReportId} associated with token {Token}", downloadLink.ReportId, token);
            throw new BadHttpRequestException("Report PDF not available for download.", 404);
        }

        // Assuming _fileStorageService can provide a Stream for a given path
        return await _fileStorageService.GetFileStreamAsync(pdfPath);
    }

    public async Task<DeliveryResultDto> MarkHandedOverAsync(Guid reportId, Guid userId)
    {
        var report = await _context.Reports
            .Include(r => r.Visit)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);
        if (report == null)
        {
            _logger.LogWarning("Attempted to mark handed over non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        var deliveryLog = new DeliveryLog
        {
            ReportId = reportId,
            DeliveryMethod = DeliveryMethod.HandedOver,
            DeliveredBy = userId,
            Status = Models.Enums.DeliveryStatus.HandedOver
        };
        _context.DeliveryLogs.Add(deliveryLog);

        // Enqueue ReportDeliveredEvent
        _outboxService.Enqueue(new ReportDeliveredEvent(
            report.ReportId,
            deliveryLog.LogId,
            "HandedOver",
            null,
            null,
            DateTimeOffset.UtcNow,
            userId,
            report.Visit?.BranchId
        ));

        await _context.SaveChangesAsync();

        _logger.LogInformation("Report {ReportId} marked as handed over by User {UserId}. LogId: {LogId}", reportId, userId, deliveryLog.LogId);
        return new DeliveryResultDto(deliveryLog.LogId, deliveryLog.Status.ToString());
    }

    public async Task<List<DeliveryAttemptDto>> GetAttemptsAsync(Guid reportId)
    {
        var attempts = await _context.DeliveryAttempts
            .Include(da => da.DeliveryLog)
            .Where(da => da.DeliveryLog.ReportId == reportId)
            .ToListAsync(); // Get the full entities first

        var detailedAttempts = new List<DeliveryAttemptDto>();
        foreach (var attempt in attempts)
        {
            // Try to find the associated notification queue entry for true retry count
            var notificationQueue = await _context.NotificationQueues
                .FirstOrDefaultAsync(nq => nq.TargetId == attempt.LogId && nq.Type.ToString() == attempt.DeliveryLog.DeliveryMethod.ToString());
            
            detailedAttempts.Add(new DeliveryAttemptDto(
                attempt.DeliveryLog.DeliveryMethod,
                attempt.DeliveryLog.RecipientPhone ?? attempt.DeliveryLog.RecipientEmail ?? "N/A",
                attempt.Attempt,
                attempt.SentAt,
                attempt.Status,
                attempt.ErrorMessage,
                notificationQueue?.RetryCount ?? 0 // Use actual retry count from NotificationQueue
            ));
        }

        return detailedAttempts;
    }

    public async Task<DeliveryResultDto> ResendAsync(Guid reportId, DeliveryMethod method, Guid userId)
    {
        // Find the latest DeliveryLog for given reportId and method
        var latestDeliveryLog = await _context.DeliveryLogs
            .Where(dl => dl.ReportId == reportId && dl.DeliveryMethod == method)
            .OrderByDescending(dl => dl.CreatedAt)
            .FirstOrDefaultAsync();

        if (latestDeliveryLog == null)
        {
            _logger.LogWarning("Attempted to resend non-existent delivery log for ReportId: {ReportId}, Method: {Method}", reportId, method);
            throw new BadHttpRequestException("No previous delivery attempt found for this method.", 404);
        }

        // Rebuild the message content from domain state or reuse Content from NotificationQueue
        string content = "";
        string recipient = latestDeliveryLog.RecipientPhone ?? latestDeliveryLog.RecipientEmail ?? "";
        NotificationType notificationType;

        switch (method)
        {
            case DeliveryMethod.WhatsApp:
            case DeliveryMethod.SMS:
                notificationType = method == DeliveryMethod.WhatsApp ? NotificationType.WHATSAPP : NotificationType.SMS;
                var secureLinkDto = await GenerateSecureLinkInternalAsync(reportId, userId); // Generate new link for resend
                content = method == DeliveryMethod.WhatsApp 
                    ? $"Dear Patient, your lab report is ready. Download here: {secureLinkDto.Link} - SynOS Lab" 
                    : $"Lab report ready. Download: {secureLinkDto.Link} - SynOS Lab";
                break;
            case DeliveryMethod.Email:
                notificationType = NotificationType.EMAIL;
                var emailReport = await _context.Reports
                    .Include(r => r.ReportVersions)
                    .FirstOrDefaultAsync(r => r.ReportId == reportId);

                string emailPatientName;
                string emailTests;

                if (emailReport.SourceType == "Order")
                {
                    var order = await _context.Orders
                        .Include(o => o.Visit)
                            .ThenInclude(v => v.Patient)
                        .Include(o => o.Test) // Corrected to o.Test
                        .FirstOrDefaultAsync(o => o.OrderId == emailReport.SourceId);
                    if (order == null) throw new KeyNotFoundException("Order not found for report.");
                    emailPatientName = $"{order.Visit.Patient.FirstName} {order.Visit.Patient.LastName}";
                    emailTests = order.TestCode;
                }
                else if (emailReport.SourceType == "RadiologyStudy")
                {
                    var radiologyStudy = await _context.RadiologyStudies
                        .Include(rs => rs.Visit)
                            .ThenInclude(v => v.Patient)
                        .Include(rs => rs.Order)
                            .ThenInclude(o => o.Test) // Corrected to o.Test
                        .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == emailReport.SourceId);
                    if (radiologyStudy == null) throw new KeyNotFoundException("Radiology Study not found for report.");
                    emailPatientName = $"{radiologyStudy.Visit.Patient.FirstName} {radiologyStudy.Visit.Patient.LastName}";
                    emailTests = radiologyStudy.Order.TestCode;
                }
                else
                {
                    throw new InvalidOperationException($"Unsupported Report SourceType: {emailReport.SourceType}");
                }
                
                var latestReportVersion = emailReport?.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
                string? attachmentPath = latestReportVersion?.PdfPath;
                
                var emailPayload = new EmailPayload(
                    Subject: $"Your Lab Report - {emailPatientName}",
                    HtmlBody: $"<p>Dear {emailPatientName},</p><p>Your lab report is ready. Please find it attached.</p><p>Thank you,</p><p>SynOS Lab</p>",
                    AttachmentPath: attachmentPath
                );
                content = System.Text.Json.JsonSerializer.Serialize(emailPayload);
                break;
            case DeliveryMethod.Print:
            case DeliveryMethod.SecureLink: // SecureLink would typically generate a new link each time
            case DeliveryMethod.HandedOver:
            default:
                _logger.LogWarning("Resend is not supported or makes no sense for DeliveryMethod: {Method}", method);
                throw new BadHttpRequestException($"Resend not supported for {method}.", 400);
        }

        // Create new NotificationQueue entry for re-sending
        var notificationQueue = new NotificationQueue
        {
            Type = notificationType,
            TargetId = latestDeliveryLog.LogId, // Link to the original DeliveryLog
            Recipient = recipient,
            Content = content,
            Status = NotificationStatus.Pending,
            RetryCount = 0, // Reset retry count for a new send attempt
            NextRetryAt = null // Send immediately
        };
        _context.NotificationQueues.Add(notificationQueue);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Resend queued for ReportId: {ReportId}, Method: {Method} by User {UserId}. NotificationQueueId: {QueueId}", reportId, method, userId, notificationQueue.QueueId);
        return new DeliveryResultDto(latestDeliveryLog.LogId, DeliveryStatus.Pending.ToString());
    }

    private string GenerateUniqueToken()
    {
        return Guid.NewGuid().ToString("N"); // N format for no hyphens
    }

    private bool IsIndianMobileNumber(string phone)
    {
        // Indian mobile numbers are 10 digits and start with 6, 7, 8, or 9.
        return !string.IsNullOrEmpty(phone) && phone.Length == 10 && System.Text.RegularExpressions.Regex.IsMatch(phone, @"^[6-9]\d{9}$");
    }

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    public async Task<SecureLinkVerificationDto> GetSecureLinkVerificationDetailsAsync(string token)
    {
        var downloadLink = await _context.DownloadLinks
            .Include(dl => dl.Report)
            .FirstOrDefaultAsync(dl => dl.Token == token);

        if (downloadLink == null)
        {
            return new SecureLinkVerificationDto(false, "N/A", new List<string>(), DateTimeOffset.MinValue, 0);
        }

        bool isValid = downloadLink.IsActive && downloadLink.ExpiresAt > DateTimeOffset.UtcNow && downloadLink.DownloadCount < downloadLink.MaxDownloads;

        string patientName;
        List<string> tests;

        if (downloadLink.Report.SourceType == "Order")
        {
            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .FirstOrDefaultAsync(o => o.OrderId == downloadLink.Report.SourceId);
            
            if (order == null) throw new KeyNotFoundException("Order not found for report.");
            patientName = $"{order.Visit.Patient.FirstName} {order.Visit.Patient.LastName}";
            tests = new List<string> { order.TestCode };
        }
        else if (downloadLink.Report.SourceType == "RadiologyStudy")
        {
            var radiologyStudy = await _context.RadiologyStudies
                .Include(rs => rs.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(rs => rs.Order)
                    .ThenInclude(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == downloadLink.Report.SourceId);

            if (radiologyStudy == null) throw new KeyNotFoundException("Radiology Study not found for report.");
            patientName = $"{radiologyStudy.Visit.Patient.FirstName} {radiologyStudy.Visit.Patient.LastName}";
            tests = new List<string> { radiologyStudy.Order.TestCode };
        }
        else
        {
            throw new InvalidOperationException($"Unsupported Report SourceType: {downloadLink.Report.SourceType}");
        }

        return new SecureLinkVerificationDto(
            isValid,
            patientName,
            tests,
            downloadLink.ExpiresAt,
            downloadLink.MaxDownloads - downloadLink.DownloadCount
        );
    }

    public async Task<Stream> DownloadReportPackageAsync(string token, string phoneNumber)
    {
        // Reuse verification logic from VerifyAndDownloadAsync
        // Validate phone input
        if (!IsIndianMobileNumber(phoneNumber))
        {
            _logger.LogWarning("Invalid phone number format for secure download package token {Token}: {Phone}", token, phoneNumber);
            throw new BadHttpRequestException("InvalidPhoneOrLink", 401);
        }

        var downloadLink = await _context.DownloadLinks
            .Include(dl => dl.Report)
                .ThenInclude(r => r.Attachments)
            .FirstOrDefaultAsync(dl => dl.Token == token);

        if (downloadLink == null || !downloadLink.IsActive)
        {
            _logger.LogWarning("Attempted download package with non-existent or inactive token: {Token}", token);
            throw new BadHttpRequestException("InvalidPhoneOrLink", 401);
        }

        // Validate link expiration and download count
        if (downloadLink.ExpiresAt <= DateTimeOffset.UtcNow || downloadLink.DownloadCount >= downloadLink.MaxDownloads)
        {
            downloadLink.IsActive = false; // Deactivate expired/exhausted links
            await _context.SaveChangesAsync();
            _logger.LogWarning("Attempted download package with expired or exhausted token: {Token}", token);
            throw new BadHttpRequestException("InvalidPhoneOrLink", 401);
        }

        // Fetch the patient’s registered phone and compare
        string patientPhoneNumber;
        if (downloadLink.Report.SourceType == "Order")
        {
            var order = await _context.Orders
                .Include(o => o.Visit)
                    .ThenInclude(v => v.Patient)
                .FirstOrDefaultAsync(o => o.OrderId == downloadLink.Report.SourceId);

            if (order == null) throw new KeyNotFoundException("Order not found for report.");
            patientPhoneNumber = order.Visit.Patient.CurrentPhoneNumber;
        }
        else if (downloadLink.Report.SourceType == "RadiologyStudy")
        {
            var radiologyStudy = await _context.RadiologyStudies
                .Include(rs => rs.Visit)
                    .ThenInclude(v => v.Patient)
                .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == downloadLink.Report.SourceId);
            
            if (radiologyStudy == null) throw new KeyNotFoundException("Radiology Study not found for report.");
            patientPhoneNumber = radiologyStudy.Visit.Patient.CurrentPhoneNumber;
        }
        else
        {
            throw new InvalidOperationException($"Unsupported Report SourceType: {downloadLink.Report.SourceType}");
        }


        if (phoneNumber != patientPhoneNumber)
        {
            _logger.LogWarning("Phone number mismatch for secure download package token {Token}. Provided: {ProvidedPhone}, Expected: {ExpectedPhone}", token, phoneNumber, patientPhoneNumber);
            throw new BadHttpRequestException("InvalidPhoneOrLink", 401);
        }

        // If valid: Increment download count and update link
        downloadLink.DownloadCount++;
        if (downloadLink.DownloadedAt == null)
        {
            downloadLink.DownloadedAt = DateTimeOffset.UtcNow;
        }
        if (downloadLink.DownloadCount >= downloadLink.MaxDownloads)
        {
            downloadLink.IsActive = false; // Deactivate if max downloads reached
        }
        await _context.SaveChangesAsync();
        _logger.LogInformation("Secure download package successful for token {Token} by phone {Phone}. DownloadCount: {DownloadCount}", token, phoneNumber, downloadLink.DownloadCount);

        // Retrieve report and attachments
        var report = downloadLink.Report;
        if (report == null)
        {
            _logger.LogError("Report not found for download link {Token}", token);
            throw new BadHttpRequestException("Report not found for download.", 404);
        }

        var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            foreach (var attachment in report.Attachments)
            {
                // Ensure FileUrl is not null or empty
                if (string.IsNullOrEmpty(attachment.FileUrl))
                {
                    _logger.LogWarning("Attachment {AttachmentId} has no FileUrl. Skipping.", attachment.AttachmentId);
                    continue;
                }

                // Get file stream from storage service
                using (var fileStream = await _fileStorageService.GetFileStreamAsync(attachment.FileUrl))
                {
                    var entry = archive.CreateEntry(attachment.DisplayName);
                    using (var entryStream = entry.Open())
                    {
                        await fileStream.CopyToAsync(entryStream);
                    }
                }
            }
        }

        memoryStream.Position = 0; // Reset stream position for reading
        return memoryStream;
    }
}