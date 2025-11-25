DAY 11: CRITICAL VALUES + ESCALATION (BACKEND ONLY)

Milestone 3.2: Full Day

You are a .NET 8 expert building a diagnostic lab system.

Your task for today:

Implement critical value detection,

SMS / WhatsApp / Email notifications,

Escalation + acknowledgment workflow,

Background job for pending alerts,

No frontend / UI work.

DATABASE – New Tables

Create these tables in SQL (or via EF Core migrations):

1. CriticalRules
CREATE TABLE CriticalRules (
  RuleId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ParameterCode VARCHAR(50) NOT NULL UNIQUE,
  CriticalLow DECIMAL(18,4) NULL,
  CriticalHigh DECIMAL(18,4) NULL,
  EscalationMinutes INT NOT NULL DEFAULT 30,
  RequireAcknowledgment BIT NOT NULL DEFAULT 1,
  NotificationChannels VARCHAR(200) NOT NULL DEFAULT 'SMS,EMAIL',  -- CSV: SMS,EMAIL,WHATSAPP,PHONE
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
);


Seed data:

INSERT INTO CriticalRules (RuleId, ParameterCode, CriticalLow, CriticalHigh, EscalationMinutes, NotificationChannels)
VALUES 
  (NEWID(), 'WBC', 2.0, 30.0, 30, 'SMS,WHATSAPP,PHONE'),
  (NEWID(), 'HEMOGLOBIN', 5.0, 20.0, 30, 'SMS,WHATSAPP'),
  (NEWID(), 'GLUCOSE', 40.0, 500.0, 15, 'SMS,EMAIL,PHONE'),
  (NEWID(), 'POTASSIUM', 2.5, 6.5, 15, 'SMS,WHATSAPP,PHONE'),
  (NEWID(), 'SODIUM', 120.0, 160.0, 30, 'SMS,EMAIL');

