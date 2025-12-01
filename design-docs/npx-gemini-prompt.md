📌 STRICT INSTRUCTIONS

Implement exactly as specified — no shortcuts

No UI changes

No alternative endpoints

All business rules must be enforced (critical alerts, states, signature existence)

Do not alter existing PDF behavior except adding signature + QR fields

No file storage hacks — use existing storage layer

Keep code style 100% consistent with existing backend structure

If any part seems unclear → ask for clarification, do not assume

GOAL OF DAY 13.1:
- Allow storing per-doctor digital signatures (JPG/PNG).
- Allow a pathologist to “sign” a report:
  - Record signer, time, and signature hash immutably.
  - Use that in the SignatureBlock and QR code when rendering the PDF.
- Ensure this integrates with existing critical alert rules and final report states.

IMPORTANT:
- STILL BACKEND ONLY. No frontend implementation.
- Design APIs so the future UI can plug in easily.

--------------------------------
DATABASE – USERS EXTENSION (SIGNATURE)
--------------------------------

Assume there is a Users table with UserId and Role information.

Extend Users table with:

- SignatureImageUrl NVARCHAR(500) NULL  -- URL/path to stored signature image
- SignatureUpdatedAt DATETIMEOFFSET NULL

Rules:
- SignatureImageUrl may be null if doctor has not provided a signature.
- Only users with relevant roles (e.g., Pathologist, Radiologist) will typically use it.

--------------------------------
DATABASE – REPORT SIGNATURES
--------------------------------

Create a new table to record who signed which report, when, and with what signature.

ReportSignatures
(
  ReportSignatureId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  ReportId          UNIQUEIDENTIFIER NOT NULL, -- FK to Reports/FinalReports table (assume exists)
  SignedByUserId    UNIQUEIDENTIFIER NOT NULL, -- FK to Users(UserId)
  SignedAt          DATETIMEOFFSET NOT NULL,
  SignatureImageUrl NVARCHAR(500) NULL,        -- copy of user signature URL at time of sign
  SignatureHash     NVARCHAR(200) NOT NULL,    -- used in QR code and for verification
  ReportVersion     INT NOT NULL DEFAULT 1,    -- logical report version at sign time
  CreatedAt         DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

Indexes:
- IX_ReportSignatures_ReportId ON ReportSignatures(ReportId);
- IX_ReportSignatures_SignedByUserId ON ReportSignatures(SignedByUserId);

Behavior:
- Multiple signatures per report allowed if needed (for corrections / addendums), but:
  - The “current” signature is the latest one by SignedAt.
- For now, treat the latest record as the active signature for rendering.

--------------------------------
FILE / SIGNATURE UPLOAD ENDPOINT
--------------------------------

We need an endpoint for admin onboarding of doctor signatures.

Endpoint:
- POST /api/v1/users/{userId}/signature

Behavior:
- Auth: Admin-only (this is part of onboarding a pathologist).
- Accept multipart/form-data with a single image file (JPG or PNG).
- Validate:
  - File type (MIME, extension).
  - Reasonable size limits (e.g., <= 512 KB).
- Store file to configured storage (disk/Blob/S3) and generate a public or internal URL.
- Update Users.SignatureImageUrl and SignatureUpdatedAt.
- Return:
  { userId, signatureImageUrl, updatedAt }

NOTE:
- Do NOT store raw binary in database; use storage + URL instead.

--------------------------------
REPORT SIGNING FLOW (BUSINESS RULES)
--------------------------------

We assume a Reports or FinalReports table exists and report has a lifecycle.

New endpoint:

POST /api/v1/reports/{reportId}/sign

Called when a pathologist (Mr. X) presses “Sign Report” after reviewing.

Preconditions:
- Authenticated user must be a doctor/pathologist with permission.
- Report:
  - Exists and is in a state that can be signed (e.g., ResultsValidated / ReadyForSigning).
  - Has all required test results filled (no missing mandatory results).
  - Has NO pending critical alerts:
    - Reuse Day 12 logic or service to verify all critical alerts for this report/visit are acknowledged.
- User:
  - Has a non-null SignatureImageUrl (otherwise reject with a clear error: “No signature image configured for this user”).

Signing Behavior:
1) Load report aggregate, including:
   - Patient, visit, tests, results, flags, comments, interpretations, etc.
2) Determine logical report version:
   - If Reports table already has a Version column, use/increment it.
   - If not, you can start with Version = 1 and increment on each re-sign.
3) Build a canonical string or payload snapshot for hashing:
   - Include at least:
     - ReportId
     - ReportVersion
     - SignedByUserId
     - Key parts of the report content (e.g., test results hash).
     - SignedAt timestamp.
   - Compute a SignatureHash (e.g., SHA-256) from this canonical payload.
