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
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration; // Added for IConfiguration // Added for logging
using Microsoft.AspNetCore.Http; // Potentially needed for BadHttpRequestException, as observed previously
using Microsoft.Extensions.Options;

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
    private readonly IFileStorageService _fileStorageService; // Inject IFileStorageService

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
        IFileStorageService fileStorageService) // Inject IFileStorageService
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
        _fileStorageService = fileStorageService;
    }

    public async Task<List<DeliveryQueueItemDto>> GetDeliveryQueueAsync(string? department, string? status)
    {
        // Query Reports where:
        // Status = 'Signed' (or equivalent signed/completed status)
        // AND:
        // Either no DeliveryLogs exist, OR
        // latest DeliveryLog is not 'Delivered' and not 'HandedOver'.
        // Filter by department if provided (e.g. pathology, radiology).

        var query = _context.Reports
            .Include(r => r.Order)
                .ThenInclude(o => o.Visit)
                    .ThenInclude(v => v.Patient)
            .Include(r => r.ReportVersions)
            .Where(r => r.Status == "Signed"); // Assuming 'Signed' is the final status before delivery

        if (!string.IsNullOrEmpty(department))
        {
            query = query.Where(r => r.Order.Department == department);
        }

        var reports = await query.ToListAsync();

        var dtos = new List<DeliveryQueueItemDto>();

        foreach (var report in reports)
        {
            var latestDeliveryLog = await _context.DeliveryLogs
                .Where(dl => dl.ReportId == report.ReportId)
                .OrderByDescending(dl => dl.CreatedAt)
                .FirstOrDefaultAsync();

            if (status == "Pending" && (latestDeliveryLog?.Status == Models.Enums.DeliveryStatus.Delivered || latestDeliveryLog?.Status == Models.Enums.DeliveryStatus.HandedOver))
            {
                continue; // Skip if status is Pending but it's already delivered/handed over
            }

            // Fallback for cases where report.SignedAt is null, perhaps for older reports
            DateTimeOffset signedAt = report.SignedAt ?? report.Order.CreatedAt; 

            // Get Patient Age and Gender (assuming Patient entity has DateOfBirth and Gender)
            // Simplified age calculation for DTO for now, could be a helper method
            int age = DateTime.Today.Year - report.Order.Visit.Patient.DateOfBirth.Year;
            if (report.Order.Visit.Patient.DateOfBirth.Date > DateTime.Today.AddYears(-age)) age--;

            // Get Tests (list or comma-separated)
            var tests = new List<string> { report.Order.TestCode }; // Simplified, could be a list of actual test names

            // Get CriticalCount (assuming CriticalAlerts exist for results related to this report's order)
            int criticalCount = await _context.CriticalAlerts
                .Include(ca => ca.Result)
                .Where(ca => ca.Result != null && ca.Result.OrderId == report.Order.OrderId && ca.Status == "Open") // Corrected to use OrderId
                .CountAsync();
            
            // Get the PDF URL from the latest ReportVersion
            var latestReportVersion = report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
            string pdfUrl = "";
            if (latestReportVersion != null && !string.IsNullOrEmpty(latestReportVersion.PdfPath))
            {
                pdfUrl = _fileStorageService.GetFileUrl(latestReportVersion.PdfPath);
            }
            else
            {
                _logger.LogWarning("No PDF path found for ReportId: {ReportId}", report.ReportId);
            }


            dtos.Add(new DeliveryQueueItemDto(
                report.ReportId,
                report.Order.Visit.Token, // TokenNumber
                $"{report.Order.Visit.Patient.FirstName} {report.Order.Visit.Patient.LastName}", // PatientName
                age,
                report.Order.Visit.Patient.Gender,
                report.Order.Visit.Patient.CurrentPhoneNumber, // PatientPhone
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
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
        {
            _logger.LogWarning("Attempted to print non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        var latestReportVersion = report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
        if (latestReportVersion == null || string.IsNullOrEmpty(latestReportVersion.PdfPath))
        {
            _logger.LogError("PDF path missing for report {ReportId}", reportId);
            throw new BadHttpRequestException("Report PDF not available for printing.", 400);
        }

        string pdfUrl = _fileStorageService.GetFileUrl(latestReportVersion.PdfPath);

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
            .Include(r => r.Order)
                .ThenInclude(o => o.Visit)
                    .ThenInclude(v => v.Patient)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
        {
            _logger.LogWarning("Attempted WhatsApp delivery for non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        var patientName = $"{report.Order.Visit.Patient.FirstName} {report.Order.Visit.Patient.LastName}";
        var tests = report.Order.TestCode; // Simplified, get actual test names

        // Build message text
        var message = $"Dear {patientName}, your lab report for {tests} is ready. Download your report here: {secureLinkDto.Link} This link is valid for {secureLinkDto.ExpiresAt:dd-MM-yyyy HH:mm} and can be downloaded {secureLinkDto.MaxDownloads} times. - SynOS Lab";

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
        await _context.SaveChangesAsync();

        // Create NotificationQueue entry
        var notificationQueue = new NotificationQueue
        {
            Type = NotificationType.WHATSAPP,
            TargetId = deliveryLog.LogId,
            Recipient = phone,
            Content = message,
            Status = NotificationStatus.Pending
        };
        _context.NotificationQueues.Add(notificationQueue);
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
            .Include(r => r.Order)
                .ThenInclude(o => o.Visit)
                    .ThenInclude(v => v.Patient)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
        {
            _logger.LogWarning("Attempted SMS delivery for non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        // Build short SMS-style text
        var message = $"Lab report ready. Download: {secureLinkDto.Link} Valid for 24h. - SynOS Lab";

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
            .Include(r => r.Order)
                .ThenInclude(o => o.Visit)
                    .ThenInclude(v => v.Patient)
            .Include(r => r.ReportVersions)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
        {
            _logger.LogWarning("Attempted Email delivery for non-existent report: {ReportId}", reportId);
            throw new BadHttpRequestException("Report not found.", 404);
        }

        var latestReportVersion = report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
        string? attachmentPath = null;
        if (latestReportVersion != null && !string.IsNullOrEmpty(latestReportVersion.PdfPath))
        {
            attachmentPath = latestReportVersion.PdfPath;
        }
        else
        {
            _logger.LogWarning("No PDF path found for ReportId: {ReportId} for email attachment.", reportId);
        }

        var patientName = $"{report.Order.Visit.Patient.FirstName} {report.Order.Visit.Patient.LastName}";
        var tests = report.Order.TestCode; // Simplified

        // Build email payload
        var emailPayload = new EmailPayload(
            Subject: $"Your Lab Report - {patientName}",
            HtmlBody: $"<p>Dear {patientName},</p><p>Your lab report for {tests} is ready. Please find it attached.</p><p>Thank you,</p><p>SynOS Lab</p>",
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

        var linkUrl = $"{_secureLinkBaseUrl}/download/{token}";
        
        return new SecureLinkDto(token, linkUrl, expiresAt, maxDownloads, maxDownloads);
    }

    public async Task<Stream> VerifyAndDownloadAsync(string token, string phone)
    {
        // Validate phone input
        if (!IsIndianMobileNumber(phone))
        {
            _logger.LogWarning("Invalid phone number format for secure download token {Token}: {Phone}", token, phone);
            throw new BadHttpRequestException("Invalid 10-digit Indian mobile number.", 401);
        }

        var downloadLink = await _context.DownloadLinks
            .Include(dl => dl.Report)
                .ThenInclude(r => r.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Patient)
            .Include(dl => dl.Report.ReportVersions)
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

        // Fetch the patient’s registered phone
        var patientPhoneNumber = downloadLink.Report.Order.Visit.Patient.CurrentPhoneNumber;

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

        // Fetch the report’s PDF as a Stream
        var latestReportVersion = downloadLink.Report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
        if (latestReportVersion == null || string.IsNullOrEmpty(latestReportVersion.PdfPath))
        {
            _logger.LogError("PDF path missing for report {ReportId} associated with token {Token}", downloadLink.ReportId, token);
            throw new BadHttpRequestException("Report PDF not available for download.", 404);
        }

        // Assuming _fileStorageService can provide a Stream for a given path
        return await _fileStorageService.GetFileStreamAsync(latestReportVersion.PdfPath);
    }

    public async Task<DeliveryResultDto> MarkHandedOverAsync(Guid reportId, Guid userId)
    {
        var report = await _context.Reports.FirstOrDefaultAsync(r => r.ReportId == reportId);
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
                var report = await _context.Reports
                    .Include(r => r.ReportVersions)
                    .Include(r => r.Order)
                        .ThenInclude(o => o.Visit)
                            .ThenInclude(v => v.Patient)
                    .FirstOrDefaultAsync(r => r.ReportId == reportId);
                
                var latestReportVersion = report?.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
                string? attachmentPath = latestReportVersion?.PdfPath;
                
                var emailPayload = new EmailPayload(
                    Subject: $"Your Lab Report - {report?.Order.Visit.Patient.FirstName} {report?.Order.Visit.Patient.LastName}",
                    HtmlBody: $"<p>Dear {report?.Order.Visit.Patient.FirstName} {report?.Order.Visit.Patient.LastName},</p><p>Your lab report is ready. Please find it attached.</p><p>Thank you,</p><p>SynOS Lab</p>",
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
                .ThenInclude(r => r.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Patient)
            .FirstOrDefaultAsync(dl => dl.Token == token);

        if (downloadLink == null)
        {
            return new SecureLinkVerificationDto(false, "N/A", new List<string>(), DateTimeOffset.MinValue, 0);
        }

        bool isValid = downloadLink.IsActive && downloadLink.ExpiresAt > DateTimeOffset.UtcNow && downloadLink.DownloadCount < downloadLink.MaxDownloads;

        var patientName = $"{downloadLink.Report?.Order?.Visit?.Patient?.FirstName} {downloadLink.Report?.Order?.Visit?.Patient?.LastName}" ?? "N/A";
        var tests = new List<string> { downloadLink.Report?.Order?.TestCode ?? "N/A" }; // Simplified

        return new SecureLinkVerificationDto(
            isValid,
            patientName,
            tests,
            downloadLink.ExpiresAt,
            downloadLink.MaxDownloads - downloadLink.DownloadCount
        );
    }
}
