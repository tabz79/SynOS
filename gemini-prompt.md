🚀 Day 12 — Report Signing + Specialist Critical Acknowledgment

Backend-only implementation

🎯 Goal

Enable pathologist sign-off for lab reports with:

Digital signature metadata

Critical value acknowledgment enforcement

Audit trail

Versioned report structure (Original report only)

📌 Acceptance Rules

A report cannot be signed if any related critical alert has Status = Pending

Signing a report implicitly acknowledges critical alerts

Signing generates Version 1 – Original

Signing records who signed, when, and remarks/interpretation

📂 Tasks
1️⃣ Entities (Model + Migration)

Report

ReportId (PK)

OrderId (FK)

Status → Draft | Signed

SignedByUserId (FK Users)

SignedAt (datetimeoffset)

PathologistComments (nullable)

Interpretation (nullable)

Recommendations (nullable)

CurrentVersion (int)

ReportVersions

ReportVersionId (PK)

ReportId (FK)

VersionNumber (int)

PdfPath (string, nullable)

CreatedAt

SignedBy (duplicate reference for version history)

SignedAt

Rule: VersionNumber starts at 1 for original

Add migrations and update DB.

2️⃣ Service Logic — Result → Report Flow

Create ReportService.SignReportAsync(orderId, pathologistId, metadata)

PREVENT SIGN-OFF:
    If ANY CriticalAlert.Status == Pending ⇒ throw InvalidOperationException(
       "Critical alerts must be acknowledged before signing."
    )

STEP 1: Acknowledge all alerts (Day 11 enforcement)
    CALL CriticalValueService.AcknowledgeAlertsForOrderAsync(orderId, pathologistId, "REPORT_SIGN")

STEP 2: Set Report status = Signed
STEP 3: Set SignedByUserId, SignedAt, update remarks
STEP 4: Create ReportVersion with VersionNumber = CurrentVersion + 1
STEP 5: Persist and return version metadata
STEP 6: Write CriticalAudit entry "SpecialistSigned"

3️⃣ Controller Endpoint
POST /api/v1/reports/{orderId}/sign
Body:
{
  "pathologistComments": "string",
  "interpretation": "string",
  "recommendations": "string"
}
Response: ReportVersion metadata


Authorization: Roles → PathTech, Admin

Immutable Guardrails (must follow)

DO NOT run any shell commands, builds, or git operations.

If a DB migration or dotnet ef step is needed, only tell the Product Owner to run it; you must not run it.

If a new package is needed, just mention the install command in the TLDR; don’t execute it.

Edit only the files required for this Day 8 printing feature. No drive-by refactors, no formatting churn.

Preserve existing structure and style in each file.

After changes, output only a TLDR terminal-style summary:

What the issue/goal was (1–2 sentences)

What you implemented (1–2 sentences)

Which files changed (names only)

No code diffs, no full file dumps.

Extra guardrail for this task:

Do NOT create or modify anything under web/ or any frontend/React/TSX files.

If you feel UI changes are needed, just mention them in the TLDR as “future UI work”, do not implement.