4) Insert a row into ReportSignatures:
   - ReportId = given reportId
   - SignedByUserId = current user
   - SignedAt = now (UTC)
   - SignatureImageUrl = current Users.SignatureImageUrl
   - SignatureHash = computed hash
   - ReportVersion = determined version
5) Update report status:
   - e.g., from "Validated" to "Signed" or "ReadyForRelease".
6) Audit log:
   - "ReportSigned" with ReportId, SignedByUserId, SignedAt, ReportVersion.

Responses:
- 200 OK with:
  {
    reportId,
    signedByUserId,
    signedAt,
    signatureHash,
    reportVersion
  }

Error cases:
- 400 if user has no signature image configured.
- 409 if report state is not eligible for signing.
- 409 if pending critical alerts exist.
- 404 if report not found.

--------------------------------
INTEGRATION WITH QUESTPDF RENDERING
--------------------------------

Update the Day 13 RenderPdfAsync(reportId, templateId = null) behavior to include signature data.

Steps:
1) Load report aggregate as before.
2) Load effective template (explicit templateId or default by modality).
3) Load latest ReportSignatures record for this ReportId (if any), ordered by SignedAt DESC.
4) Build a ReportPdfContext model that includes:
   - Report data (patient, visit, tests, flags, comments, etc.).
   - Signature data (if available):
     - SignedByUserId
     - SignedAt
     - SignatureImageUrl
     - SignatureHash
     - ReportVersion

5) Pass this context + TemplateModel to QuestPdfReportRenderer.GeneratePdfAsync.

INSIDE QuestPdfReportRenderer:

- When handling SignatureBlock:
  - If signature record exists:
    - Render doctor’s printed name (from Users) and designation if available.
    - Render signature image from SignatureImageUrl.
    - Render SignedAt date/time.
  - If no signature exists:
    - You can either:
      - Render “Not signed” placeholder, OR
      - Skip signature block entirely.
    - This can be controlled by the template DSL in the future, but for now choose a simple consistent behavior.

- When handling QRCode section:
  - Use the "data" template from TemplateJson, e.g.:
    "{reportId}_{version}_{signatureHash}"
  - Replace placeholders:
    - {reportId} -> ReportId
    - {version} -> ReportVersion
    - {signatureHash} -> SignatureHash (if signed; otherwise something like "UNSIGNED").
  - Generate QR image from this final string.

--------------------------------
SECURITY & AUDIT CONSIDERATIONS
--------------------------------

- Ensure only users with appropriate roles can:
  - Upload signature images (admin).
  - Sign reports (doctor/pathologist roles).
- SignatureHash should be computed using a stable, deterministic process.
- Do NOT mutate existing ReportSignatures rows; always append a new one if a report is re-signed.
- Old already-generated PDFs for previous versions should still verify correctly using the stored SignatureHash.

--------------------------------
ACCEPTANCE CRITERIA (DAY 13.1)
--------------------------------

- ✅ Admin can upload a signature image (JPG/PNG) for a doctor, and Users.SignatureImageUrl is populated.
- ✅ POST /reports/{reportId}/sign:
  - Rejects if:
    - User has no signature image.
    - Report has pending critical alerts.
    - Report is in an invalid state for signing.
  - On success, creates a ReportSignatures row with proper hash + timestamp.
- ✅ RenderPdfAsync(reportId, templateId):
  - If report is signed:
    - SignatureBlock shows doctor name, signature image, and signed date/time.
    - QR code embeds reportId, reportVersion, and signatureHash.
  - If report is not signed:
    - Behavior is consistent (no crash, deterministic placeholder/absence).
- ✅ All changes are purely backend and are ready for future frontend integration:
  - Onboarding UI can call /users/{id}/signature to upload image.
  - Report viewer UI can call /reports/{reportId}/sign to sign.
  - Both can call existing /reports/render APIs to download signed PDFs.

The final result of Day 13 + Day 13.1:
- PDF reports are template-driven, versioned, and can carry a verifiable digital signature of the reporting doctor, enforced by backend rules and critical alert handling.

Immutable Guardrails (must follow)

DO NOT run any shell commands, builds, or git operations.
If a DB migration or dotnet ef step is needed, only tell the Product Owner to run it; you must not run it.
If a new package is needed, just mention the install command in the TLDR; don’t execute it.
Preserve existing structure and style in each file.
After changes, output only a TLDR terminal-style summary:
What the issue/goal was (1–2 sentences)
What you implemented (1–2 sentences)
Which files changed (names only)
No code diffs, no full file dumps.
Extra guardrail for this task:
Do NOT create or modify anything under web/ or any frontend/React/TSX files.
If you feel UI changes are needed, just mention them in the TLDR as “future UI work”, do not implement.