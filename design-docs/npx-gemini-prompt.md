Immutable Guardrails (must follow)

- DO NOT run any shell commands, builds, or git operations.
- If a DB migration or dotnet ef step is needed, only tell the Product Owner to run it; you must not run it.
- If a new package is needed, just mention the install command in the TLDR; don’t execute it.
- Preserve existing structure and style in each file.
After changes, output only a TLDR terminal-style summary:
- What the issue/goal was (1–2 sentences)
- What you implemented (1–2 sentences)
- Which files changed (names only)
No code diffs, no full file dumps.
Extra guardrail for this task:
-Do NOT create or modify anything under web/ or any frontend/React/TSX files.
-If you feel UI changes are needed, just mention them in the TLDR as “future UI work”, do not implement.

Prompt: 

You are a .NET 8 BACKEND expert building a diagnostic lab system.

STACK:
- ASP.NET Core .NET 8 Web API
- EF Core for data access
- SQL Server
- Background worker using IHostedService / BackgroundService

TASK (BACKEND ONLY):

Build the backend for the "Delivery Desk" with:

- Delivery queue API
- Multi-channel delivery:
  - Print
  - WhatsApp
  - SMS
  - Email
  - Secure download link
- Secure link protected by patient's 10-digit mobile number (NO OTP, NO DOB)
- Link expiry and download limits
- Notification queue + retry logic
- Delivery logs + attempts history

NO FRONTEND CODE.  
Everything must be implemented as REST APIs and backend services that a future React frontend can call.

---

## DATABASE DESIGN

Create these tables (or equivalent EF Core entities + migrations).  
Use proper foreign keys to existing `Reports`, `Users`, and `Patients` tables.

### 1. DeliveryLogs

Tracks each delivery action (print, WhatsApp, SMS, email, secure link, handed over).

