# SynOS - DETAILED GEMINI PROMPTS: DAYS 10-17
## Lab Tech → Pathologist → Reports → Delivery → Finance → Admin → Inventory

**Based on:** Complete design documents + database schema + API specs  
**Status:** ✅ PRODUCTION-READY PROMPTS - NO MOCKS  
**Updated:** November 23, 2025, 12:35 PM IST

---

# TABLE OF CONTENTS

- [Day 10: Lab Results + Delta Checks + Autosave](#day-10-lab-results--delta-checks--autosave)
- [Day 11: Critical Values + Escalation](#day-11-critical-values--escalation)
- [Day 12: Pathologist Review + Signing](#day-12-pathologist-review--signing)
- [Day 13: Report Templates + PDF Generation](#day-13-report-templates--pdf-generation)
- [Day 14: Delivery Desk + Multi-Channel](#day-14-delivery-desk--multi-channel)
- [Day 15: Finance + Commission + Insurance](#day-15-finance--commission--insurance)
- [Day 16: Admin Panel + Test Master](#day-16-admin-panel--test-master)
- [Day 17: Inventory + Audit Trail](#day-17-inventory--audit-trail)

---

# DAY 10: LAB RESULTS + DELTA CHECKS + AUTOSAVE

**Milestone 3.1: Full Day**

**Gemini Prompt:**
```
You are a .NET 8 + React expert building a diagnostic lab system.

TASK: Build complete lab results entry with delta checks and autosave (NO MOCKS).

DATABASE (Create these tables):

1. Results:
(
  ResultId UUID PRIMARY KEY DEFAULT NEWID(),
  OrderId UUID NOT NULL FOREIGN KEY REFERENCES Orders(OrderId),
  ParameterCode VARCHAR(50) NOT NULL,
  ParameterName VARCHAR(200) NOT NULL,
  Value DECIMAL(18,4) NULL,
  TextValue NVARCHAR(MAX) NULL,
  Unit VARCHAR(50) NOT NULL,
  RefLow DECIMAL(18,4) NULL,
  RefHigh DECIMAL(18,4) NULL,
  CriticalLow DECIMAL(18,4) NULL,
  CriticalHigh DECIMAL(18,4) NULL,
  Flag VARCHAR(10) NULL,  -- '', 'H', 'L', 'HH', 'LL', 'DELTA'
  EnteredBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  EnteredAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  VerifiedBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  VerifiedAt DATETIMEOFFSET NULL,
  SignedBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  SignedAt DATETIMEOFFSET NULL,
  SupersededBy UUID NULL FOREIGN KEY REFERENCES Results(ResultId),
  Status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  TechComments NVARCHAR(MAX) NULL,
  RowVersion INT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_Results_OrderId ON Results(OrderId)
CREATE INDEX IX_Results_ParameterCode ON Results(ParameterCode)
CREATE INDEX IX_Results_Status ON Results(Status)

2. ResultFlags:
(
  FlagId UUID PRIMARY KEY DEFAULT NEWID(),
  ResultId UUID NOT NULL FOREIGN KEY REFERENCES Results(ResultId),
  FlagType VARCHAR(50) NOT NULL,  -- 'DELTA', 'CRITICAL', 'HEMOLYSIS', 'INSUFFICIENT'
  Description NVARCHAR(500) NOT NULL,
  ReviewedBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  ReviewedAt DATETIMEOFFSET NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_ResultFlags_ResultId ON ResultFlags(ResultId)
CREATE INDEX IX_ResultFlags_Status ON ResultFlags(Status)

3. DeltaCheckConfigs:
(
  ConfigId UUID PRIMARY KEY DEFAULT NEWID(),
  ParameterCode VARCHAR(50) NOT NULL UNIQUE,
  ThresholdPercent INT NOT NULL DEFAULT 30,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

4. DeltaCheckEvents:
(
  EventId UUID PRIMARY KEY DEFAULT NEWID(),
  ResultId UUID NOT NULL FOREIGN KEY REFERENCES Results(ResultId),
  PreviousResultId UUID NOT NULL FOREIGN KEY REFERENCES Results(ResultId),
  PreviousValue DECIMAL(18,4) NOT NULL,
  CurrentValue DECIMAL(18,4) NOT NULL,
  DeltaPercent DECIMAL(10,2) NOT NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  ReviewedBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  ReviewedAt DATETIMEOFFSET NULL,
  ReviewNotes NVARCHAR(MAX) NULL,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_DeltaCheckEvents_ResultId ON DeltaCheckEvents(ResultId)
CREATE INDEX IX_DeltaCheckEvents_Status ON DeltaCheckEvents(Status)

5. AutosaveBuffers:
(
  BufferId UUID PRIMARY KEY DEFAULT NEWID(),
  UserId UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  EntityType VARCHAR(50) NOT NULL,  -- 'Result', 'Report', etc.
  EntityId UUID NOT NULL,
  DraftJson NVARCHAR(MAX) NOT NULL,
  SavedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_AutosaveBuffers_UserId_EntityType ON AutosaveBuffers(UserId, EntityType)
CREATE INDEX IX_AutosaveBuffers_SavedAt ON AutosaveBuffers(SavedAt)

6. ResultLinks:
(
  LinkId UUID PRIMARY KEY DEFAULT NEWID(),
  FromResultId UUID NOT NULL FOREIGN KEY REFERENCES Results(ResultId),
  ToResultId UUID NOT NULL FOREIGN KEY REFERENCES Results(ResultId),
  Relation VARCHAR(50) NOT NULL,  -- 'RetestOf', 'Replaces', 'SupersededBy'
  LinkedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

BACKEND (.NET 8):

ResultService:
- Method: GetResultsForOrder(orderId)
  * Query all results for given order
  * Include parameter definitions (test master)
  * Include reference ranges (age/sex-specific)
  * Return structured DTO with metadata
  
- Method: EnterResult(orderId, parameterCode, value, techComments)
  * Validate value is numeric (for numeric params)
  * Apply reference range comparison
  * Auto-flag: H (high), L (low), HH (critical high), LL (critical low)
  * Check delta (call CheckDelta)
  * Save to Results table
  * Autosave draft
  * Return result with flag
  
- Method: CheckDelta(parameterId, patientId, currentValue)
  * Find previous result (same param, same patient, signed status)
  * Calculate % change: ((current - previous) / previous) * 100
  * Load threshold from DeltaCheckConfigs (default 30%)
  * If |deltaPercent| > threshold:
    - Create DeltaCheckEvent
    - Add 'DELTA' flag to ResultFlags
    - Return warning to UI
  * Show prior 3 results in UI for comparison
  
- Method: AutosaveResults(userId, orderId, resultsJson)
  * Upsert AutosaveBuffers (userId + entityId)
  * Store complete form state as JSON
  * Triggered every 30 seconds from frontend
  
- Method: RecoverAutosave(userId, orderId)
  * Query AutosaveBuffers
  * Return latest draft JSON
  * Allow resume from crash/reload
  
- Method: SubmitForVerification(orderId, results[])
  * Validate all required params entered
  * Mark status = 'AwaitingVerification'
  * Update order status = 'ResultsEntered'
  * Clear autosave buffer
  * Audit log action
  
- Method: GetPriorResults(patientId, parameterCode, limit=3)
  * Query last 3 signed results
  * Order by SignedAt DESC
  * Return for delta comparison UI

ResultController:
- GET /api/v1/results/orders/{orderId}
  * Get all results for order
  * Include flags, delta events
  * Include prior results for each param
  
- POST /api/v1/results
  Request: { orderId, parameterCode, value, techComments }
  Response (201): { resultId, flag, deltaWarning }
  
- POST /api/v1/results/autosave
  Request: { userId, orderId, resultsJson }
  Response (200): { bufferId, savedAt }
  
- GET /api/v1/results/recover?userId={userId}&orderId={orderId}
  Response (200): { draftJson, savedAt }
  
- POST /api/v1/results/orders/{orderId}/submit
  Request: { results[] }
  Response (200): { orderId, status: 'AwaitingVerification' }
  
- GET /api/v1/results/patient/{patientId}/history?paramCode={code}&limit=3
  Response (200): { results: [...] }

FRONTEND (React + Vite):

1. LabResultEntryPage:
   - Route: /lab/results/entry/:orderId
   - Load order details (patient, tests, samples)
   - Load test parameters from test master
   - Load reference ranges (age/sex-specific)
   - For each parameter:
     * Input field (numeric or text)
     * Unit display (non-editable)
     * Reference range display (e.g., "4.5 - 11.0")
     * Flag indicator (H/L/HH/LL badge)
     * Prior results (last 3 values with dates)
     * Delta warning icon (if triggered)
   - Tech comments textarea (per result or global)
   - Autosave: every 30 seconds (useEffect interval)
   - Submit button: "Submit for Verification"
   
2. ResultInput Component:
   - Props: { parameter, value, onChange, refLow, refHigh, criticalLow, criticalHigh, priorResults }
   - Input: numeric field with validation
   - On change:
     * Auto-calculate flag (H/L/HH/LL)
     * Show color-coded badge
     * Trigger delta check (debounced 500ms)
   - Show prior results in tooltip/popover
   - Show delta warning modal if triggered
   
3. DeltaWarningModal:
   - Title: "Delta Check Alert"
   - Message: "Hemoglobin changed by +45% since last result (10 days ago)"
   - Display:
     * Previous value: 12.5 g/dL (2025-11-12)
     * Current value: 18.1 g/dL (today)
     * Delta: +45%
   - Actions:
     * "Confirm Correct" button (accept delta, continue)
     * "Retest Sample" button (flag for retest)
     * "Review with Supervisor" button (escalate)
   
4. AutosaveIndicator Component:
   - Position: top-right corner
   - Status: "Saving..." → "Saved at 14:35:22"
   - Green checkmark when saved
   - Retry on failure
   
5. RecoveryModal (on page load):
   - Check for autosave buffer
   - If exists:
     * Show: "Unsaved draft found (saved 5 minutes ago)"
     * Actions:
       - "Restore Draft" (load saved values)
       - "Start Fresh" (discard draft)
   - If user clicks Restore → populate all fields from JSON

KEYBOARD SHORTCUTS:
- Tab / Shift+Tab: Navigate between parameter inputs
- Enter: Move to next input (instead of submit)
- Ctrl+S: Manual save (trigger autosave immediately)
- Ctrl+Enter: Submit for verification
- Esc: Cancel / go back

TEST DATA:
- Create 5 orders with samples collected:
  * CBC (10 parameters: WBC, RBC, Hemoglobin, Hematocrit, etc.)
  * FBS (1 parameter: Glucose)
  * Lipid Profile (4 parameters: Cholesterol, HDL, LDL, Triglycerides)
  * LFT (6 parameters: Bilirubin, ALT, AST, ALP, GGT, Total Protein)
  * Urine Routine (15 parameters)
  
- Create prior results for 3 patients (for delta checks)
- Create delta config for Hemoglobin (threshold 30%)
- Example delta scenario:
  * Patient A: Previous Hemoglobin 12.5 → Current 18.1 (+45% delta)

VALIDATION RULES:
- Value required for numeric parameters
- Value must be numeric (no text in numeric fields)
- Flag auto-calculated based on reference ranges:
  * value < refLow: flag = 'L'
  * value > refHigh: flag = 'H'
  * value < criticalLow: flag = 'LL'
  * value > criticalHigh: flag = 'HH'
- Delta check: compare to last signed result (not draft)
- Submit blocked if any required parameter missing

ERROR HANDLING:
- API error during save: show toast, retry autosave
- Delta check timeout: show warning, allow continue
- Network failure: queue autosave, retry when online
- Validation errors: highlight field, show message

TESTS (Acceptance Criteria):
✅ Load order with 10 parameters → all inputs visible
✅ Enter result → auto-flag H/L/HH/LL based on ranges
✅ Enter result with +45% delta → warning modal shows
✅ Prior results (last 3) display in tooltip
✅ Autosave fires every 30 seconds → buffer saved
✅ Reload page → recovery modal shows draft
✅ Restore draft → all values populated correctly
✅ Submit for verification → status = 'AwaitingVerification'
✅ Delta check shows previous value, current value, % change
✅ Critical flag (HH/LL) shows red badge

OUTPUT:
- Lab tech can enter results for all parameters
- Delta checks trigger automatically
- Autosave prevents data loss
- Prior results visible for comparison
- Flags color-coded and accurate
- Submit workflow works end-to-end
```

**What Gets Built:** Result entry UI, delta checks, autosave, recovery, flagging logic

**Timeline:** 1 full day

**Accept Criteria:**
- ✅ Result entry for all parameters works
- ✅ Delta checks trigger on >30% change
- ✅ Autosave fires every 30 seconds
- ✅ Recovery modal restores draft
- ✅ Flags auto-calculate (H/L/HH/LL)
- ✅ Submit for verification completes

---

# DAY 11: CRITICAL VALUES + ESCALATION

**Milestone 3.2: Full Day**

**Gemini Prompt:**
```
You are a .NET 8 + React expert building a diagnostic lab system.

TASK: Build critical value handling with SMS/WhatsApp escalation (NO MOCKS).

DATABASE (Create these tables):

1. CriticalRules:
(
  RuleId UUID PRIMARY KEY DEFAULT NEWID(),
  ParameterCode VARCHAR(50) NOT NULL UNIQUE,
  CriticalLow DECIMAL(18,4) NULL,
  CriticalHigh DECIMAL(18,4) NULL,
  EscalationMinutes INT NOT NULL DEFAULT 30,
  RequireAcknowledgment BIT NOT NULL DEFAULT 1,
  NotificationChannels VARCHAR(200) NOT NULL DEFAULT 'SMS,EMAIL',  -- CSV: SMS,EMAIL,WHATSAPP,PHONE
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

INSERT INTO CriticalRules (RuleId, ParameterCode, CriticalLow, CriticalHigh, EscalationMinutes, NotificationChannels)
VALUES 
  (NEWID(), 'WBC', 2.0, 30.0, 30, 'SMS,WHATSAPP,PHONE'),
  (NEWID(), 'HEMOGLOBIN', 5.0, 20.0, 30, 'SMS,WHATSAPP'),
  (NEWID(), 'GLUCOSE', 40.0, 500.0, 15, 'SMS,EMAIL,PHONE'),
  (NEWID(), 'POTASSIUM', 2.5, 6.5, 15, 'SMS,WHATSAPP,PHONE'),
  (NEWID(), 'SODIUM', 120.0, 160.0, 30, 'SMS,EMAIL')

2. CriticalAlerts:
(
  AlertId UUID PRIMARY KEY DEFAULT NEWID(),
  ResultId UUID NOT NULL FOREIGN KEY REFERENCES Results(ResultId),
  ParameterCode VARCHAR(50) NOT NULL,
  ParameterName VARCHAR(200) NOT NULL,
  Value DECIMAL(18,4) NOT NULL,
  CriticalThreshold VARCHAR(50) NOT NULL,  -- 'CriticalLow', 'CriticalHigh'
  PatientId UUID NOT NULL FOREIGN KEY REFERENCES Patients(PatientId),
  VisitId UUID NOT NULL FOREIGN KEY REFERENCES Visits(VisitId),
  ReferrerId UUID NULL FOREIGN KEY REFERENCES Referrers(ReferrerId),
  TriggeredAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  NotifiedTo VARCHAR(500) NOT NULL,  -- Phone numbers / emails
  NotifiedAt DATETIMEOFFSET NULL,
  AcknowledgedBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  AcknowledgedAt DATETIMEOFFSET NULL,
  AckMethod VARCHAR(50) NULL,  -- 'PHONE', 'SMS_REPLY', 'WHATSAPP', 'IN_APP'
  AckNotes NVARCHAR(MAX) NULL,
  EscalatedAt DATETIMEOFFSET NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Notified', 'Acknowledged', 'Escalated'
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_CriticalAlerts_ResultId ON CriticalAlerts(ResultId)
CREATE INDEX IX_CriticalAlerts_Status ON CriticalAlerts(Status)
CREATE INDEX IX_CriticalAlerts_PatientId ON CriticalAlerts(PatientId)

3. CriticalContacts:
(
  ContactId UUID PRIMARY KEY DEFAULT NEWID(),
  ReferrerId UUID NULL FOREIGN KEY REFERENCES Referrers(ReferrerId),
  ContactName VARCHAR(200) NOT NULL,
  Phone VARCHAR(20) NULL,
  Email VARCHAR(200) NULL,
  Priority INT NOT NULL DEFAULT 1,  -- 1=Primary, 2=Secondary, 3=Escalation
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

4. CriticalAudit:
(
  AuditId UUID PRIMARY KEY DEFAULT NEWID(),
  AlertId UUID NOT NULL FOREIGN KEY REFERENCES CriticalAlerts(AlertId),
  Action VARCHAR(100) NOT NULL,  -- 'NotificationSent', 'Acknowledged', 'Escalated', 'ReminderSent'
  ActedBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  ActedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  Details NVARCHAR(MAX) NULL
)

BACKEND (.NET 8):

CriticalValueService:
- Method: CheckCriticalValue(resultId, parameterCode, value)
  * Load CriticalRules for parameter
  * Check if value < criticalLow OR value > criticalHigh
  * If critical:
    - Create CriticalAlert
    - Trigger notification workflow (call NotificationService)
    - Add 'CRITICAL' flag to ResultFlags
    - Return alert DTO
  * If not critical: return null
  
- Method: NotifyReferrer(alertId)
  * Load alert + patient + visit + referrer
  * Load CriticalContacts for referrer (priority order)
  * For each channel in NotificationChannels:
    - SMS: Send via Twilio/TextLocal
      Message: "CRITICAL: {PatientName} ({MRN}) - {ParamName}: {Value} {Unit} (Critical: {Threshold}). Contact lab ASAP. Token: {Token}"
    - WhatsApp: Send via Twilio API
      Message: Same as SMS with lab contact number
    - Email: Send via SMTP
      Subject: "CRITICAL LAB RESULT - {PatientName}"
      Body: HTML email with result details + contact info
    - Phone: Queue call reminder (manual or auto-dialer)
  * Mark NotifiedAt = now, Status = 'Notified'
  * Start escalation timer (30 minutes default)
  
- Method: AcknowledgeAlert(alertId, userId, method, notes)
  * Update CriticalAlert:
    - AcknowledgedBy = userId
    - AcknowledgedAt = now
    - AckMethod = method (PHONE/SMS_REPLY/WHATSAPP/IN_APP)
    - AckNotes = notes
    - Status = 'Acknowledged'
  * Create CriticalAudit entry
  * Allow report delivery (critical block removed)
  
- Method: EscalateAlert(alertId)
  * Load alert
  * Load escalation contacts (priority = 3)
  * Send notifications to escalation contacts
  * Mark EscalatedAt = now, Status = 'Escalated'
  * Create CriticalAudit entry
  
- Method: CheckPendingAlerts() (Background Job - Hangfire)
  * Query CriticalAlerts WHERE Status = 'Notified' AND TriggeredAt < (NOW - EscalationMinutes)
  * For each alert: call EscalateAlert
  * Runs every 5 minutes

NotificationService:
- Method: SendSMS(phone, message)
  * Integrate Twilio API
  * POST to Twilio endpoint
  * Log success/failure
  * Retry on failure (3 attempts)
  
- Method: SendWhatsApp(phone, message)
  * Integrate Twilio WhatsApp API
  * Send template message
  * Log delivery status
  
- Method: SendEmail(to, subject, body)
  * Use SMTP (Gmail/Outlook/SendGrid)
  * HTML email template
  * Log delivery

CriticalValueController:
- GET /api/v1/critical-alerts?status=pending&limit=50
  Response: { data: [{ alertId, patient, parameter, value, triggeredAt, status }] }
  
- GET /api/v1/critical-alerts/{id}
  Response: { alert details, notification history, audit trail }
  
- POST /api/v1/critical-alerts/{id}/acknowledge
  Request: { method, notes }
  Response (200): { alertId, acknowledgedAt, acknowledgedBy }
  
- POST /api/v1/critical-alerts/{id}/escalate
  Response (200): { alertId, escalatedAt }
  
- GET /api/v1/critical-alerts/pending-acknowledgment
  Response: { alerts: [...] } (for lab dashboard)

FRONTEND (React + Vite):

1. CriticalAlertModal (appears immediately on result entry):
   - Triggered by: result entry if value is critical
   - Title: "⚠️ CRITICAL VALUE DETECTED"
   - Display:
     * Parameter: Hemoglobin
     * Value: 4.2 g/dL (Critical Low: <5.0)
     * Patient: Ramesh Sharma (A00001)
     * Token: P-042
   - Message: "This value requires immediate referrer notification. Notification will be sent automatically."
   - Actions:
     * "Acknowledge & Notify" button (green)
     * "Cancel Entry" button (if mistake)
   - Auto-trigger notification on Acknowledge
   
2. CriticalAlertDashboard (Lab Supervisor screen):
   - Route: /lab/critical-alerts
   - List all critical alerts (pending, acknowledged, escalated)
   - Columns:
     * Time | Patient | Parameter | Value | Status | Acknowledged By | Actions
   - Status badges:
     * Pending: Orange
     * Notified: Blue
     * Acknowledged: Green
     * Escalated: Red
   - Actions per row:
     * "View Details" button
     * "Acknowledge" button (if pending)
     * "Escalate Now" button (if >30 min unacked)
   - Real-time updates via SignalR
   
3. CriticalAlertDetailModal:
   - Show full alert details
   - Notification history:
     * SMS sent to 9876543210 at 14:25:35 (Delivered)
     * WhatsApp sent to 9876543210 at 14:25:40 (Read)
     * Email sent to doctor@hospital.com at 14:25:45 (Sent)
   - Acknowledge form:
     * Method dropdown: Phone Call / SMS Reply / WhatsApp / In-App
     * Notes textarea: "Spoke with Dr. Sharma at 14:35. Patient advised to visit ER."
     * Acknowledge button
   - Audit trail:
     * Alert created at 14:25:30
     * SMS sent at 14:25:35
     * Acknowledged at 14:35:10 by Lab Supervisor
   
4. CriticalAlertBanner (Top of screen):
   - Persistent banner if any critical alerts pending
   - Shows count: "3 Critical Alerts Pending Acknowledgment"
   - Click → navigate to CriticalAlertDashboard
   - Blinks red if >30 minutes old (escalation due)

BACKGROUND JOBS (Hangfire):
- Job: CheckPendingCriticalAlerts
  * Runs every 5 minutes
  * Query alerts WHERE Status = 'Notified' AND (NOW - TriggeredAt) > EscalationMinutes
  * For each: escalate (send to escalation contacts)
  * Update status = 'Escalated'

INTEGRATION:
- Twilio API for SMS/WhatsApp:
  * Account SID in appsettings
  * Auth Token in appsettings
  * From phone number: +1234567890
  * SMS: POST to /Messages endpoint
  * WhatsApp: POST to /Messages endpoint with whatsapp: prefix
  
- SMTP for Email:
  * Gmail/Outlook/SendGrid
  * SMTP host, port, username, password in appsettings
  * Use MailKit library

TEST DATA:
- Create 3 critical results:
  * Hemoglobin 4.2 g/dL (Critical Low <5.0)
  * Glucose 550 mg/dL (Critical High >500)
  * Potassium 7.2 mmol/L (Critical High >6.5)
  
- Create referrer contacts:
  * Dr. Anand Sharma, Phone: 9876543210, Email: anand@hospital.com, Priority: 1
  * Escalation Contact: Lab Director, Phone: 9123456789, Priority: 3

TESTS (Acceptance Criteria):
✅ Enter critical result → alert modal appears
✅ Acknowledge alert → SMS/WhatsApp/Email sent
✅ SMS message contains patient name, param, value, threshold
✅ Alert shows in dashboard with status 'Notified'
✅ Acknowledge alert → status = 'Acknowledged'
✅ Alert unacknowledged for >30 min → auto-escalate
✅ Escalation sends to priority=3 contacts
✅ Audit trail logs all actions
✅ Report delivery blocked until acknowledged
✅ Critical alert banner shows pending count

OUTPUT:
- Critical values trigger immediate notifications
- Referrers receive SMS/WhatsApp/Email
- Escalation happens automatically after timeout
- Acknowledgment workflow complete
- Audit trail for compliance
```

**What Gets Built:** Critical value detection, SMS/WhatsApp/Email notifications, escalation, acknowledgment workflow

**Timeline:** 1 full day

**Accept Criteria:**
- ✅ Critical values trigger alerts
- ✅ SMS/WhatsApp sent automatically
- ✅ Escalation happens after 30 min
- ✅ Acknowledgment workflow works
- ✅ Audit trail complete

---

# DAY 12: PATHOLOGIST REVIEW + SIGNING

**Milestone 3.3: Full Day**

**Gemini Prompt:**
```
You are a .NET 8 + React expert building a diagnostic lab system.

TASK: Build pathologist review queue, digital signing, and report versioning (NO MOCKS).

DATABASE (Create these tables):

1. Reports:
(
  ReportId UUID PRIMARY KEY DEFAULT NEWID(),
  VisitId UUID NOT NULL UNIQUE FOREIGN KEY REFERENCES Visits(VisitId),
  Dept VARCHAR(50) NOT NULL,  -- 'Pathology', 'Radiology'
  Status VARCHAR(50) NOT NULL DEFAULT 'Draft',  -- 'Draft', 'ReadyToSign', 'Signed', 'Delivered', 'Superseded'
  CurrentVersion INT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_Reports_VisitId ON Reports(VisitId)
CREATE INDEX IX_Reports_Status ON Reports(Status)

2. ReportVersions:
(
  VersionId UUID PRIMARY KEY DEFAULT NEWID(),
  ReportId UUID NOT NULL FOREIGN KEY REFERENCES Reports(ReportId),
  Version INT NOT NULL,
  ReportType VARCHAR(50) NOT NULL,  -- 'Original', 'Addendum', 'Correction'
  Content NVARCHAR(MAX) NOT NULL,  -- JSON structure
  PathologistComments NVARCHAR(MAX) NULL,
  Interpretation NVARCHAR(MAX) NULL,
  Recommendations NVARCHAR(MAX) NULL,
  IssuedBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  IssuedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  SignedBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  SignedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  DigitalSignature NVARCHAR(MAX) NOT NULL,  -- Base64 encoded signature
  PdfUrl VARCHAR(500) NULL,
  Reason NVARCHAR(500) NULL,  -- For addendums/corrections
  CONSTRAINT UQ_ReportVersions_ReportVersion UNIQUE (ReportId, Version)
)

CREATE INDEX IX_ReportVersions_ReportId ON ReportVersions(ReportId)
CREATE INDEX IX_ReportVersions_SignedBy ON ReportVersions(SignedBy)

3. ReportAddenda:
(
  AddendumId UUID PRIMARY KEY DEFAULT NEWID(),
  ReportId UUID NOT NULL FOREIGN KEY REFERENCES Reports(ReportId),
  FromVersion INT NOT NULL,
  ToVersion INT NOT NULL,
  Reason NVARCHAR(MAX) NOT NULL,
  AddendumText NVARCHAR(MAX) NOT NULL,
  CreatedBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

4. ReportDelegations:
(
  DelegationId UUID PRIMARY KEY DEFAULT NEWID(),
  FromDoctorId UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  ToDoctorId UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  ValidFrom DATE NOT NULL,
  ValidTo DATE NOT NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Active',  -- 'Active', 'Expired'
  Reason NVARCHAR(500) NULL,  -- 'On Leave', 'Vacation', 'Sick'
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_ReportDelegations_FromDoctorId ON ReportDelegations(FromDoctorId)
CREATE INDEX IX_ReportDelegations_ValidFrom_ValidTo ON ReportDelegations(ValidFrom, ValidTo)

5. PdfJobs:
(
  JobId UUID PRIMARY KEY DEFAULT NEWID(),
  ReportId UUID NOT NULL FOREIGN KEY REFERENCES Reports(ReportId),
  Version INT NOT NULL,
  Kind VARCHAR(50) NOT NULL,  -- 'Original', 'Addendum'
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Processing', 'Complete', 'Failed'
  RetryCount INT NOT NULL DEFAULT 0,
  ErrorMessage NVARCHAR(MAX) NULL,
  PdfUrl VARCHAR(500) NULL,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_PdfJobs_ReportId ON PdfJobs(ReportId)
CREATE INDEX IX_PdfJobs_Status ON PdfJobs(Status)

BACKEND (.NET 8):

ReportService:
- Method: GetReviewQueue(pathologistId)
  * Query all results WHERE Status = 'AwaitingVerification'
  * Group by Visit
  * Filter by pathologist's department
  * Return list of visits with results ready for review
  * Include patient info, test details, critical alerts
  * Sort by: CRITICAL first, then by TAT (oldest first)
  
- Method: GetReportForReview(visitId)
  * Load visit + patient + all results
  * Load prior reports (for comparison)
  * Load critical alerts (if any)
  * Load delta flags
  * Return structured DTO with all data
  
- Method: SignReport(reportId, pathologistId, comments, interpretation, recommendations)
  * Validate all results verified
  * Validate no pending critical alerts (or acknowledged)
  * Create Report (if not exists)
  * Create ReportVersion:
    - Version = 1
    - ReportType = 'Original'
    - Content = JSON with all results
    - PathologistComments, Interpretation, Recommendations
    - SignedBy = pathologistId
    - SignedAt = now
    - DigitalSignature = Generate signature (hash of content + timestamp + doctor ID)
  * Update Report status = 'Signed'
  * Queue PDF generation (insert PdfJob)
  * Update results: SignedBy = pathologistId, SignedAt = now
  * Audit log action
  
- Method: CreateAddendum(reportId, reason, addendumText, pathologistId)
  * Load latest version
  * Create new ReportVersion:
    - Version = currentVersion + 1
    - ReportType = 'Addendum'
    - Content = copy of previous + addendum
    - Reason = reason
  * Create ReportAddendum entry
  * Update Report: CurrentVersion++, Status = 'Signed' (if was delivered)
  * Queue PDF generation for new version
  * Audit log action
  
- Method: GenerateDigitalSignature(content, doctorId, timestamp)
  * Combine: content JSON + doctorId + timestamp
  * Hash using SHA256
  * Encode to Base64
  * Return signature string
  * Used for tamper detection and authentication
  
- Method: ValidateSignature(reportVersionId)
  * Load report version
  * Regenerate signature from content + doctorId + timestamp
  * Compare with stored signature
  * Return true if match, false if tampered

PathologistController:
- GET /api/v1/pathologist/review-queue
  Response: { visits: [{ visitId, patient, token, tests, criticalCount, tat }] }
  
- GET /api/v1/pathologist/reports/{visitId}/review
  Response: { visit, patient, results, priorReports, criticalAlerts, deltaFlags }
  
- POST /api/v1/pathologist/reports/sign
  Request: { visitId, comments, interpretation, recommendations, signature }
  Response (200): { reportId, version: 1, signedAt, pdfJobId }
  
- POST /api/v1/pathologist/reports/{reportId}/addendum
  Request: { reason, addendumText, signature }
  Response (200): { reportId, version, addendumId }
  
- GET /api/v1/pathologist/reports/{reportId}/versions
  Response: { versions: [{ version, type, signedBy, signedAt, pdfUrl }] }

PdfGenerationService:
- Method: GeneratePdf(reportId, version)
  * Load ReportVersion
  * Load visit + patient + results
  * Use QuestPDF library
  * Generate PDF with:
    - Lab header (logo, name, address)
    - Patient info (name, age, sex, MRN)
    - Test details (test name, parameters, values, ranges, flags)
    - Pathologist comments, interpretation, recommendations
    - Digital signature block (doctor name, signature, timestamp)
    - QR code (for verification: encodes reportId + version + signature hash)
    - Footer (page numbers, lab contact)
  * Save PDF to file storage (Azure Blob / local disk)
  * Update PdfJob: Status = 'Complete', PdfUrl = path
  * Update ReportVersion: PdfUrl = path
  * Return PDF URL

FRONTEND (React + Vite):

1. PathologistReviewQueue:
   - Route: /pathologist/review-queue
   - List all visits awaiting signature
   - Columns:
     * Token | Patient | Tests | Critical Alerts | TAT | Actions
   - Color-coded rows:
     * Red: Has critical alerts
     * Orange: TAT >80% elapsed
     * Green: Normal
   - Sort: Critical first, then oldest TAT
   - Actions:
     * "Review & Sign" button → navigate to review page
   
2. ReportReviewPage:
   - Route: /pathologist/review/:visitId
   - Display patient info (name, age, sex, MRN, token)
   - Display all results in table:
     * Parameter | Value | Unit | Ref Range | Flag | Prior Results
   - Show critical alerts (if any) at top (red banner)
   - Show delta flags (orange banner)
   - Prior reports section (collapsible):
     * Show last 3 reports for same tests
     * Allow compare side-by-side
   - Pathologist comments textarea:
     * "Any observations, abnormalities, or notes"
   - Interpretation textarea:
     * "Clinical interpretation of results"
   - Recommendations textarea:
     * "Recommended follow-up or actions"
   - Digital signature section:
     * "I certify that I have reviewed all results and they are accurate."
     * Password input (for re-authentication)
     * Sign button (green, prominent)
   
3. SignatureConfirmationModal:
   - Triggered by: Sign button
   - Title: "Confirm Digital Signature"
   - Display:
     * Patient: Ramesh Sharma (A00001)
     * Tests: CBC, FBS, Lipid Profile
     * Critical Alerts: None
     * Comments: [preview]
     * Interpretation: [preview]
   - Re-authentication:
     * "Enter your password to confirm signature"
     * Password input
     * Authenticate button
   - Actions:
     * "Cancel" button
     * "Sign & Finalize" button (disabled until password entered)
   
4. AddendumModal:
   - Triggered by: "Add Addendum" button (on delivered reports)
   - Title: "Add Addendum to Report"
   - Reason dropdown:
     * Additional findings noted
     * Correction required
     * Additional test results available
     * Clarification requested
   - Addendum text textarea:
     * "Describe the addendum or correction"
   - Version info:
     * "This will create Version 2 (Addendum)"
   - Actions:
     * "Cancel" button
     * "Create Addendum" button
   
5. ReportVersionHistory:
   - Show all versions of a report
   - Display:
     * Version | Type | Signed By | Signed At | PDF | Actions
   - Actions per version:
     * "Download PDF" button
     * "View Details" button
   - Highlight current version (green)

KEYBOARD SHORTCUTS:
- Ctrl+Enter: Sign report (opens confirmation modal)
- Ctrl+A: Add addendum
- Ctrl+P: Preview PDF
- Tab: Navigate between comment fields
- Esc: Close modals

INTEGRATION:
- QuestPDF for PDF generation:
  * Install-Package QuestPDF
  * Create PdfReportGenerator service
  * Generate PDF with structured layout
  * Include QR code (use QRCoder library)
  
- File Storage:
  * Save PDFs to: /storage/reports/{reportId}_{version}.pdf
  * URL: https://lab.com/reports/{reportId}_{version}.pdf
  * Secure with auth token

TEST DATA:
- Create 5 visits with results entered (status = 'AwaitingVerification')
- Create 1 visit with critical alert (Hemoglobin 4.2)
- Create 1 visit with delta flag (Hemoglobin +45%)
- Create prior reports for 2 patients

TESTS (Acceptance Criteria):
✅ Review queue shows visits awaiting signature
✅ Critical alerts show at top (red banner)
✅ Delta flags show (orange banner)
✅ Prior reports load and display
✅ Sign report → ReportVersion created (version 1)
✅ Digital signature generated (SHA256 hash)
✅ PDF generation queued (PdfJob created)
✅ Re-authentication required (password input)
✅ Addendum creates version 2
✅ Version history shows all versions
✅ QR code encodes report verification data

OUTPUT:
- Pathologist can review all results
- Digital signing workflow complete
- PDF generation triggered automatically
- Addendum workflow works
- Version history tracked
- All actions audited
```

**What Gets Built:** Review queue, digital signing, PDF generation, addendum workflow, version control

**Timeline:** 1 full day

**Accept Criteria:**
- ✅ Review queue displays pending reports
- ✅ Digital signature generated
- ✅ PDF generation queued
- ✅ Addendum creates version 2
- ✅ Version history visible

---

# DAY 13: REPORT TEMPLATES + PDF GENERATION

**Milestone 3.4: Full Day**

**Gemini Prompt:**
```
You are a .NET 8 + React expert building a diagnostic lab system.

TASK: Build report template designer and QuestPDF rendering engine (NO MOCKS).

DATABASE (Create this table):

1. ReportTemplates:
(
  TemplateId UUID PRIMARY KEY DEFAULT NEWID(),
  Modality VARCHAR(50) NOT NULL,  -- 'Pathology', 'Radiology'
  Name VARCHAR(200) NOT NULL UNIQUE,
  Description NVARCHAR(500) NULL,
  TemplateJson NVARCHAR(MAX) NOT NULL,  -- JSON DSL
  IsPublished BIT NOT NULL DEFAULT 0,
  IsDefault BIT NOT NULL DEFAULT 0,
  CreatedBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_ReportTemplates_Modality ON ReportTemplates(Modality)
CREATE INDEX IX_ReportTemplates_IsPublished ON ReportTemplates(IsPublished)

BACKEND (.NET 8):

ReportTemplateService:
- Method: CreateTemplate(name, modality, templateJson, userId)
  * Validate JSON structure
  * Insert ReportTemplates
  * Audit log action
  
- Method: GetTemplates(modality, isPublished)
  * Query templates
  * Filter by modality and published status
  * Return list
  
- Method: PublishTemplate(templateId)
  * Update IsPublished = true
  * Audit log action
  
- Method: SetDefaultTemplate(templateId, modality)
  * Update all templates for modality: IsDefault = false
  * Update target template: IsDefault = true
  * Audit log action
  
- Method: RenderPdf(reportId, templateId)
  * Load report data (visit, patient, results)
  * Load template JSON
  * Parse template sections
  * Generate PDF using QuestPDF
  * Return PDF stream

QuestPDFRenderer:
- Method: GeneratePdf(data, template)
  * Parse template JSON
  * Create QuestPDF Document
  * For each section in template:
    - Header: Render lab logo, name, address
    - PatientInfo: Render patient details (name, age, sex, MRN, token)
    - ParameterTable: Render results table (parameter, value, unit, range, flag)
    - Comments: Render pathologist comments
    - Interpretation: Render interpretation text
    - Recommendations: Render recommendations
    - SignatureBlock: Render doctor name, signature, date
    - Footer: Render page numbers, lab contact
  * Apply conditional formatting:
    - Flag H: red bold
    - Flag L: blue
    - Flag HH/LL: red bold + background
  * Generate QR code (encodes reportId + version + signature hash)
  * Return PDF document

Template JSON DSL:
```json
{
  "meta": {
    "name": "Pathology_Standard_1Column",
    "modality": "Pathology",
    "layout": "oneColumn",
    "pageSize": "A4",
    "orientation": "Portrait"
  },
  "sections": [
    {
      "type": "Header",
      "content": {
        "logoUrl": "https://lab.com/logo.png",
        "labName": "ABC Diagnostic Lab",
        "address": "123 Main St, Mumbai, India",
        "phone": "+91 22 1234 5678",
        "email": "info@abclab.com"
      },
      "fontSize": 16,
      "bold": true,
      "alignment": "Center"
    },
    {
      "type": "PatientInfo",
      "fields": ["Name", "Age", "Sex", "MRN", "Token", "Date"],
      "layout": "TwoColumn"
    },
    {
      "type": "ParameterTable",
      "columns": ["TestName", "ParameterName", "Value", "Unit", "RefRange", "Flag"],
      "conditionalFormatting": {
        "flagH": { "color": "Red", "bold": true },
        "flagL": { "color": "Blue", "bold": false },
        "flagHH": { "color": "Red", "bold": true, "background": "LightRed" },
        "flagLL": { "color": "Red", "bold": true, "background": "LightRed" }
      },
      "showTestGroupHeaders": true,
      "groupBy": "TestName"
    },
    {
      "type": "Comments",
      "label": "Pathologist Comments:",
      "fontSize": 12,
      "italic": true
    },
    {
      "type": "Interpretation",
      "label": "Clinical Interpretation:",
      "fontSize": 12
    },
    {
      "type": "Recommendations",
      "label": "Recommendations:",
      "fontSize": 12
    },
    {
      "type": "SignatureBlock",
      "doctorNameField": true,
      "signatureImageField": true,
      "dateTimeField": true,
      "alignment": "Right"
    },
    {
      "type": "QRCode",
      "data": "{reportId}_{version}_{signatureHash}",
      "size": 100,
      "position": "BottomRight"
    },
    {
      "type": "Footer",
      "content": "Page [PAGE] of [TOTAL_PAGES] | ABC Lab | +91 22 1234 5678 | info@abclab.com",
      "fontSize": 10,
      "alignment": "Center"
    }
  ]
}
```

ReportTemplateController:
- POST /api/v1/reports/templates
  Request: { name, modality, templateJson }
  Response (201): { templateId, name, createdAt }
  
- GET /api/v1/reports/templates?modality={modality}&published={true/false}
  Response: { templates: [...] }
  
- PUT /api/v1/reports/templates/{id}
  Request: { templateJson }
  Response (200): { templateId, updatedAt }
  
- POST /api/v1/reports/templates/{id}/publish
  Response (200): { templateId, isPublished: true }
  
- POST /api/v1/reports/templates/{id}/set-default
  Response (200): { templateId, isDefault: true }
  
- GET /api/v1/reports/templates/{id}/preview?visitId={visitId}
  Response: PDF stream (preview with sample data)
  
- POST /api/v1/reports/render
  Request: { reportId, templateId }
  Response: PDF stream

FRONTEND (React + Vite):

1. ReportTemplateDesigner:
   - Route: /admin/report-templates/designer
   - Left panel: Template section list (drag-drop reorder)
   - Center panel: Live preview (updates as you edit)
   - Right panel: Section properties editor
   - Sections available:
     * Header (logo, lab info)
     * Patient Info (fields selector)
     * Parameter Table (columns, conditional formatting)
     * Comments (label, font, style)
     * Interpretation (label, font, style)
     * Recommendations (label, font, style)
     * Signature Block (fields, alignment)
     * QR Code (size, position)
     * Footer (content, font, alignment)
   - Add section button (dropdown list)
   - Remove section button (trash icon)
   - Reorder sections (drag handles)
   - Save button (saves templateJson)
   - Preview button (renders PDF with sample data)
   
2. TemplateListPage:
   - Route: /admin/report-templates
   - List all templates
   - Columns:
     * Name | Modality | Published | Default | Created | Actions
   - Actions per row:
     * "Edit" button → open designer
     * "Publish" button (if unpublished)
     * "Set as Default" button
     * "Preview" button → download sample PDF
     * "Delete" button (soft delete)
   
3. TemplateSectionEditor (Right Panel):
   - Dynamic form based on section type
   - For Header:
     * Logo URL input
     * Lab Name input
     * Address textarea
     * Phone, Email inputs
     * Font size, alignment dropdowns
   - For PatientInfo:
     * Fields checklist (Name, Age, Sex, MRN, Token, Date)
     * Layout dropdown (OneColumn, TwoColumn)
   - For ParameterTable:
     * Columns checklist (TestName, ParameterName, Value, Unit, RefRange, Flag)
     * Conditional formatting editor:
       - Flag H: color picker, bold checkbox
       - Flag L: color picker, bold checkbox
       - Flag HH/LL: color picker, bold checkbox, background color
     * Show test group headers checkbox
     * Group by dropdown (TestName, Category)
   - For Comments/Interpretation/Recommendations:
     * Label input
     * Font size, italic checkboxes
   - For SignatureBlock:
     * Fields checklist (Doctor Name, Signature Image, Date/Time)
     * Alignment dropdown (Left, Center, Right)
   - For QRCode:
     * Size input (pixels)
     * Position dropdown (TopLeft, TopRight, BottomLeft, BottomRight)
   - For Footer:
     * Content input (supports [PAGE], [TOTAL_PAGES] placeholders)
     * Font size, alignment dropdowns

QUESETPDF INTEGRATION:
- Install-Package QuestPDF
- Create PdfGenerator class
- Implement sections:
  * Header: Image, TextBlock
  * PatientInfo: Table (2-column layout)
  * ParameterTable: Table (multi-column with conditional formatting)
  * Comments/Interpretation: TextBlock
  * SignatureBlock: Image + TextBlock (aligned)
  * QRCode: QRCodeGenerator library
  * Footer: PageNumber, TextBlock

TEST DATA:
- Create 3 templates:
  * Pathology_Standard_1Column (default)
  * Pathology_Detailed_2Column
  * Radiology_Standard
- Use sample visit data for preview

TESTS (Acceptance Criteria):
✅ Create template → saved to database
✅ Add sections → JSON updated
✅ Reorder sections → JSON section order changed
✅ Conditional formatting → flags color-coded in PDF
✅ Preview generates PDF with sample data
✅ Publish template → isPublished = true
✅ Set default → isDefault = true (others false)
✅ Render report with template → PDF generated

OUTPUT:
- Admin can design report templates visually
- Templates saved as JSON DSL
- QuestPDF renders PDFs from templates
- Conditional formatting works (flag colors)
- Preview shows live PDF
- Published templates available for use
```

**What Gets Built:** Template designer, JSON DSL, QuestPDF renderer, preview, publish workflow

**Timeline:** 1 full day

**Accept Criteria:**
- ✅ Template designer works (drag-drop sections)
- ✅ Preview generates PDF
- ✅ Conditional formatting applies
- ✅ Publish workflow works
- ✅ Default template set

---

# DAY 14: DELIVERY DESK + MULTI-CHANNEL

**Milestone 3.5: Full Day**

**Gemini Prompt:**
```
You are a .NET 8 + React expert building a diagnostic lab system.

TASK: Build delivery desk with print, WhatsApp, SMS, email, secure download link (NO MOCKS).

DATABASE (Create these tables):

1. DeliveryLogs:
(
  LogId UUID PRIMARY KEY DEFAULT NEWID(),
  ReportId UUID NOT NULL FOREIGN KEY REFERENCES Reports(ReportId),
  DeliveryMethod VARCHAR(50) NOT NULL,  -- 'Print', 'WhatsApp', 'SMS', 'Email', 'SecureLink'
  RecipientPhone VARCHAR(20) NULL,
  RecipientEmail VARCHAR(200) NULL,
  DeliveredBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  DeliveredAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  Status VARCHAR(50) NOT NULL DEFAULT 'Delivered',
  TrackingInfo NVARCHAR(MAX) NULL,  -- JSON with delivery details
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_DeliveryLogs_ReportId ON DeliveryLogs(ReportId)
CREATE INDEX IX_DeliveryLogs_DeliveredAt ON DeliveryLogs(DeliveredAt)

2. DeliveryAttempts:
(
  AttemptId UUID PRIMARY KEY DEFAULT NEWID(),
  LogId UUID NOT NULL FOREIGN KEY REFERENCES DeliveryLogs(LogId),
  Attempt INT NOT NULL DEFAULT 1,
  SentAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  Status VARCHAR(50) NOT NULL,  -- 'Pending', 'Sent', 'Delivered', 'Failed', 'Bounced'
  ErrorMessage NVARCHAR(MAX) NULL,
  ResponseData NVARCHAR(MAX) NULL  -- JSON with provider response
)

3. DownloadLinks:
(
  LinkId UUID PRIMARY KEY DEFAULT NEWID(),
  ReportId UUID NOT NULL FOREIGN KEY REFERENCES Reports(ReportId),
  Token VARCHAR(100) NOT NULL UNIQUE,  -- GUID-based token
  OTP VARCHAR(6) NOT NULL,  -- 6-digit OTP
  CreatedBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  ExpiresAt DATETIMEOFFSET NOT NULL,  -- 24 hours from creation
  DownloadedAt DATETIMEOFFSET NULL,
  DownloadCount INT NOT NULL DEFAULT 0,
  MaxDownloads INT NOT NULL DEFAULT 3,
  IsActive BIT NOT NULL DEFAULT 1
)

CREATE INDEX IX_DownloadLinks_Token ON DownloadLinks(Token)
CREATE INDEX IX_DownloadLinks_ReportId ON DownloadLinks(ReportId)

4. NotificationQueue:
(
  QueueId UUID PRIMARY KEY DEFAULT NEWID(),
  Type VARCHAR(50) NOT NULL,  -- 'SMS', 'EMAIL', 'WHATSAPP'
  TargetId UUID NOT NULL,  -- ReportId, AlertId, etc.
  Recipient VARCHAR(200) NOT NULL,  -- Phone or email
  Content NVARCHAR(MAX) NOT NULL,  -- Message body
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Sent', 'Failed'
  RetryCount INT NOT NULL DEFAULT 0,
  MaxRetries INT NOT NULL DEFAULT 3,
  NextRetryAt DATETIMEOFFSET NULL,
  SentAt DATETIMEOFFSET NULL,
  ErrorMessage NVARCHAR(MAX) NULL,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_NotificationQueue_Status ON NotificationQueue(Status)
CREATE INDEX IX_NotificationQueue_NextRetryAt ON NotificationQueue(NextRetryAt)

BACKEND (.NET 8):

DeliveryService:
- Method: GetDeliveryQueue(dept, status)
  * Query reports WHERE Status = 'Signed' AND (DeliveryLog is null OR Status != 'Delivered')
  * Filter by department
  * Return list of reports ready for delivery
  * Include patient info, test details, PDF URL
  * Sort by: CRITICAL first, then by signed date (oldest first)
  
- Method: DeliverViaPrint(reportId, userId)
  * Load report + patient
  * Get PDF URL
  * Queue print job (send to printer)
  * Create DeliveryLog (method = 'Print', status = 'Delivered')
  * Update report status = 'Delivered'
  * Audit log action
  
- Method: DeliverViaWhatsApp(reportId, phone, userId)
  * Generate secure download link (call GenerateSecureLink)
  * Load report + patient
  * Create message:
    "Dear {PatientName}, your lab report for {Tests} is ready. Download: {Link} (OTP: {OTP}). Valid for 24 hours. - ABC Lab"
  * Send via Twilio WhatsApp API
  * Create DeliveryLog (method = 'WhatsApp', recipient = phone)
  * Create NotificationQueue entry (for retry if fails)
  * Audit log action
  
- Method: DeliverViaSMS(reportId, phone, userId)
  * Generate secure download link
  * Create short message:
    "Lab report ready. Download: {ShortLink} OTP: {OTP}. Valid 24h. - ABC Lab"
  * Send via Twilio SMS API
  * Create DeliveryLog
  * Create NotificationQueue entry
  * Audit log action
  
- Method: DeliverViaEmail(reportId, email, userId)
  * Load report + patient
  * Get PDF URL
  * Create email:
    Subject: "Your Lab Report - {PatientName} ({Token})"
    Body: HTML email with attachment
    Attachment: PDF file
  * Send via SMTP
  * Create DeliveryLog
  * Create NotificationQueue entry
  * Audit log action
  
- Method: GenerateSecureLink(reportId, userId)
  * Create DownloadLinks:
    - Token = GUID
    - OTP = Random 6-digit number
    - ExpiresAt = now + 24 hours
    - MaxDownloads = 3
  * Generate URL: https://lab.com/reports/download/{token}
  * Return { link, otp }
  
- Method: VerifyAndDownload(token, otp)
  * Query DownloadLinks WHERE Token = token AND OTP = otp
  * Validate:
    - Link exists
    - Not expired (ExpiresAt > now)
    - DownloadCount < MaxDownloads
    - IsActive = true
  * If valid:
    - Increment DownloadCount
    - Update DownloadedAt (first download)
    - Return PDF stream
  * If invalid:
    - Return error (401 Unauthorized)
  
- Method: MarkHandedOver(reportId, userId)
  * Create DeliveryLog (method = 'Print', status = 'HandedOver')
  * Update report status = 'Delivered'
  * Audit log action

NotificationWorkerService (Background Job):
- Method: ProcessNotificationQueue()
  * Runs every 2 minutes
  * Query NotificationQueue WHERE Status = 'Pending' AND (NextRetryAt is null OR NextRetryAt <= now)
  * For each:
    - Send notification (SMS/Email/WhatsApp)
    - If success: Status = 'Sent', SentAt = now
    - If failure: RetryCount++, NextRetryAt = now + exponential backoff (1min, 5min, 15min)
    - If RetryCount > MaxRetries: Status = 'Failed', alert admin

DeliveryController:
- GET /api/v1/delivery/queue?dept={dept}&status={status}
  Response: { reports: [{ reportId, patient, tests, signedAt, criticalCount, pdfUrl }] }
  
- POST /api/v1/delivery/print
  Request: { reportId }
  Response (200): { logId, status: 'Delivered' }
  
- POST /api/v1/delivery/whatsapp
  Request: { reportId, phone }
  Response (200): { logId, link, otp, status: 'Sent' }
  
- POST /api/v1/delivery/sms
  Request: { reportId, phone }
  Response (200): { logId, link, otp, status: 'Sent' }
  
- POST /api/v1/delivery/email
  Request: { reportId, email }
  Response (200): { logId, status: 'Sent' }
  
- POST /api/v1/delivery/handed-over
  Request: { reportId }
  Response (200): { logId, status: 'HandedOver' }
  
- GET /api/v1/delivery/reports/{reportId}/attempts
  Response: { attempts: [{ attempt, sentAt, status, errorMessage }] }
  
- POST /api/v1/delivery/reports/{reportId}/resend?method={method}
  Response (200): { logId, status }

SecureDownloadController (Public - No Auth):
- GET /api/v1/public/reports/download/{token}?otp={otp}
  Validate token + OTP
  If valid: return PDF stream (Content-Type: application/pdf)
  If invalid: 401 Unauthorized
  
- GET /api/v1/public/reports/verify/{token}
  Check if link is valid (not expired, not exhausted)
  Response: { valid: true/false, expiresAt, downloadsRemaining }

FRONTEND (React + Vite):

1. DeliveryDeskPage:
   - Route: /delivery/queue
   - Filter bar:
     * Department dropdown (Pathology, Radiology, All)
     * Status dropdown (Ready, Delivered, All)
     * Date range picker
   - Reports table:
     * Token | Patient | Tests | Signed At | Critical | PDF | Delivery Actions
   - Delivery Actions (per row):
     * "Print" button → queue print job, mark delivered
     * "WhatsApp" button → open WhatsApp modal
     * "SMS" button → open SMS modal
     * "Email" button → open Email modal
     * "Handed Over" button → mark as picked up physically
   - Real-time status updates via SignalR
   
2. WhatsAppDeliveryModal:
   - Triggered by: WhatsApp button
   - Title: "Send Report via WhatsApp"
   - Patient phone display (pre-filled)
   - Edit phone (if needed)
   - Message preview:
     "Dear Ramesh Sharma, your lab report for CBC, FBS is ready. Download: https://lab.com/download/{token} (OTP: 123456). Valid for 24 hours."
   - Actions:
     * "Cancel" button
     * "Send WhatsApp" button (green)
   - On success:
     * Show toast: "WhatsApp sent successfully"
     * Update row status: "Delivered via WhatsApp"
   
3. SMSDeliveryModal:
   - Similar to WhatsApp
   - Shorter message (SMS character limit)
   - Short URL generated (bit.ly style)
   
4. EmailDeliveryModal:
   - Patient email display (pre-filled)
   - Edit email (if needed)
   - Subject preview
   - Body preview (HTML)
   - Attachment indicator (PDF file size)
   - Actions:
     * "Cancel" button
     * "Send Email" button (blue)
   
5. DeliveryHistoryModal:
   - Triggered by: "View History" button
   - Show all delivery attempts for report
   - Table:
     * Method | Recipient | Sent At | Status | Retry Count
   - Actions per attempt:
     * "Resend" button (if failed)
   
6. SecureDownloadPage (Public - No Auth):
   - Route: /reports/download/:token
   - OTP input (6 digits)
   - Verify button
   - If valid:
     * Show patient name, tests
     * Download button → PDF download
     * Show downloads remaining (e.g., "2 of 3 downloads remaining")
   - If invalid:
     * Show error: "Invalid or expired link"
     * Contact lab message

INTEGRATION:
- Twilio WhatsApp:
  * POST to /Messages endpoint
  * From: whatsapp:+14155238886 (Twilio sandbox)
  * To: whatsapp:+919876543210
  * Body: Message text
  
- Twilio SMS:
  * POST to /Messages endpoint
  * From: +1234567890 (Twilio phone number)
  * To: +919876543210
  * Body: Message text
  
- SMTP Email:
  * Use MailKit library
  * Gmail SMTP: smtp.gmail.com:587
  * Attachment: PDF file
  
- Printer:
  * Queue print job to network printer
  * Use PrintDocument class (.NET)
  * Or send PDF to print queue

TEST DATA:
- Create 5 signed reports (ready for delivery)
- Create patient phone numbers for WhatsApp/SMS testing
- Create patient emails for email testing
- Create 1 delivered report with history

TESTS (Acceptance Criteria):
✅ Delivery queue shows signed reports
✅ Print delivery → status = 'Delivered'
✅ WhatsApp delivery → link + OTP sent
✅ SMS delivery → short link + OTP sent
✅ Email delivery → PDF attachment sent
✅ Secure download → OTP validation works
✅ Download limit enforced (max 3 downloads)
✅ Link expires after 24 hours
✅ Delivery history shows all attempts
✅ Retry failed notifications (exponential backoff)

OUTPUT:
- Delivery desk shows all signed reports
- Multi-channel delivery works (print, WhatsApp, SMS, email)
- Secure download links with OTP validation
- Download limits and expiry enforced
- Retry logic for failed notifications
- Complete delivery history tracked
```

**What Gets Built:** Delivery queue, multi-channel delivery (print/WhatsApp/SMS/email/secure link), OTP validation, retry logic

**Timeline:** 1 full day

**Accept Criteria:**
- ✅ Delivery queue displays signed reports
- ✅ Print delivery works
- ✅ WhatsApp/SMS/Email delivery works
- ✅ Secure download with OTP validation
- ✅ Download limits enforced
- ✅ Retry logic for failures

---

# DAY 15: FINANCE + COMMISSION + INSURANCE

**Milestone 4.1: Full Day**

**Gemini Prompt:**
```
You are a .NET 8 + React expert building a diagnostic lab system.

TASK: Build complete finance module with referrer commission, insurance claims, discount approval (NO MOCKS).

DATABASE (Create these tables):

1. Referrers:
(
  ReferrerId UUID PRIMARY KEY DEFAULT NEWID(),
  ProviderName VARCHAR(200) NOT NULL,
  ProviderType VARCHAR(50) NOT NULL,  -- 'Doctor', 'Hospital', 'Clinic', 'Corporate'
  ContactPerson VARCHAR(200) NULL,
  Email VARCHAR(200) NULL,
  Phone VARCHAR(20) NULL,
  Address NVARCHAR(500) NULL,
  BankAccount VARCHAR(50) NULL,
  IFSC VARCHAR(20) NULL,
  PANCard VARCHAR(20) NULL,
  CommissionPercent DECIMAL(5,2) NULL DEFAULT 10.00,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_Referrers_ProviderName ON Referrers(ProviderName)

2. CommissionPolicies:
(
  PolicyId UUID PRIMARY KEY DEFAULT NEWID(),
  ReferrerId UUID NOT NULL FOREIGN KEY REFERENCES Referrers(ReferrerId),
  CommissionPercent DECIMAL(5,2) NOT NULL,
  EffectiveFrom DATE NOT NULL,
  EffectiveTo DATE NULL,
  ApplicableTests NVARCHAR(MAX) NULL,  -- CSV: 'CBC,FBS,LFT' or 'ALL'
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_CommissionPolicies_ReferrerId ON CommissionPolicies(ReferrerId)
CREATE INDEX IX_CommissionPolicies_EffectiveFrom ON CommissionPolicies(EffectiveFrom)

3. CommissionAccruals:
(
  AccrualId UUID PRIMARY KEY DEFAULT NEWID(),
  ReferrerId UUID NOT NULL FOREIGN KEY REFERENCES Referrers(ReferrerId),
  VisitId UUID NOT NULL FOREIGN KEY REFERENCES Visits(VisitId),
  InvoiceAmount DECIMAL(10,2) NOT NULL,
  CommissionPercent DECIMAL(5,2) NOT NULL,
  CommissionAmount DECIMAL(10,2) NOT NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Accrued',  -- 'Accrued', 'Paid'
  AccrualMonth DATE NOT NULL,  -- First day of month (e.g., 2025-11-01)
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_CommissionAccruals_ReferrerId ON CommissionAccruals(ReferrerId)
CREATE INDEX IX_CommissionAccruals_AccrualMonth ON CommissionAccruals(AccrualMonth)

4. CommissionPayouts:
(
  PayoutId UUID PRIMARY KEY DEFAULT NEWID(),
  ReferrerId UUID NOT NULL FOREIGN KEY REFERENCES Referrers(ReferrerId),
  TotalAmount DECIMAL(10,2) NOT NULL,
  PaymentMonth DATE NOT NULL,  -- First day of month
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Processing', 'Paid', 'Failed'
  PaymentMethod VARCHAR(50) NULL,  -- 'Bank Transfer', 'Cheque', 'Cash'
  TransactionId VARCHAR(100) NULL,
  PaidAt DATETIMEOFFSET NULL,
  PaidBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_CommissionPayouts_ReferrerId ON CommissionPayouts(ReferrerId)
CREATE INDEX IX_CommissionPayouts_PaymentMonth ON CommissionPayouts(PaymentMonth)

5. DiscountApprovals:
(
  DiscountId UUID PRIMARY KEY DEFAULT NEWID(),
  InvoiceId UUID NOT NULL FOREIGN KEY REFERENCES Invoices(InvoiceId),
  RequestedPercent DECIMAL(5,2) NOT NULL,
  RequestedBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  RequestedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  ApprovedBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  ApprovedAt DATETIMEOFFSET NULL,
  AutoApproved BIT NOT NULL DEFAULT 0,  -- true if ≤10%
  Reason NVARCHAR(500) NOT NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Approved', 'Rejected'
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_DiscountApprovals_InvoiceId ON DiscountApprovals(InvoiceId)
CREATE INDEX IX_DiscountApprovals_Status ON DiscountApprovals(Status)

6. CreditNotes:
(
  CreditNoteId UUID PRIMARY KEY DEFAULT NEWID(),
  InvoiceId UUID NOT NULL FOREIGN KEY REFERENCES Invoices(InvoiceId),
  Amount DECIMAL(10,2) NOT NULL,
  Reason VARCHAR(100) NOT NULL,  -- 'Cancellation', 'Reversal', 'PrepaidAdjustment'
  IssuedBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  IssuedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  Notes NVARCHAR(MAX) NULL
)

CREATE INDEX IX_CreditNotes_InvoiceId ON CreditNotes(InvoiceId)

7. InsuranceClaims:
(
  ClaimId UUID PRIMARY KEY DEFAULT NEWID(),
  VisitId UUID NOT NULL FOREIGN KEY REFERENCES Visits(VisitId),
  PatientId UUID NOT NULL FOREIGN KEY REFERENCES Patients(PatientId),
  InsuranceProvider VARCHAR(200) NOT NULL,
  PolicyNumber VARCHAR(100) NOT NULL,
  ClaimAmount DECIMAL(10,2) NOT NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Submitted', 'Approved', 'Rejected', 'PartiallyApproved'
  ApprovedAmount DECIMAL(10,2) NULL,
  SubmittedAt DATETIMEOFFSET NULL,
  RespondedAt DATETIMEOFFSET NULL,
  RejectionReason NVARCHAR(MAX) NULL,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_InsuranceClaims_VisitId ON InsuranceClaims(VisitId)
CREATE INDEX IX_InsuranceClaims_Status ON InsuranceClaims(Status)

8. InsuranceClaimRejections:
(
  RejectionId UUID PRIMARY KEY DEFAULT NEWID(),
  ClaimId UUID NOT NULL FOREIGN KEY REFERENCES InsuranceClaims(ClaimId),
  Reason NVARCHAR(MAX) NOT NULL,
  RefundMode VARCHAR(50) NOT NULL,  -- 'PatientRefund', 'LabAbsorb', 'Resubmit'
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

BACKEND (.NET 8):

FinanceService:
- Method: GetDailySummary(date)
  * Query all invoices for date
  * Calculate:
    - Total revenue (sum of paid invoices)
    - Total discounts given
    - Total pending (unpaid invoices)
    - Payment method breakdown (Cash, Card, UPI, Bank)
    - Commission accrued
  * Return summary DTO
  
- Method: AccrueCommission(visitId)
  * Triggered by: Report signing
  * Load visit + referrer + invoice
  * Load active CommissionPolicy for referrer
  * Calculate commission:
    - CommissionAmount = InvoiceAmount * (CommissionPercent / 100)
  * Create CommissionAccrual:
    - ReferrerId
    - VisitId
    - InvoiceAmount
    - CommissionPercent
    - CommissionAmount
    - AccrualMonth = first day of current month
    - Status = 'Accrued'
  * Audit log action
  
- Method: GetMonthlyCommissionDashboard(referrerId, month)
  * Query CommissionAccruals WHERE ReferrerId = referrerId AND AccrualMonth = month
  * Group by status (Accrued, Paid)
  * Calculate totals
  * Return dashboard DTO
  
- Method: ProcessMonthlyPayout(referrerId, month)
  * Query CommissionAccruals WHERE ReferrerId = referrerId AND AccrualMonth = month AND Status = 'Accrued'
  * Sum CommissionAmount
  * Create CommissionPayout:
    - ReferrerId
    - TotalAmount
    - PaymentMonth = month
    - Status = 'Pending'
  * Update all accruals: Status = 'Paid' (after actual payment)
  * Audit log action
  
- Method: RequestDiscount(invoiceId, discountPercent, reason, userId)
  * Validate invoice exists and not paid
  * Create DiscountApproval:
    - InvoiceId
    - RequestedPercent = discountPercent
    - RequestedBy = userId
    - Reason = reason
    - If discountPercent ≤ 10:
      * AutoApproved = true
      * Status = 'Approved'
      * ApprovedBy = userId (self-approved)
      * ApprovedAt = now
      * Apply discount to invoice immediately
    - If discountPercent > 10:
      * AutoApproved = false
      * Status = 'Pending'
      * Notify manager for approval
  * Audit log action
  
- Method: ApproveDiscount(discountId, userId)
  * Load DiscountApproval
  * Validate status = 'Pending'
  * Update:
    - ApprovedBy = userId
    - ApprovedAt = now
    - Status = 'Approved'
  * Apply discount to invoice
  * Recalculate invoice totals
  * Audit log action
  
- Method: CreateCreditNote(invoiceId, amount, reason, notes, userId)
  * Validate invoice
  * Create CreditNote
  * Update invoice: Total -= amount
  * If invoice.Total == 0: Status = 'Cancelled'
  * Audit log action

InsuranceService:
- Method: CreateClaim(visitId, insuranceProvider, policyNumber, claimAmount)
  * Validate visit and patient
  * Create InsuranceClaim
  * Status = 'Pending'
  * Audit log action
  
- Method: SubmitClaim(claimId, userId)
  * Update InsuranceClaim:
    - Status = 'Submitted'
    - SubmittedAt = now
  * Generate claim PDF
  * Send to insurance provider (email/portal upload)
  * Audit log action
  
- Method: UpdateClaimStatus(claimId, status, approvedAmount, rejectionReason, userId)
  * Update InsuranceClaim:
    - Status = status
    - ApprovedAmount = approvedAmount (if approved/partially)
    - RespondedAt = now
    - RejectionReason = rejectionReason (if rejected)
  * If rejected:
    - Create InsuranceClaimRejection
  * Audit log action

FinanceController:
- GET /api/v1/finance/daily-summary?date={date}
  Response: { revenue, discounts, pending, paymentBreakdown, commissionAccrued }
  
- POST /api/v1/finance/commission/accrue
  Request: { visitId }
  Response (200): { accrualId, commissionAmount }
  
- GET /api/v1/finance/commission/dashboard?referrerId={id}&month={month}
  Response: { accrued, paid, pending, totalAmount }
  
- POST /api/v1/finance/commission/payouts
  Request: { referrerId, month }
  Response (201): { payoutId, totalAmount, status: 'Pending' }
  
- POST /api/v1/finance/commission/payouts/{id}/process
  Request: { paymentMethod, transactionId }
  Response (200): { payoutId, status: 'Paid', paidAt }
  
- POST /api/v1/finance/discount/request
  Request: { invoiceId, discountPercent, reason }
  Response (201): { discountId, autoApproved, status }
  
- POST /api/v1/finance/discount/{id}/approve
  Response (200): { discountId, approvedAt, status: 'Approved' }
  
- POST /api/v1/finance/credit-notes
  Request: { invoiceId, amount, reason, notes }
  Response (201): { creditNoteId, amount }
  
- POST /api/v1/insurance/claims
  Request: { visitId, insuranceProvider, policyNumber, claimAmount }
  Response (201): { claimId, status: 'Pending' }
  
- POST /api/v1/insurance/claims/{id}/submit
  Response (200): { claimId, status: 'Submitted' }
  
- PUT /api/v1/insurance/claims/{id}/status
  Request: { status, approvedAmount, rejectionReason }
  Response (200): { claimId, status }

FRONTEND (React + Vite):

1. FinanceDashboard:
   - Route: /finance/dashboard
   - Date selector (default today)
   - Summary cards:
     * Total Revenue (₹)
     * Total Discounts (₹)
     * Pending Invoices (₹)
     * Commission Accrued (₹)
   - Payment method breakdown (pie chart):
     * Cash, Card, UPI, Bank Transfer
   - Revenue trend chart (last 30 days)
   
2. CommissionDashboard:
   - Route: /finance/commission
   - Referrer dropdown (select referrer)
   - Month selector
   - Summary cards:
     * Accrued This Month (₹)
     * Paid This Month (₹)
     * Pending Payout (₹)
   - Accruals table:
     * Visit Token | Patient | Invoice Amount | Commission % | Commission Amount | Status
   - Generate Payout button (for month)
   
3. DiscountRequestModal:
   - Triggered by: Discount button at reception (invoice screen)
   - Discount % input (slider: 0-50%)
   - Reason textarea (required)
   - Auto-approval indicator:
     * If ≤10%: "This discount will be auto-approved"
     * If >10%: "This discount requires manager approval"
   - Actions:
     * "Cancel" button
     * "Request Discount" button
   
4. DiscountApprovalQueue:
   - Route: /finance/discounts/pending
   - List all pending discount requests (>10%)
   - Columns:
     * Invoice | Patient | Requested % | Reason | Requested By | Requested At | Actions
   - Actions per row:
     * "Approve" button (green)
     * "Reject" button (red)
   
5. InsuranceClaimForm:
   - Route: /finance/insurance/claim/new
   - Visit selector (search by token)
   - Insurance provider input
   - Policy number input
   - Claim amount input
   - Submit button
   
6. InsuranceClaimTracker:
   - Route: /finance/insurance/claims
   - List all claims
   - Columns:
     * Claim ID | Patient | Provider | Policy | Claim Amount | Status | Submitted At | Actions
   - Status badges:
     * Pending: Orange
     * Submitted: Blue
     * Approved: Green
     * Rejected: Red
   - Actions per row:
     * "Submit to Insurer" button (if pending)
     * "Update Status" button
     * "View Details" button

BACKGROUND JOBS (Hangfire):
- Job: GenerateMonthlyPayouts
  * Runs on 1st of every month at 00:00
  * For each active referrer:
    - Query accruals for previous month
    - Sum commission amounts
    - Create CommissionPayout (status = 'Pending')
  * Email referrers with payout summary

TEST DATA:
- Create 3 referrers with commission policies
- Create 10 visits with invoices (link to referrers)
- Create commission accruals for current month
- Create 2 discount requests (1 auto-approved ≤10%, 1 pending >10%)
- Create 2 insurance claims (1 pending, 1 approved)

TESTS (Acceptance Criteria):
✅ Daily revenue summary shows correct totals
✅ Commission accrued on report signing
✅ Monthly commission dashboard shows accruals
✅ Generate payout creates CommissionPayout
✅ Discount ≤10% auto-approved
✅ Discount >10% requires approval
✅ Approval workflow works
✅ Credit note reduces invoice total
✅ Insurance claim submission works
✅ Claim status update works

OUTPUT:
- Finance dashboard with revenue summary
- Commission tracking and payout generation
- Discount approval workflow
- Credit note generation
- Insurance claim management
```

**What Gets Built:** Finance dashboard, commission accrual/payout, discount approval, credit notes, insurance claims

**Timeline:** 1 full day

**Accept Criteria:**
- ✅ Revenue summary accurate
- ✅ Commission accrues on report signing
- ✅ Discount approval workflow works
- ✅ Payout generation works
- ✅ Insurance claim tracking works

---

# DAY 16: ADMIN PANEL + TEST MASTER

**Milestone 4.2: Full Day**

**Gemini Prompt:**
```
You are a .NET 8 + React expert building a diagnostic lab system.

TASK: Build admin panel with test master, parameters, reference ranges, user management, CSV import (NO MOCKS).

DATABASE (Create these tables):

1. Tests:
(
  TestId UUID PRIMARY KEY DEFAULT NEWID(),
  TestCode VARCHAR(50) NOT NULL UNIQUE,
  TestName VARCHAR(200) NOT NULL,
  Department VARCHAR(50) NOT NULL,  -- 'Pathology', 'Radiology'
  Category VARCHAR(100) NULL,  -- 'Hematology', 'Biochemistry', 'Microbiology', etc.
  BasePrice DECIMAL(10,2) NOT NULL,
  TAT_Hours INT NOT NULL DEFAULT 24,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_Tests_TestCode ON Tests(TestCode)
CREATE INDEX IX_Tests_Department ON Tests(Department)

2. Parameters:
(
  ParameterId UUID PRIMARY KEY DEFAULT NEWID(),
  TestId UUID NOT NULL FOREIGN KEY REFERENCES Tests(TestId),
  ParameterCode VARCHAR(50) NOT NULL,
  ParameterName VARCHAR(200) NOT NULL,
  Unit VARCHAR(50) NULL,
  DataType VARCHAR(20) NOT NULL DEFAULT 'Numeric',  -- 'Numeric', 'Text', 'Boolean'
  SortOrder INT NOT NULL DEFAULT 1,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Parameters_TestCode UNIQUE (TestId, ParameterCode)
)

CREATE INDEX IX_Parameters_TestId ON Parameters(TestId)
CREATE INDEX IX_Parameters_ParameterCode ON Parameters(ParameterCode)

3. ReferenceRanges:
(
  RangeId UUID PRIMARY KEY DEFAULT NEWID(),
  ParameterId UUID NOT NULL FOREIGN KEY REFERENCES Parameters(ParameterId),
  AgeGroup VARCHAR(50) NOT NULL DEFAULT 'ALL',  -- 'ALL', 'PEDIATRIC', 'ADULT', 'GERIATRIC', 'CUSTOM'
  AgeMin INT NULL,  -- For custom ranges (e.g., 0-2 years)
  AgeMax INT NULL,
  Sex VARCHAR(10) NOT NULL DEFAULT 'ALL',  -- 'ALL', 'M', 'F'
  RefLow DECIMAL(18,4) NULL,
  RefHigh DECIMAL(18,4) NULL,
  CriticalLow DECIMAL(18,4) NULL,
  CriticalHigh DECIMAL(18,4) NULL,
  TextRange NVARCHAR(200) NULL,  -- For text values (e.g., "Negative", "Positive")
  EffectiveFrom DATE NOT NULL,
  EffectiveTo DATE NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_ReferenceRanges_ParameterId ON ReferenceRanges(ParameterId)
CREATE INDEX IX_ReferenceRanges_AgeGroup_Sex ON ReferenceRanges(AgeGroup, Sex)

4. PriceConfig:
(
  PriceId UUID PRIMARY KEY DEFAULT NEWID(),
  TestId UUID NOT NULL FOREIGN KEY REFERENCES Tests(TestId),
  DiscountPercent DECIMAL(5,2) NULL DEFAULT 0,
  ReferrerRatePercent DECIMAL(5,2) NULL DEFAULT 100,  -- % of base price
  EffectiveFrom DATE NOT NULL,
  EffectiveTo DATE NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_PriceConfig_TestId ON PriceConfig(TestId)

5. DeptScopePolicies:
(
  PolicyId UUID PRIMARY KEY DEFAULT NEWID(),
  RoleId INT NOT NULL FOREIGN KEY REFERENCES Roles(RoleId),
  Dept VARCHAR(50) NOT NULL,  -- 'Pathology', 'Radiology', 'ALL'
  CanSearchAll BIT NOT NULL DEFAULT 0,  -- Reception sees only their dept unless true
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

BACKEND (.NET 8):

TestMasterService:
- Method: CreateTest(testCode, testName, dept, category, basePrice, tatHours)
  * Validate testCode unique
  * Insert Tests
  * Audit log action
  
- Method: GetTests(dept, isActive, limit, offset)
  * Query tests with filters
  * Include parameter count per test
  * Paginated
  
- Method: UpdateTest(testId, testName, category, basePrice, tatHours)
  * Update Tests
  * Audit log action
  
- Method: DeactivateTest(testId)
  * Update Tests: IsActive = false
  * Audit log action (soft delete)
  
- Method: CreateParameter(testId, paramCode, paramName, unit, dataType, sortOrder)
  * Insert Parameters
  * Audit log action
  
- Method: GetParameters(testId)
  * Query parameters for test
  * Include reference ranges
  * Sorted by SortOrder
  
- Method: UpdateParameter(parameterId, paramName, unit, sortOrder)
  * Update Parameters
  * Audit log action
  
- Method: CreateReferenceRange(parameterId, ageGroup, sex, refLow, refHigh, criticalLow, criticalHigh)
  * Validate ranges (refLow < refHigh, criticalLow < refLow, criticalHigh > refHigh)
  * Insert ReferenceRanges
  * EffectiveFrom = today
  * Audit log action
  
- Method: ImportTestsFromCSV(csvFile, userId)
  * Parse CSV file
  * Validate structure:
    - Headers: TestCode, TestName, Category, BasePrice, ParameterCode, ParameterName, Unit, RefLow, RefHigh, CriticalLow, CriticalHigh, AgeGroup, Sex
  * For each row:
    - Upsert Test (if TestCode exists, update; else insert)
    - Upsert Parameter (if exists, update; else insert)
    - Insert ReferenceRange (new range)
  * Validate all rows before commit (transaction)
  * Return import summary (success count, error count, errors list)
  * Audit log action
  
- Method: ExportTestsToCSV()
  * Query all tests + parameters + ranges
  * Generate CSV file
  * Return file stream

UserManagementService:
- Method: CreateUser(email, name, roleId, deptId, password, userId)
  * Validate email unique
  * Hash password (bcrypt)
  * Insert Users
  * Audit log action
  
- Method: GetUsers(roleId, deptId, isActive, limit, offset)
  * Query users with filters
  * Paginated
  
- Method: UpdateUser(userId, name, roleId, deptId, isActive)
  * Update Users
  * Audit log action
  
- Method: ResetPassword(userId, newPassword)
  * Hash new password
  * Update Users: PasswordHash
  * Audit log action
  
- Method: DeactivateUser(userId)
  * Update Users: IsActive = false
  * Audit log action (soft delete)

AdminController:
- POST /api/v1/admin/tests
  Request: { testCode, testName, dept, category, basePrice, tatHours }
  Response (201): { testId, testCode, testName }
  
- GET /api/v1/admin/tests?dept={dept}&isActive={true}&limit=100&offset=0
  Response: { tests: [...], total }
  
- PUT /api/v1/admin/tests/{id}
  Request: { testName, category, basePrice, tatHours }
  Response (200): { testId, updatedAt }
  
- DELETE /api/v1/admin/tests/{id}  (soft delete)
  Response (200): { testId, isActive: false }
  
- POST /api/v1/admin/tests/{id}/parameters
  Request: { paramCode, paramName, unit, dataType, sortOrder }
  Response (201): { parameterId, paramCode, paramName }
  
- GET /api/v1/admin/tests/{id}/parameters
  Response: { parameters: [...] }
  
- POST /api/v1/admin/tests/{id}/parameters/{paramId}/ranges
  Request: { ageGroup, sex, refLow, refHigh, criticalLow, criticalHigh }
  Response (201): { rangeId, ageGroup, sex }
  
- POST /api/v1/admin/tests/import-csv
  Request: multipart/form-data (CSV file)
  Response (200): { successCount, errorCount, errors: [...] }
  
- GET /api/v1/admin/tests/export-csv
  Response: CSV file stream
  
- POST /api/v1/admin/users
  Request: { email, name, roleId, deptId, password }
  Response (201): { userId, email, name }
  
- GET /api/v1/admin/users?roleId={id}&deptId={id}&limit=50&offset=0
  Response: { users: [...], total }
  
- PUT /api/v1/admin/users/{id}
  Request: { name, roleId, deptId, isActive }
  Response (200): { userId, updatedAt }
  
- POST /api/v1/admin/users/{id}/reset-password
  Request: { newPassword }
  Response (200): { userId, passwordResetAt }
  
- DELETE /api/v1/admin/users/{id}  (soft delete)
  Response (200): { userId, isActive: false }

FRONTEND (React + Vite):

1. TestMasterListPage:
   - Route: /admin/tests
   - Filter bar:
     * Department dropdown
     * Active/Inactive toggle
     * Search by test code or name
   - Tests table:
     * Test Code | Test Name | Category | Base Price | TAT | Parameters | Actions
   - Actions per row:
     * "Edit" button → open test edit modal
     * "Parameters" button → navigate to parameters page
     * "Deactivate" button (soft delete)
   - Add Test button (green, prominent)
   
2. TestEditModal:
   - Test code input (disabled for edit, enabled for new)
   - Test name input
   - Department dropdown (Pathology, Radiology)
   - Category input
   - Base price input (₹)
   - TAT (hours) input
   - Save button
   
3. ParameterListPage:
   - Route: /admin/tests/{testId}/parameters
   - Test details at top (test code, name)
   - Parameters table:
     * Param Code | Param Name | Unit | Data Type | Sort Order | Ranges | Actions
   - Actions per row:
     * "Edit" button
     * "Ranges" button → open ranges modal
     * "Delete" button
   - Add Parameter button
   
4. ParameterEditModal:
   - Parameter code input
   - Parameter name input
   - Unit input (e.g., "g/dL", "mg/dL", "10^3/µL")
   - Data type dropdown (Numeric, Text, Boolean)
   - Sort order input (for display order)
   - Save button
   
5. ReferenceRangeModal:
   - Parameter info display (name, unit)
   - Ranges list (existing ranges)
   - Add new range form:
     * Age group dropdown (ALL, PEDIATRIC, ADULT, GERIATRIC, CUSTOM)
     * If CUSTOM:
       - Age min input (years)
       - Age max input (years)
     * Sex dropdown (ALL, M, F)
     * Ref Low input
     * Ref High input
     * Critical Low input (optional)
     * Critical High input (optional)
     * Effective from date
     * Effective to date (optional)
   - Add Range button
   - Ranges table:
     * Age Group | Sex | Ref Range | Critical Range | Effective From-To | Actions
   
6. CSVImportPage:
   - Route: /admin/tests/import
   - File upload dropzone (drag-drop or browse)
   - CSV template download link
   - Import button
   - Progress bar (during import)
   - Results summary:
     * Success count (green)
     * Error count (red)
     * Errors table (row number, error message)
   
7. UserManagementPage:
   - Route: /admin/users
   - Filter bar:
     * Role dropdown
     * Department dropdown
     * Active/Inactive toggle
   - Users table:
     * Email | Name | Role | Department | Last Login | Status | Actions
   - Actions per row:
     * "Edit" button
     * "Reset Password" button
     * "Deactivate" button
   - Add User button
   
8. UserEditModal:
   - Email input (disabled for edit)
   - Name input
   - Role dropdown (8 roles)
   - Department dropdown
   - Password input (only for new user)
   - Is Active toggle
   - Save button

CSV IMPORT FORMAT:
```
TestCode,TestName,Category,BasePrice,ParameterCode,ParameterName,Unit,RefLow,RefHigh,CriticalLow,CriticalHigh,AgeGroup,Sex
CBC,Complete Blood Count,Hematology,300,WBC,White Blood Cell Count,10^3/µL,4.5,11.0,2.0,30.0,ADULT,ALL
CBC,Complete Blood Count,Hematology,300,RBC,Red Blood Cell Count,10^6/µL,4.5,5.9,2.0,7.0,ADULT,M
CBC,Complete Blood Count,Hematology,300,RBC,Red Blood Cell Count,10^6/µL,4.0,5.2,2.0,7.0,ADULT,F
CBC,Complete Blood Count,Hematology,300,HEMOGLOBIN,Hemoglobin,g/dL,13.0,17.0,5.0,20.0,ADULT,M
CBC,Complete Blood Count,Hematology,300,HEMOGLOBIN,Hemoglobin,g/dL,12.0,15.0,5.0,20.0,ADULT,F
FBS,Fasting Blood Sugar,Biochemistry,150,GLUCOSE,Glucose,mg/dL,70,100,40,500,ADULT,ALL
```

CSV VALIDATION RULES:
- TestCode: required, max 50 chars
- TestName: required, max 200 chars
- Category: optional, max 100 chars
- BasePrice: required, numeric, > 0
- ParameterCode: required, max 50 chars
- ParameterName: required, max 200 chars
- Unit: optional, max 50 chars
- RefLow, RefHigh, CriticalLow, CriticalHigh: numeric, nullable
- AgeGroup: required, one of [ALL, PEDIATRIC, ADULT, GERIATRIC]
- Sex: required, one of [ALL, M, F]

TEST DATA:
- Create 5 tests with parameters:
  * CBC (10 parameters)
  * FBS (1 parameter)
  * Lipid Profile (4 parameters)
  * LFT (6 parameters)
  * Urine Routine (15 parameters)
- Create reference ranges (age/sex-specific)
- Create CSV import file with 50 rows
- Create 8 users (one per role)

TESTS (Acceptance Criteria):
✅ Create test → saved to database
✅ Add parameter → linked to test
✅ Add reference range → linked to parameter
✅ Import CSV → tests, parameters, ranges created
✅ Export CSV → complete data exported
✅ Create user → password hashed
✅ Reset password → new hash stored
✅ Deactivate test/user → soft delete works
✅ Age/sex-specific ranges apply correctly

OUTPUT:
- Admin can manage test master
- Parameters and ranges configurable
- CSV import/export works
- User management complete
- All changes audited
```

**What Gets Built:** Test master CRUD, parameter management, reference ranges, CSV import/export, user management

**Timeline:** 1 full day

**Accept Criteria:**
- ✅ Test master CRUD works
- ✅ Parameters and ranges configurable
- ✅ CSV import/export works
- ✅ User management complete
- ✅ All audited

---

# DAY 17: INVENTORY + AUDIT TRAIL

**Milestone 4.3: Full Day**

**Gemini Prompt:**
```
You are a .NET 8 + React expert building a diagnostic lab system.

TASK: Build inventory management with lot tracking, expiry alerts, auto-deduction, and complete audit trail (NO MOCKS).

DATABASE (Create these tables):

1. InventoryItems:
(
  ItemId UUID PRIMARY KEY DEFAULT NEWID(),
  ItemCode VARCHAR(50) NOT NULL UNIQUE,
  ItemName VARCHAR(200) NOT NULL,
  Category VARCHAR(100) NOT NULL,  -- 'Reagent', 'Consumable', 'Equipment'
  Unit VARCHAR(50) NOT NULL,  -- 'ml', 'units', 'pieces', 'boxes'
  ReorderLevel DECIMAL(10,2) NOT NULL DEFAULT 10,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_InventoryItems_ItemCode ON InventoryItems(ItemCode)
CREATE INDEX IX_InventoryItems_Category ON InventoryItems(Category)

2. InventoryLots:
(
  LotId UUID PRIMARY KEY DEFAULT NEWID(),
  ItemId UUID NOT NULL FOREIGN KEY REFERENCES InventoryItems(ItemId),
  LotNumber VARCHAR(100) NOT NULL UNIQUE,
  Quantity DECIMAL(10,2) NOT NULL,
  ReceivedDate DATE NOT NULL,
  ExpiryDate DATE NOT NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Active',  -- 'Active', 'Expired', 'Depleted'
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_InventoryLots_ItemId ON InventoryLots(ItemId)
CREATE INDEX IX_InventoryLots_ExpiryDate ON InventoryLots(ExpiryDate)
CREATE INDEX IX_InventoryLots_Status ON InventoryLots(Status)

3. InventoryTransactions:
(
  TransactionId UUID PRIMARY KEY DEFAULT NEWID(),
  LotId UUID NOT NULL FOREIGN KEY REFERENCES InventoryLots(LotId),
  TransactionType VARCHAR(50) NOT NULL,  -- 'Receive', 'Use', 'Waste', 'Return', 'Transfer'
  Quantity DECIMAL(10,2) NOT NULL,
  BalanceAfter DECIMAL(10,2) NOT NULL,
  Reason NVARCHAR(500) NULL,
  LinkedEntityType VARCHAR(50) NULL,  -- 'Result', 'QCRun', 'Sample'
  LinkedEntityId UUID NULL,
  PerformedBy UUID NOT NULL FOREIGN KEY REFERENCES Users(UserId),
  PerformedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_InventoryTransactions_LotId ON InventoryTransactions(LotId)
CREATE INDEX IX_InventoryTransactions_TransactionType ON InventoryTransactions(TransactionType)
CREATE INDEX IX_InventoryTransactions_PerformedAt ON InventoryTransactions(PerformedAt)

4. AutoDeductionRules:
(
  RuleId UUID PRIMARY KEY DEFAULT NEWID(),
  TestCode VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Tests(TestCode),
  ItemId UUID NOT NULL FOREIGN KEY REFERENCES InventoryItems(ItemId),
  QuantityPerTest DECIMAL(10,2) NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_AutoDeductionRules_TestCode ON AutoDeductionRules(TestCode)

5. ExpiryAlerts:
(
  AlertId UUID PRIMARY KEY DEFAULT NEWID(),
  LotId UUID NOT NULL FOREIGN KEY REFERENCES InventoryLots(LotId),
  AlertType VARCHAR(50) NOT NULL,  -- 'Expiring30Days', 'Expiring7Days', 'Expired'
  AlertedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  AcknowledgedBy UUID NULL FOREIGN KEY REFERENCES Users(UserId),
  AcknowledgedAt DATETIMEOFFSET NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'Active'  -- 'Active', 'Acknowledged', 'Resolved'
)

CREATE INDEX IX_ExpiryAlerts_LotId ON ExpiryAlerts(LotId)
CREATE INDEX IX_ExpiryAlerts_Status ON ExpiryAlerts(Status)

6. AuditSeals:
(
  SealId UUID PRIMARY KEY DEFAULT NEWID(),
  AuditId BIGINT NOT NULL FOREIGN KEY REFERENCES AuditLog(LogId),
  CurrentHash VARCHAR(256) NOT NULL,  -- SHA256 hash of current record
  PreviousHash VARCHAR(256) NULL,  -- Hash of previous record (chain)
  PreviousSealHash VARCHAR(256) NULL,  -- Hash of previous seal (chain)
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

CREATE INDEX IX_AuditSeals_AuditId ON AuditSeals(AuditId)
CREATE INDEX IX_AuditSeals_CreatedAt ON AuditSeals(CreatedAt)

BACKEND (.NET 8):

InventoryService:
- Method: CreateItem(itemCode, itemName, category, unit, reorderLevel)
  * Insert InventoryItems
  * Audit log action
  
- Method: ReceiveLot(itemId, lotNumber, quantity, receivedDate, expiryDate, userId)
  * Insert InventoryLots
  * Create InventoryTransaction (type = 'Receive')
  * Audit log action
  
- Method: UseLot(lotId, quantity, reason, linkedEntityType, linkedEntityId, userId)
  * Validate lot has sufficient quantity
  * Update InventoryLots: Quantity -= quantity
  * If Quantity == 0: Status = 'Depleted'
  * Create InventoryTransaction (type = 'Use', balanceAfter = remaining)
  * Audit log action
  
- Method: GetInventoryDashboard()
  * Query all items with current stock levels (sum of active lots)
  * Check against reorder levels
  * Return dashboard DTO:
    - Total items
    - Items below reorder level
    - Expiring soon (30 days)
    - Expired lots
  
- Method: AutoDeduct(testCode, userId)
  * Query AutoDeductionRules WHERE TestCode = testCode
  * For each rule:
    - Find active lot (FIFO: oldest expiry date first)
    - Call UseLot(lotId, quantityPerTest, 'Auto-deduction', 'Result', resultId, userId)
  * Triggered by: Result entry or report signing
  
- Method: CheckExpiry() (Background Job - Hangfire)
  * Runs daily at 00:00
  * Query InventoryLots WHERE ExpiryDate BETWEEN now AND now+30 days
  * For each:
    - If ExpiryDate <= now+7 days: Create ExpiryAlert (type = 'Expiring7Days')
    - If ExpiryDate <= now+30 days: Create ExpiryAlert (type = 'Expiring30Days')
    - If ExpiryDate < now: Update Status = 'Expired', Create ExpiryAlert (type = 'Expired')

AuditTrailService:
- Method: SealAuditLog(auditId)
  * Load AuditLog entry
  * Calculate CurrentHash = SHA256(UserId + Action + EntityType + EntityId + Timestamp)
  * Load previous seal (if exists)
  * Create AuditSeals:
    - CurrentHash
    - PreviousHash = previous seal's CurrentHash
    - PreviousSealHash = SHA256(previous seal's content)
  * Blockchain-style chain of hashes for tamper detection
  
- Method: VerifyAuditIntegrity(startDate, endDate)
  * Load all AuditSeals in date range
  * Recalculate hashes for each
  * Verify:
    - CurrentHash matches calculated hash
    - PreviousHash matches previous seal's CurrentHash
    - Chain is unbroken
  * Return { isValid, brokenChainIndex, tamperedRecords[] }

InventoryController:
- POST /api/v1/inventory/items
  Request: { itemCode, itemName, category, unit, reorderLevel }
  Response (201): { itemId, itemCode, itemName }
  
- GET /api/v1/inventory/items?category={category}&limit=100
  Response: { items: [...], total }
  
- POST /api/v1/inventory/lots
  Request: { itemId, lotNumber, quantity, receivedDate, expiryDate }
  Response (201): { lotId, lotNumber, quantity }
  
- POST /api/v1/inventory/lots/{id}/use
  Request: { quantity, reason }
  Response (200): { lotId, balanceAfter }
  
- GET /api/v1/inventory/dashboard
  Response: { totalItems, belowReorderLevel, expiringSoon, expiredLots }
  
- GET /api/v1/inventory/transactions?lotId={id}&limit=50
  Response: { transactions: [...], total }
  
- GET /api/v1/inventory/expiry-alerts?status=active
  Response: { alerts: [{ lotId, itemName, expiryDate, alertType }] }
  
- POST /api/v1/inventory/auto-deduct
  Request: { testCode }
  Response (200): { itemsDeducted: [...] }

AuditController:
- GET /api/v1/audit-logs?entityType={type}&entityId={id}&limit=100
  Response: { logs: [...], total }
  
- GET /api/v1/audit-logs/search?userId={id}&action={action}&startDate={date}&endDate={date}
  Response: { logs: [...], total }
  
- GET /api/v1/audit-logs/verify-integrity?startDate={date}&endDate={date}
  Response: { isValid, brokenChainIndex, tamperedRecords: [...] }
  
- GET /api/v1/audit-logs/export?startDate={date}&endDate={date}&format=CSV
  Response: CSV file stream

FRONTEND (React + Vite):

1. InventoryDashboard:
   - Route: /admin/inventory
   - Summary cards:
     * Total Items (count)
     * Below Reorder Level (count, red)
     * Expiring Soon (30 days, orange)
     * Expired Lots (count, red)
   - Items table:
     * Item Code | Item Name | Category | Current Stock | Reorder Level | Status
   - Status badges:
     * In Stock: Green
     * Below Reorder: Red
     * Out of Stock: Gray
   - Add Item button
   
2. InventoryItemForm:
   - Item code input
   - Item name input
   - Category dropdown (Reagent, Consumable, Equipment)
   - Unit input (ml, units, pieces, boxes)
   - Reorder level input
   - Save button
   
3. LotManagementPage:
   - Route: /admin/inventory/lots?itemId={id}
   - Lots table:
     * Lot Number | Quantity | Received Date | Expiry Date | Status | Actions
   - Status badges:
     * Active: Green
     * Expiring Soon: Orange
     * Expired: Red
     * Depleted: Gray
   - Actions per row:
     * "Use" button → open use modal
     * "View Transactions" button
   - Receive Lot button
   
4. ReceiveLotModal:
   - Lot number input
   - Quantity input
   - Received date picker
   - Expiry date picker
   - Receive button
   
5. UseLotModal:
   - Lot info display (lot number, current quantity)
   - Quantity input (max = current quantity)
   - Reason dropdown:
     * Test performed
     * Quality control
     * Waste/damaged
     * Transfer to another lab
   - Use button
   
6. ExpiryAlertsPage:
   - Route: /admin/inventory/expiry-alerts
   - Alerts table:
     * Item Name | Lot Number | Expiry Date | Alert Type | Alerted At | Actions
   - Alert type badges:
     * Expiring in 7 days: Red
     * Expiring in 30 days: Orange
     * Expired: Dark red
   - Actions per row:
     * "Acknowledge" button
     * "View Item" button
   
7. AuditLogPage:
   - Route: /admin/audit-logs
   - Filter bar:
     * User dropdown
     * Entity type dropdown (Patient, Visit, Result, Report, etc.)
     * Action dropdown (Create, Update, Delete, Sign, etc.)
     * Date range picker
   - Audit logs table:
     * Timestamp | User | Action | Entity | Entity ID | Old Value | New Value
   - Export button (CSV)
   
8. AuditIntegrityCheck:
   - Route: /admin/audit-logs/integrity
   - Date range picker
   - Verify button
   - Results display:
     * Is Valid: Yes/No (green/red badge)
     * If invalid:
       - Broken chain index
       - Tampered records list (timestamp, user, action)
   - Alert if tampering detected

BACKGROUND JOBS (Hangfire):
- Job: CheckExpiry
  * Runs daily at 00:00
  * Creates expiry alerts
  
- Job: SealAuditLogs
  * Runs every hour
  * Seals all audit logs from previous hour
  * Creates AuditSeals entries (blockchain-style)

TEST DATA:
- Create 5 inventory items:
  * EDTA Tubes (Consumable, 100 units)
  * Glucose Reagent (Reagent, 500 ml)
  * CBC Analyzer Reagent (Reagent, 1000 ml)
  * Barcode Labels (Consumable, 1000 pieces)
  * Gloves (Consumable, 50 boxes)
  
- Create lots:
  * 3 active lots
  * 1 expiring in 7 days (should trigger alert)
  * 1 expired lot
  
- Create auto-deduction rules:
  * CBC → EDTA Tubes (1 unit per test)
  * CBC → CBC Analyzer Reagent (10 ml per test)
  * FBS → Glucose Reagent (5 ml per test)
  
- Create 100 audit log entries
- Seal audit logs (create AuditSeals)

TESTS (Acceptance Criteria):
✅ Create inventory item → saved
✅ Receive lot → quantity added
✅ Use lot → quantity deducted, transaction logged
✅ Auto-deduction on result entry → items deducted per rule
✅ Expiry alert created (30 days, 7 days, expired)
✅ Below reorder level shows in dashboard
✅ Audit seals created (hash chain)
✅ Integrity check detects tampering (if seal modified)
✅ Export audit logs → CSV file

OUTPUT:
- Inventory management complete
- Lot tracking with FIFO
- Auto-deduction on test completion
- Expiry alerts functional
- Audit trail with blockchain-style sealing
- Tamper detection works
```

**What Gets Built:** Inventory management, lot tracking, auto-deduction, expiry alerts, audit trail with sealing, tamper detection

**Timeline:** 1 full day

**Accept Criteria:**
- ✅ Inventory CRUD works
- ✅ Lot tracking functional
- ✅ Auto-deduction works
- ✅ Expiry alerts trigger
- ✅ Audit trail sealed and verified

---

# SUMMARY

## Days 10-17 Completion Summary

| Day | Milestone | What Gets Built | Accept Criteria |
|-----|-----------|-----------------|-----------------|
| **Day 10** | Lab Results + Delta Checks + Autosave | Result entry UI, delta checks, autosave, recovery, flagging logic | ✅ Result entry works, ✅ Delta checks trigger, ✅ Autosave fires every 30s |
| **Day 11** | Critical Values + Escalation | Critical value detection, SMS/WhatsApp/Email notifications, escalation, acknowledgment | ✅ Critical values trigger alerts, ✅ SMS/WhatsApp sent, ✅ Escalation after 30 min |
| **Day 12** | Pathologist Review + Signing | Review queue, digital signing, PDF generation, addendum workflow, version control | ✅ Review queue displays, ✅ Digital signature generated, ✅ PDF generation queued |
| **Day 13** | Report Templates + PDF Generation | Template designer, JSON DSL, QuestPDF renderer, preview, publish workflow | ✅ Template designer works, ✅ Preview generates PDF, ✅ Conditional formatting applies |
| **Day 14** | Delivery Desk + Multi-Channel | Delivery queue, print/WhatsApp/SMS/email/secure link, OTP validation, retry logic | ✅ Delivery queue displays, ✅ Multi-channel delivery works, ✅ Secure download with OTP |
| **Day 15** | Finance + Commission + Insurance | Finance dashboard, commission accrual/payout, discount approval, credit notes, insurance claims | ✅ Revenue summary accurate, ✅ Commission accrues, ✅ Discount approval works |
| **Day 16** | Admin Panel + Test Master | Test master CRUD, parameter management, reference ranges, CSV import/export, user management | ✅ Test master CRUD works, ✅ CSV import/export works, ✅ User management complete |
| **Day 17** | Inventory + Audit Trail | Inventory management, lot tracking, auto-deduction, expiry alerts, audit sealing, tamper detection | ✅ Inventory CRUD works, ✅ Auto-deduction works, ✅ Audit trail sealed and verified |

## Total Components Built (Days 10-17)

- **Database Tables:** 40+ tables
- **Backend Services:** 30+ service methods
- **API Endpoints:** 35+ endpoints
- **Frontend Components:** 45+ React components
- **Background Jobs:** 5 Hangfire jobs
- **Integrations:** Twilio (SMS/WhatsApp), SMTP (Email), QuestPDF (PDF generation)

## Next Steps

**Days 18-20:**
- Day 18: Radiology workflow (X-ray/MRI/CT)
- Day 19: Backup + restore + health checks
- Day 20: Go-live + smoke tests + training

**You now have:**
- ✅ Complete pathology workflow (Reception → Sample → Lab Tech → Pathologist → Delivery)
- ✅ Complete finance + commission system
- ✅ Complete admin panel + test master
- ✅ Complete audit trail with tamper detection

---

**Ready to continue? Next: Days 18-20 prompts!** 🚀


Prompt for Gemini (Roles & Access Control)
Immutable Guardrails (must follow)

- DO NOT run any shell commands, builds, or git operations.
- If a DB migration or dotnet ef step is needed, only tell the Product Owner to run it; you must not run it.
- If a new package is needed, just mention the install command in the TLDR; don’t execute it.
- Preserve existing structure and style in each file.
- After changes, output only a TLDR terminal-style summary:
  - What the issue/goal was (1–2 sentences)
  - What you implemented (1–2 sentences)
  - Which files changed (names only)
  No code diffs, no full file dumps.
- Do NOT create or modify anything under web/ or any frontend/React/TSX files.
- If you feel UI changes are needed, just mention them in the TLDR as “future UI work”, do not implement.

---

# DAY 14.ROLES: ROLE-BASED ACCESS CONTROL BACKBONE

You are a .NET 8 BACKEND expert building a diagnostic lab system.

STACK:
- ASP.NET Core .NET 8 Web API
- EF Core for data access
- SQL Server
- Background worker using IHostedService / BackgroundService
- JWT-based authentication

TASK (BACKEND ONLY):

Implement a proper **role + policy** system for the lab backend.

Goals:

- Every user has a well-defined **Role**.
- JWT tokens contain the role as a **claim**.
- Authorization **policies** map roles to backend areas (Reception, Phlebotomy, Pathology, Radiology, Delivery).
- Controllers are protected with policies, **but existing flows and business logic are NOT changed** in this task.
- **Admin** has superuser access and can perform any action allowed to other roles.

NO FRONTEND CODE.  
Everything is backend: DB, models, auth, policies, attributes on controllers.

---

## ROLES (CANONICAL LIST)

Use these exact role names (string values in DB and JWT):

1. `Admin`         – Full access to all backend areas.
2. `Receptionist`  – Front desk: patient registration, visits, billing.
3. `Phlebotomist`  – Sample collection and basic lab operations.
4. `Pathologist`   – Lab result review and report signing (Pathology).
5. `XRayTech`      – X-Ray imaging technician.
6. `MriTech`       – MRI imaging technician.
7. `Radiologist`   – Imaging reporting (X-Ray, CT, MRI, etc.).
8. `DeliveryDesk`  – Delivery desk operations (Day 14 delivery queue, multi-channel delivery).

All role checking must be **case-sensitive** and use these exact strings.

---

## DATABASE DESIGN – USERS & ROLES

The system already has a `Users` table with columns similar to:

- `UserId` (uniqueidentifier)
- `Email`
- `PasswordHash`
- `Name`
- `IsActive`
- `CreatedAt`
- `FailedLoginAttempts`
- `LockoutEnd`
- `RowVersion`
- `SignatureImageUrl`
- `SignatureUpdatedAt`

### 1. Add Role column (if missing)

Add a nullable `Role` column on `Users`:

```sql
ALTER TABLE Users
ADD Role NVARCHAR(50) NULL;


Then update EF Core User entity model to include:

public string? Role { get; set; }

2. Seed / Update Roles for Existing Users

ASSUMPTIONS (adjust if the DB differs):

Existing seeded users:

admin@synos.com

pathologist@lab.com

Set roles:

UPDATE Users SET Role = 'Admin'       WHERE Email = 'admin@synos.com';
UPDATE Users SET Role = 'Pathologist' WHERE Email = 'pathologist@lab.com';

3. Seed New Users for Each Operational Role

Use the same bcrypt hashing approach as existing users:

Expose a dev-only endpoint (already exists): GET /api/v1/Auth/dev-hash?password=Admin

Use the returned hash (e.g. $2a$11$...) for the new seeded accounts.

Create at least these users:

reception@lab.com → Role = Receptionist

phleb@lab.com → Role = Phlebotomist

xray@lab.com → Role = XRayTech

mri@lab.com → Role = MriTech

radiologist@lab.com → Role = Radiologist

delivery@lab.com → Role = DeliveryDesk

SQL example:

INSERT INTO Users (UserId, Email, PasswordHash, Name, IsActive, CreatedAt, FailedLoginAttempts, LockoutEnd, Role)
VALUES
(NEWID(), 'reception@lab.com',   '<HASH_FOR_Admin>', 'Reception User',   1, SYSDATETIME(), 0, NULL, 'Receptionist'),
(NEWID(), 'phleb@lab.com',       '<HASH_FOR_Admin>', 'Phlebotomy Tech',  1, SYSDATETIME(), 0, NULL, 'Phlebotomist'),
(NEWID(), 'xray@lab.com',        '<HASH_FOR_Admin>', 'X-Ray Tech',       1, SYSDATETIME(), 0, NULL, 'XRayTech'),
(NEWID(), 'mri@lab.com',         '<HASH_FOR_Admin>', 'MRI Tech',         1, SYSDATETIME(), 0, NULL, 'MriTech'),
(NEWID(), 'radiologist@lab.com', '<HASH_FOR_Admin>', 'Radiologist',      1, SYSDATETIME(), 0, NULL, 'Radiologist'),
(NEWID(), 'delivery@lab.com',    '<HASH_FOR_Admin>', 'Delivery Desk',    1, SYSDATETIME(), 0, NULL, 'DeliveryDesk');


(Do not hardcode hashes in code; assume they are seeded via migrations or scripts.)

AUTH SERVICE – EMIT ROLE CLAIM

In the authentication service where JWT tokens are generated (e.g. AuthService.Authenticate() or equivalent), ensure:

The User entity has a Role property.

The JWT includes the role claim:

var claims = new List<Claim>
{
    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
    new Claim(ClaimTypes.Name, user.Name ?? string.Empty),
    new Claim(ClaimTypes.Email, user.Email ?? string.Empty)
    // ... any existing claims
};

if (!string.IsNullOrEmpty(user.Role))
{
    claims.Add(new Claim(ClaimTypes.Role, user.Role));
}


The final JWT payload should contain the role, e.g.:

"role": "Admin"


Optionally also emit a custom claim (e.g. "lab_role"), but ClaimTypes.Role is mandatory for policy checks.

AUTHORIZATION POLICIES

Define authorization policies in Program.cs (or the relevant startup file) so that:

Admin can access everything.

Other roles are constrained to their specific area.

Use AddAuthorization(options => { ... }) to add policies:

builder.Services.AddAuthorization(options =>
{
    // RECEPTION: Register patients, start visits, billing, payments
    options.AddPolicy("ReceptionDesk", policy =>
    {
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole("Receptionist") ||
            ctx.User.IsInRole("Admin"));
    });

    // PHLEBOTOMY: Sample collection, worklist, barcodes
    options.AddPolicy("SampleCollection", policy =>
    {
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole("Phlebotomist") ||
            ctx.User.IsInRole("Admin"));
    });

    // PATHOLOGY: Results entry, review, signing of lab reports
    options.AddPolicy("PathologyReporting", policy =>
    {
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole("Pathologist") ||
            ctx.User.IsInRole("Admin"));
    });

    // DELIVERY DESK: Delivery queue, multi-channel delivery (Day 14)
    options.AddPolicy("DeliveryDesk", policy =>
    {
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole("DeliveryDesk") ||
            ctx.User.IsInRole("Admin"));
    });

    // RADIOLOGY (X-Ray, MRI, imaging reporting) – backend skeleton only for now.
    options.AddPolicy("RadiologyOps", policy =>
    {
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole("XRayTech") ||
            ctx.User.IsInRole("MriTech") ||
            ctx.User.IsInRole("Radiologist") ||
            ctx.User.IsInRole("Admin"));
    });
});


IMPORTANT:
Do NOT change existing business logic or flows in this task.
Only wire policies and roles; Day 14.1 will refine workflow states and responsibilities.

CONTROLLER PROTECTION (THIN LAYER ONLY)

Attach [Authorize] attributes with appropriate policies to controllers. Do not change method logic; just protect them.

You may need:

using Microsoft.AspNetCore.Authorization;


Examples (adjust controller names to actual ones in the project):

Reception API
[ApiController]
[Route("api/v1/reception")]
[Authorize(Policy = "ReceptionDesk")]
public class ReceptionController : ControllerBase
{
    // start-visit, complete-payment, visit-summary...
}


If some patient-management endpoints are shared across roles, keep them at broader [Authorize] or add role-aware policies as needed, but do not break existing behavior unless required.

Samples (Phlebotomy)
[ApiController]
[Route("api/v1/samples")]
[Authorize(Policy = "SampleCollection")]
public class SamplesController : ControllerBase
{
    // create-for-visit, collect, reject, worklist, barcode...
}

Results & Reports (Pathology)
[ApiController]
[Route("api/v1/results")]
[Authorize(Policy = "PathologyReporting")]
public class ResultsController : ControllerBase
{
    // results entry, autosave, submit, patient history...
}

[ApiController]
[Route("api/v1/reports")]
[Authorize(Policy = "PathologyReporting")]
public class ReportsController : ControllerBase
{
    // sign report, get report, etc.
}

Delivery Desk (Day 14 Backend)
[ApiController]
[Route("api/v1/delivery")]
[Authorize(Policy = "DeliveryDesk")]
public class DeliveryController : ControllerBase
{
    // delivery queue, print, WhatsApp, SMS, email, handed-over, attempts, resend...
}

Public Secure Download – NO AUTH

This must remain accessible without JWT; it is protected by token + phone logic instead:

[ApiController]
[Route("api/v1/public/reports")]
[AllowAnonymous]
public class SecureDownloadController : ControllerBase
{
    // verify, download (phone-gated)
}

Radiology Controllers (Backend Skeleton)

If there are radiology-related controllers already present (e.g., X-ray orders, MRI results), protect them with "RadiologyOps":

[ApiController]
[Route("api/v1/radiology")]
[Authorize(Policy = "RadiologyOps")]
public class RadiologyController : ControllerBase
{
    // placeholder; do not change logic in this task
}


If these controllers do not yet exist, do not create new modules now; just prepare the policy definitions.

TESTING SCENARIOS (MANUAL VIA SWAGGER)

After implementation, the following scenarios must work:

Admin Superuser

Login as admin@synos.com (Role = Admin).

Can call:

POST /api/v1/reception/start-visit

POST /api/v1/samples/create-for-visit

GET /api/v1/samples/worklist

POST /api/v1/results/...

POST /api/v1/reports/{id}/sign

GET /api/v1/delivery/queue and all delivery actions.

No 403 Forbidden on any of the above.

Receptionist

Login as reception@lab.com (Role = Receptionist).

Can:

Register patient

Start visit

Complete payment

Cannot access:

/api/v1/delivery/* (delivery queue)

/api/v1/results/*

Should get 403 for disallowed areas.

Phlebotomist

Login as phleb@lab.com (Role = Phlebotomist).

Can:

View sample worklist

Collect / reject samples

Cannot:

Start visits (Reception)

Sign reports (Pathology)

Use delivery endpoints.

Pathologist

Login as pathologist@lab.com (Role = Pathologist).

Can:

Use results APIs to enter/submit results

Sign reports

Cannot:

Start visit (Reception)

Use delivery APIs (DeliveryDesk)

Use pure sample-collection operations.

Delivery Desk

Login as delivery@lab.com (Role = DeliveryDesk).

Can:

View delivery queue

Trigger WhatsApp/SMS/Email/Print/HandedOver

Cannot:

Start visits, collect samples, enter results, sign reports.

Public Secure Download

GET /api/v1/public/reports/verify/{token} and .../download/{token}?phone=:

Must work without Authorization header.

Must not redirect to login or return 401 because of missing JWT.

Remains secured purely by token + phone rules from Day 14.

ACCEPTANCE CRITERIA

This Day 14.ROLES task is considered DONE when:

✅ Users table has a Role column and the EF Core User entity exposes it.

✅ The following users exist (either via migrations or DB seeding) with appropriate Role values:

admin@synos.com → Admin

pathologist@lab.com → Pathologist

reception@lab.com → Receptionist

phleb@lab.com → Phlebotomist

xray@lab.com → XRayTech

mri@lab.com → MriTech

radiologist@lab.com → Radiologist

delivery@lab.com → DeliveryDesk

✅ JWT tokens for all users include a role claim matching their DB role.

✅ Authorization policies are defined for:

ReceptionDesk

SampleCollection

PathologyReporting

DeliveryDesk

RadiologyOps

✅ Controllers are appropriately annotated with [Authorize(Policy = "...")] OR [AllowAnonymous] for public endpoints, without changing existing endpoint behavior or main business logic.

✅ Manual testing via Swagger shows:

Admin can access all relevant endpoints without 403.

Other roles are restricted correctly (can access their area, get 403 outside it).

Public secure download remains accessible without JWT and still uses phone + token logic (from Day 14).

✅ No frontend files were modified.

FUTURE WORK (NOT IN THIS TASK, FOR DAY 14.1 AND BEYOND):

Introduce result workflow states (Draft, UnderReview, Signed).

Split responsibilities more strictly between Phlebotomist vs Pathologist.

Add radiology-specific workflows (image upload, modality-specific reporting).

Implement screen-level role behavior on the frontend (React) to match backend policies.