2. CriticalAlerts
CREATE TABLE CriticalAlerts (
  AlertId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ResultId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Results(ResultId),
  ParameterCode VARCHAR(50) NOT NULL,
  ParameterName VARCHAR(200) NOT NULL,
  Value DECIMAL(18,4) NOT NULL,
  CriticalThreshold VARCHAR(50) NOT NULL,  -- 'CriticalLow', 'CriticalHigh'
  PatientId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Patients(PatientId),
  VisitId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Visits(VisitId),
  ReferrerId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Referrers(ReferrerId),
  TriggeredAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  NotifiedTo VARCHAR(500) NOT NULL,  -- Phone numbers / emails
  NotifiedAt DATETIMEOFFSET NULL,
  AcknowledgedBy UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Users(UserId),
  AcknowledgedAt DATETIMEOFFSET NULL,
  AckMethod VARCHAR(50) NULL,  -- 'PHONE', 'SMS_REPLY', 'WHATSAPP', 'IN_APP'
  AckNotes NVARCHAR(MAX) NULL,
  EscalatedAt DATETIMEOFFSET NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Notified', 'Acknowledged', 'Escalated'
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_CriticalAlerts_ResultId ON CriticalAlerts(ResultId);
CREATE INDEX IX_CriticalAlerts_Status ON CriticalAlerts(Status);
CREATE INDEX IX_CriticalAlerts_PatientId ON CriticalAlerts(PatientId);

3. CriticalContacts
CREATE TABLE CriticalContacts (
  ContactId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ReferrerId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Referrers(ReferrerId),
  ContactName VARCHAR(200) NOT NULL,
  Phone VARCHAR(20) NULL,
  Email VARCHAR(200) NULL,
  Priority INT NOT NULL DEFAULT 1,  -- 1=Primary, 2=Secondary, 3=Escalation
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
);

4. CriticalAudit
CREATE TABLE CriticalAudit (
  AuditId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  AlertId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES CriticalAlerts(AlertId),
  Action VARCHAR(100) NOT NULL,  -- 'NotificationSent', 'Acknowledged', 'Escalated', 'ReminderSent'
  ActedBy UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Users(UserId),
  ActedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  Details NVARCHAR(MAX) NULL
);

BACKEND – .NET 8 (Application Layer)
CriticalValueService

Method: CheckCriticalValue(resultId, parameterCode, value)

Load CriticalRules for the parameter (if no rule → no critical check).

If rule exists and is active:

If value < CriticalLow OR value > CriticalHigh:

Create a CriticalAlert row:

Fill ResultId, Parameter info, Patient, Visit, Referrer, Status = Pending.

Set CriticalThreshold = CriticalLow or CriticalHigh depending on side.

Mark the result as critical in your existing results domain:

e.g. add "CRITICAL" to ResultFlags / status.

Call NotifyReferrer(alertId) (Notification workflow).

Return an AlertDto with key details.

Else:

Return null.

Method: NotifyReferrer(alertId)

Load alert + related entities:

Patient, Visit, Referrer, token, MRN, parameter, value, units, thresholds.

Load CriticalContacts for the referrer, ordered by Priority.

Read NotificationChannels from CriticalRules.NotificationChannels (CSV).

For each channel:

SMS: NotificationService.SendSMS(phone, message)

Message:

"CRITICAL: {PatientName} ({MRN}) - {ParamName}: {Value} {Unit} (Critical: {Threshold}). Contact lab ASAP. Token: {Token}"

WhatsApp: NotificationService.SendWhatsApp(phone, message)

Email: NotificationService.SendEmail(to, subject, htmlBody)

Subject: "CRITICAL LAB RESULT - {PatientName}"

HTML body with patient, parameter, value, threshold, lab contact, timestamps.

Phone: queue a “call required” entry or log in CriticalAudit as “PhoneCallQueued”.

Update CriticalAlerts:

NotifiedTo = list of phones/emails used,

NotifiedAt = now,

Status = Notified.

Insert CriticalAudit record: Action = 'NotificationSent'.

Do not block here for escalation; escalation is handled by background job based on EscalationMinutes.

Method: AcknowledgeAlert(alertId, userId, method, notes)

Find alert; if not found or already acknowledged/escalated → handle accordingly.

Update:

AcknowledgedBy = userId

AcknowledgedAt = now

AckMethod = method (PHONE, SMS_REPLY, WHATSAPP, IN_APP)

AckNotes = notes

Status = 'Acknowledged'

Insert CriticalAudit with:

Action = 'Acknowledged', ActedBy = userId, Details = notes.

Unblock report delivery for that result/order if you had a “critical block” in place.

Method: EscalateAlert(alertId)

Load alert.

Determine escalation contacts:

From CriticalContacts where Priority = 3 for same referrer / lab director.

Send notifications (same channel logic as NotifyReferrer).

Update:

EscalatedAt = now

Status = 'Escalated'

Insert CriticalAudit with Action = 'Escalated'.

Method: CheckPendingAlerts() – Background job

To be triggered by Hangfire every 5 minutes.

Query:

Status = 'Notified' AND

TriggeredAt < (NOW - EscalationMinutes) based on the rule for that parameter.

For each such alert:

Call EscalateAlert(alertId).

NotificationService

Method: SendSMS(phone, message)

Integrate with Twilio / TextLocal (no mocks).

Call vendor API using HTTP client.

Log success/failure (e.g. NotificationLog table or CriticalAudit.Details).

At least basic retry (3 attempts) or record failure reason.

Method: SendWhatsApp(phone, message)

Use Twilio WhatsApp API:

whatsapp:{phone} format for “to” number.

Log status.

Method: SendEmail(to, subject, body)

Use SMTP (Gmail / Outlook / SendGrid) via a library like MailKit.

HTML body supported.

Log success/failure.

Configuration:

appsettings.json:

Twilio:AccountSid, Twilio:AuthToken, Twilio:FromPhone

Smtp:Host, Port, User, Password, FromAddress, FromName

API – CriticalValueController

Base route: /api/v1/critical-alerts

1. GET /api/v1/critical-alerts?status=pending&limit=50

Returns a paged list of alerts filtered by status.

Response:

{
  "data": [
    {
      "alertId": "uuid",
      "patientName": "string",
      "mrn": "string",
      "parameterCode": "HEMOGLOBIN",
      "parameterName": "Hemoglobin",
      "value": 4.2,
      "unit": "g/dL",
      "criticalThreshold": "CriticalLow",
      "triggeredAt": "2025-11-23T10:15:00Z",
      "status": "Notified",
      "referrerName": "Dr. X"
    }
  ]
}


2. GET /api/v1/critical-alerts/{id}

Returns full alert details including audit trail:

{
  "alert": {
    "alertId": "uuid",
    "resultId": "uuid",
    "parameterCode": "HEMOGLOBIN",
    "parameterName": "Hemoglobin",
    "value": 4.2,
    "unit": "g/dL",
    "criticalThreshold": "CriticalLow",
    "patient": { "id": "uuid", "name": "Ramesh Sharma", "mrn": "A00001" },
    "visit": { "id": "uuid", "token": "P-042" },
    "referrer": { "id": "uuid", "name": "Dr. Anand Sharma" },
    "triggeredAt": "2025-11-23T10:15:00Z",
    "notifiedAt": "2025-11-23T10:16:00Z",
    "acknowledgedAt": null,
    "status": "Notified"
  },
  "audit": [
    {
      "actedAt": "2025-11-23T10:16:00Z",
      "action": "NotificationSent",
      "details": "SMS + WhatsApp + Email sent to 9876543210, anand@hospital.com"
    }
  ]
}


3. POST /api/v1/critical-alerts/{id}/acknowledge

Request:

{
  "method": "PHONE",          // PHONE | SMS_REPLY | WHATSAPP | IN_APP
  "notes": "Spoke with Dr. Sharma at 14:35. Patient advised to visit ER."
}


Behavior:

Calls CriticalValueService.AcknowledgeAlert(...).

Response 200:

{
  "alertId": "uuid",
  "acknowledgedAt": "2025-11-23T10:35:10Z",
  "acknowledgedBy": "user-uuid",
  "status": "Acknowledged"
}


4. POST /api/v1/critical-alerts/{id}/escalate

Manually forces escalation (e.g. supervisor triggers).

Calls EscalateAlert(alertId).

Response 200:

{
  "alertId": "uuid",
  "escalatedAt": "2025-11-23T10:50:00Z",
  "status": "Escalated"
}


5. GET /api/v1/critical-alerts/pending-acknowledgment

For dashboards to show outstanding alerts (but still backend only).

Query: statuses in ('Pending','Notified').

Response:

{
  "alerts": [ ... same summary model as list endpoint ... ]
}

BACKGROUND JOB (Hangfire)

Job name: CheckPendingCriticalAlerts.

Schedule: every 5 minutes.

Logic:

var alerts = CriticalAlerts
  .Where(Status == 'Notified')
  .Where(NOW - TriggeredAt > EscalationMinutes for that parameter);

foreach (alert in alerts)
{
  CriticalValueService.EscalateAlert(alert.AlertId);
}

TEST DATA (for manual API testing)

Create 3 critical results in your DB:

Hemoglobin 4.2 g/dL (CriticalLow < 5.0)

Glucose 550 mg/dL (CriticalHigh > 500)

Potassium 7.2 mmol/L (CriticalHigh > 6.5)

Create referrer contacts:

CriticalContacts:

Contact 1:

Referrer: Dr. Anand Sharma

Phone: 9876543210

Email: anand@hospital.com

Priority: 1

Contact 2 (Escalation):

Lab Director

Phone: 9123456789

Priority: 3

ACCEPTANCE CRITERIA (BACKEND VIEW)

✅ Saving a result that crosses a critical threshold creates a CriticalAlert row.

✅ CheckCriticalValue sets a “CRITICAL” flag on the result.

✅ NotifyReferrer sends SMS / WhatsApp / Email via real integrations and updates CriticalAlerts.Status to Notified.

✅ AcknowledgeAlert updates status to Acknowledged and writes a CriticalAudit row.

✅ CheckPendingAlerts escalates alerts after EscalationMinutes and updates status to Escalated.

✅ Escalation notifications go to Priority = 3 contacts.

✅ All actions (notification, acknowledgement, escalation) are logged in CriticalAudit.

✅ Report delivery is blocked until the alert is Acknowledged (implement the block in your existing report-delivery logic).