```sql
DeliveryLogs (
  LogId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ReportId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Reports(ReportId),
  DeliveryMethod VARCHAR(50) NOT NULL,  -- 'Print', 'WhatsApp', 'SMS', 'Email', 'SecureLink', 'HandedOver'
  RecipientPhone VARCHAR(20) NULL,
  RecipientEmail VARCHAR(200) NULL,
  DeliveredBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  DeliveredAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  Status VARCHAR(50) NOT NULL DEFAULT 'Delivered',  -- 'Delivered', 'Pending', 'Failed', 'HandedOver'
  TrackingInfo NVARCHAR(MAX) NULL,  -- JSON with delivery details (provider message id, etc.)
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_DeliveryLogs_ReportId ON DeliveryLogs(ReportId);
CREATE INDEX IX_DeliveryLogs_DeliveredAt ON DeliveryLogs(DeliveredAt);
2. DeliveryAttempts
Tracks retry attempts for a specific delivery log (e.g., WhatsApp or email retries).

sql
Copy code
DeliveryAttempts (
  AttemptId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  LogId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES DeliveryLogs(LogId),
  Attempt INT NOT NULL DEFAULT 1,
  SentAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  Status VARCHAR(50) NOT NULL,  -- 'Pending', 'Sent', 'Delivered', 'Failed', 'Bounced'
  ErrorMessage NVARCHAR(MAX) NULL,
  ResponseData NVARCHAR(MAX) NULL  -- JSON with provider response
);
3. DownloadLinks
Secure download tokens, with expiry and max downloads.
NOTE: NO OTP, NO DOB.

sql
Copy code
DownloadLinks (
  LinkId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ReportId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Reports(ReportId),
  Token VARCHAR(100) NOT NULL UNIQUE,  -- GUID-based token string
  CreatedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  ExpiresAt DATETIMEOFFSET NOT NULL,  -- 24 hours from creation
  DownloadedAt DATETIMEOFFSET NULL,
  DownloadCount INT NOT NULL DEFAULT 0,
  MaxDownloads INT NOT NULL DEFAULT 3,
  IsActive BIT NOT NULL DEFAULT 1
);

CREATE INDEX IX_DownloadLinks_Token ON DownloadLinks(Token);
CREATE INDEX IX_DownloadLinks_ReportId ON DownloadLinks(ReportId);
4. NotificationQueue
Generic queue for SMS/Email/WhatsApp notifications.

sql
Copy code
NotificationQueue (
  QueueId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  Type VARCHAR(50) NOT NULL,  -- 'SMS', 'EMAIL', 'WHATSAPP'
  TargetId UNIQUEIDENTIFIER NOT NULL,  -- usually DeliveryLogs.LogId or ReportId
  Recipient VARCHAR(200) NOT NULL,  -- phone or email
  Content NVARCHAR(MAX) NOT NULL,  -- message body or JSON payload
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Sent', 'Failed'
  RetryCount INT NOT NULL DEFAULT 0,
  MaxRetries INT NOT NULL DEFAULT 3,
  NextRetryAt DATETIMEOFFSET NULL,
  SentAt DATETIMEOFFSET NULL,
  ErrorMessage NVARCHAR(MAX) NULL,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_NotificationQueue_Status ON NotificationQueue(Status);
CREATE INDEX IX_NotificationQueue_NextRetryAt ON NotificationQueue(NextRetryAt);
In code, use enums for methods/statuses, but store as strings in the DB for readability.

PHONE NUMBER RULE
All authentication for secure download uses patient's registered 10-digit mobile number.

Rules:

Phone numbers are stored and validated as exact 10-digit Indian mobile numbers without country code:

Example valid: "9876543210"

No +91, no spaces, no leading 0, no dashes.

When accepting phone from public API:

Reject anything that is not exactly 10 digits.

Compare exact string with the phone in patient record.

No DOB checks.
No OTP checks.

BACKEND SERVICES
Create an IDeliveryService that implements all core delivery logic.
Controllers must be thin and call this service.

csharp
Copy code
public interface IDeliveryService
{
    Task<List<DeliveryQueueItemDto>> GetDeliveryQueueAsync(string? department, string? status);
    Task<DeliveryResultDto> DeliverViaPrintAsync(Guid reportId, Guid userId);
    Task<DeliveryResultWithLinkDto> DeliverViaWhatsAppAsync(Guid reportId, string phone, Guid userId);
    Task<DeliveryResultWithLinkDto> DeliverViaSmsAsync(Guid reportId, string phone, Guid userId);
    Task<DeliveryResultDto> DeliverViaEmailAsync(Guid reportId, string email, Guid userId);
    Task<SecureLinkDto> GenerateSecureLinkAsync(Guid reportId, Guid userId);
    Task<Stream> VerifyAndDownloadAsync(string token, string phone);
    Task<DeliveryResultDto> MarkHandedOverAsync(Guid reportId, Guid userId);
    Task<List<DeliveryAttemptDto>> GetAttemptsAsync(Guid reportId);
    Task<DeliveryResultDto> ResendAsync(Guid reportId, string method, Guid userId);
}
Define DTOs such as:

DeliveryQueueItemDto

DeliveryResultDto

DeliveryResultWithLinkDto

SecureLinkDto

DeliveryAttemptDto

GetDeliveryQueue(department, status)
Query Reports where:

Status = 'Signed' (or equivalent signed/completed status)

AND:

Either no DeliveryLogs exist, OR

latest DeliveryLog is not 'Delivered' and not 'HandedOver'.

Filter by department if provided (e.g. pathology, radiology).
Use existing department fields from your domain model.

Return, for each report:

ReportId

TokenNumber (or visit number / accession number)

PatientName

Age, Gender

PatientPhone, PatientEmail

Tests (list or comma-separated)

SignedAt

CriticalCount

PdfUrl (from existing reports system)

Sort:

Critical reports first

Then by signed date (oldest first).

DeliverViaPrint(reportId, userId)
Load report + patient details.

Get PDF URL for this report (already generated by your report system).

Call IPrintService.QueuePrintAsync(reportId, pdfUrl) (interface; implementation can be a stub that just logs).

Create DeliveryLog:

Method = 'Print'

Status = 'Delivered' (or 'Pending' if you want to model printer ack; for now treat queued as delivered).

DeliveredBy = userId

DeliveredAt = now (UTC).

Optionally update report's delivery status to 'Delivered'.

Write an audit log entry using your existing audit pattern.

Return DeliveryResultDto { LogId, Status }.

DeliverViaWhatsApp(reportId, phone, userId)
Validate phone is exactly 10 digits; otherwise return validation error.

Call GenerateSecureLink(reportId, userId) → { token, link, expiresAt, maxDownloads }.

Load report + patient:

Use PatientName, list of Tests.

Build message text, for example:

pgsql
Copy code
Dear {PatientName}, your lab report for {Tests} is ready.
Download your report here: {Link}
This link is valid for 24 hours.
- {LabName}
Create DeliveryLog:

Method = 'WhatsApp'

RecipientPhone = phone

Status = 'Pending'

DeliveredBy = userId

Create NotificationQueue entry:

Type = 'WHATSAPP'

TargetId = DeliveryLog.LogId

Recipient = phone (10-digit number)

Content = message text

Status = 'Pending'

Do NOT call Twilio directly here. Actual sending will be handled by the background worker via IWhatsAppSender.

Return DeliveryResultWithLinkDto:

LogId

Link

Status = "Queued"

DeliverViaSms(reportId, phone, userId)
Same pattern as WhatsApp:

Validate phone = 10 digits.

Call GenerateSecureLink for link.

Build short SMS-style text (NO OTP):

arduino
Copy code
Lab report ready. Download: {Link}
Valid for 24h. - {LabName}
Create DeliveryLog with Method 'SMS'.

Create NotificationQueue entry with Type 'SMS'.

Return { logId, link, status: 'Queued' }.

DeliverViaEmail(reportId, email, userId)
Load report, patient, PDF URL.

Build email payload (subject + HTML body):

Subject: "Your Lab Report - {PatientName}"

Body: simple HTML message.

Attachment: PDF file or link in the body.

Create DeliveryLog:

Method = 'Email'

RecipientEmail = email

Status = 'Pending'

Create NotificationQueue entry:

Type = 'EMAIL'

TargetId = DeliveryLog.LogId

Recipient = email

Content = JSON serialization of email payload (subject, body, attachment path/url).

Status = 'Pending'

Return { logId, status: 'Queued' }.

GenerateSecureLink(reportId, userId)
Create a DownloadLinks record:

Token = GUID string

ReportId = reportId

CreatedBy = userId

CreatedAt = now (UTC)

ExpiresAt = now + 24 hours

MaxDownloads = 3

DownloadCount = 0

IsActive = 1

Construct URL:

https://lab.com/reports/download/{token}

(Use a configuration setting for base URL.)

Return DTO:

csharp
Copy code
public sealed record SecureLinkDto(
    string Token,
    string Link,
    DateTimeOffset ExpiresAt,
    int MaxDownloads
);
VerifyAndDownload(token, phone)
This is the core authentication logic for secure download.

Steps:

Validate phone input:

Must be exactly 10 digits (0–9).

If not, throw a validation error → 400 Bad Request.

Look up DownloadLinks by Token.

Validate link:

Record exists.

IsActive = 1.

ExpiresAt > now.

DownloadCount < MaxDownloads.

Load the associated Report and its Patient.

Fetch the patient’s registered phone from your patient table:

Assume it is stored as a 10-digit number with no country code.

Compare strings:

If phone != patient.Phone → authentication fails:

Throw a domain exception that maps to HTTP 401 Unauthorized with error "InvalidPhoneOrLink".

If valid:

Increment DownloadCount.

Set DownloadedAt if null.

Fetch the report’s PDF as a Stream.

Return the Stream to the controller.

No OTP, no DOB, only phone match.

MarkHandedOver(reportId, userId)
Used when the patient physically collects the printed report.

Create a DeliveryLog:

Method = 'HandedOver'

Status = 'HandedOver'

DeliveredBy = userId

DeliveredAt = now

Optionally update report delivery status to 'Delivered'.

Audit log the event.

Return { logId, status: 'HandedOver' }.

Delivery Attempts & Resend
GetAttempts(reportId)
Join DeliveryLogs and DeliveryAttempts for this reportId.

Include:

Method

RecipientPhone / RecipientEmail

Attempt number

SentAt

Status

ErrorMessage

RetryCount (from queue).

Return as DeliveryAttemptDto list.

Resend(reportId, method)
Find the latest DeliveryLog for given reportId and method.

Create a new NotificationQueue entry for re-sending:

Copy Recipient.

Rebuild the message content from domain state (or reuse Content).

Set Status = 'Pending'.

Optionally create a new DeliveryAttempt row.

Return { logId, status: 'Queued' }.

BACKGROUND WORKER – NotificationWorkerService
Implement a background worker that periodically processes NotificationQueue.

Use BackgroundService or IHostedService.

Runs approximately every 2 minutes.

ProcessNotificationQueue():

Query NotificationQueue where:

Status = 'Pending'

AND (NextRetryAt IS NULL OR NextRetryAt <= now)

For each item:

Switch on Type:

'SMS' → send via ISmsSender

'EMAIL' → send via IEmailSender

'WHATSAPP' → send via IWhatsAppSender

Call the respective interface, passing Recipient and Content.

On success:

Status = 'Sent'

SentAt = now

Create or update related DeliveryAttempts for this attempt → mark 'Sent'.

On failure:

RetryCount++

If RetryCount > MaxRetries:

Status = 'Failed'

Set ErrorMessage

Update DeliveryAttempts to 'Failed'.

Else:

Keep Status = 'Pending'

Set NextRetryAt using exponential backoff:

Retry 1 → now + 1 minute

Retry 2 → now + 5 minutes

Retry 3 → now + 15 minutes

EXTERNAL INTEGRATIONS (ABSTRACTIONS ONLY)
Define interfaces for external providers.
Concrete implementations can be simple stubs that just log to console for now.

csharp
Copy code
public interface IWhatsAppSender
{
    Task<NotificationSendResult> SendAsync(string toPhone10Digits, string message);
}

public interface ISmsSender
{
    Task<NotificationSendResult> SendAsync(string toPhone10Digits, string message);
}

public interface IEmailSender
{
    Task<NotificationSendResult> SendAsync(string toEmail, EmailPayload payload);
}

public interface IPrintService
{
    Task QueuePrintAsync(Guid reportId, string pdfUrl);
}

public sealed record NotificationSendResult(
    bool Success,
    string? ProviderMessageId,
    string? ErrorMessage,
    string? RawResponseJson
);

public sealed record EmailPayload(
    string Subject,
    string HtmlBody,
    string? AttachmentPath
);
No hardcoded Twilio/MailKit in controllers.
Controllers talk to IDeliveryService; service talks to these interfaces.

CONTROLLERS (API SURFACE)
DeliveryController (Authenticated)
Base route: /api/v1/delivery

GET /api/v1/delivery/queue?dept={dept}&status={status}

Calls GetDeliveryQueueAsync(dept, status).

Response:

json
Copy code
{
  "reports": [
    {
      "reportId": "uuid",
      "tokenNumber": "MBF-2025-0001",
      "patientName": "Ramesh Sharma",
      "age": 45,
      "gender": "Male",
      "patientPhone": "9876543210",
      "patientEmail": "ramesh@example.com",
      "tests": ["CBC", "FBS"],
      "signedAt": "2025-01-01T10:00:00Z",
      "criticalCount": 1,
      "pdfUrl": "https://lab.com/reports/pdf/xyz"
    }
  ]
}
POST /api/v1/delivery/print

Request body:

json
Copy code
{ "reportId": "uuid" }
Uses authenticated userId from token.

Response 200:

json
Copy code
{ "logId": "uuid", "status": "Delivered" }
POST /api/v1/delivery/whatsapp

Request:

json
Copy code
{ "reportId": "uuid", "phone": "9876543210" }
phone must be a 10-digit string.

Response:

json
Copy code
{
  "logId": "uuid",
  "link": "https://lab.com/reports/download/{token}",
  "status": "Queued"
}
POST /api/v1/delivery/sms

Request:

json
Copy code
{ "reportId": "uuid", "phone": "9876543210" }
Response:

json
Copy code
{
  "logId": "uuid",
  "link": "https://lab.com/reports/download/{token}",
  "status": "Queued"
}
POST /api/v1/delivery/email

Request:

json
Copy code
{ "reportId": "uuid", "email": "user@example.com" }
Response:

json
Copy code
{ "logId": "uuid", "status": "Queued" }
POST /api/v1/delivery/handed-over

Request:

json
Copy code
{ "reportId": "uuid" }
Response:

json
Copy code
{ "logId": "uuid", "status": "HandedOver" }
GET /api/v1/delivery/reports/{reportId}/attempts

Response:

json
Copy code
{
  "attempts": [
    {
      "method": "WhatsApp",
      "recipient": "9876543210",
      "attempt": 1,
      "sentAt": "2025-01-01T10:05:00Z",
      "status": "Sent",
      "errorMessage": null,
      "retryCount": 0
    }
  ]
}
POST /api/v1/delivery/reports/{reportId}/resend?method={method}

Response:

json
Copy code
{ "logId": "uuid", "status": "Queued" }
SecureDownloadController (Public – No Auth)
Base route: /api/v1/public/reports

GET /api/v1/public/reports/verify/{token}

Checks only:

Token exists

Link not expired

Downloads remaining

Does NOT require phone.

Returns patient name in full (no masking).

Response:

json
Copy code
{
  "valid": true,
  "patientName": "Ramesh Sharma",
  "tests": ["CBC", "FBS"],
  "expiresAt": "2025-01-02T10:00:00Z",
  "downloadsRemaining": 2
}
GET /api/v1/public/reports/download/{token}?phone={phone}

phone is required and must be a 10-digit string.

Calls VerifyAndDownloadAsync(token, phone).

On success:

Returns PDF stream:

Content-Type: application/pdf

Content-Disposition: attachment; filename="Report-{PatientName}.pdf"

On failure (invalid token, expired, exceeded downloads, phone mismatch):

HTTP 401:

json
Copy code
{ "error": "InvalidPhoneOrLink" }
TEST DATA (SEEDING)
Seed at least:

5 reports with Status = 'Signed', mix of:

Departments (Pathology, Radiology, etc.)

Critical and non-critical

Each report linked to a patient:

With valid 10-digit mobile number

With email

1 report already delivered with:

DeliveryLogs

DeliveryAttempts (some successful, some failed)

ACCEPTANCE CRITERIA
Backend is considered DONE for Day 14 when:

✅ Database tables exist:

DeliveryLogs

DeliveryAttempts

DownloadLinks (NO OTP column)

NotificationQueue

✅ GET /api/v1/delivery/queue returns signed reports correctly, filtered and sorted.

✅ POST /api/v1/delivery/print:

Creates DeliveryLog

Queues print

Updates report delivery status.

✅ POST /api/v1/delivery/whatsapp / /sms / /email:

Create DeliveryLogs with status 'Pending'

Create NotificationQueue entries

Do NOT talk directly to Twilio/MailKit.

✅ GenerateSecureLink:

Creates DownloadLinks row with:

Token

ExpiresAt = now + 24h

MaxDownloads = 3

Returns link URL.

✅ GET /api/v1/public/reports/verify/{token}:

Shows if link is valid

Returns full patientName, tests, expiry, downloadsRemaining.

✅ GET /api/v1/public/reports/download/{token}?phone=9876543210:

With correct 10-digit phone:

Returns PDF stream.

With wrong phone / expired / exhausted:

Returns HTTP 401 with InvalidPhoneOrLink.

✅ Download limit enforced:

After 3 downloads → further attempts return 401.

✅ Expiry enforced:

After ExpiresAt → 401 for any download attempts.

✅ Notification worker:

Picks up Pending queue items

Sends via ISmsSender / IEmailSender / IWhatsAppSender

Retries with exponential backoff (1m, 5m, 15m)

Marks Failed after MaxRetries.

✅ GET /api/v1/delivery/reports/{reportId}/attempts returns correct history.

✅ POST /api/v1/delivery/reports/{reportId}/resend re-queues notifications.