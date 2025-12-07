Day 14.2 — Radiology Workflow Backend Prompt

You are a .NET 8 BACKEND expert building SynOS — a modern Diagnostic Lab System.

This task is to implement the complete Radiology workflow, aligned with the Pathology pipeline introduced in Day 14. All changes must preserve the existing style, architecture, and Day 14 security model.

🎯 GOAL

Enable Radiology results to follow the same lifecycle as Pathology, but with radiology-specific:

Work queues

Technician flow

Radiologist reporting

Image attachment support

Secure delivery bundle (report + images)

No UI integration yet. Backend + database only.

📌 Requirements
1️⃣ Auto-create Radiology Studies at Billing

When Reception completes billing and creates VisitTests

For each VisitTest where Department = "Radiology":

Auto-create one RadiologyStudy (per test)

Status = Pending

Link Patient + VisitId + VisitTestId

This mirrors Pathology sample creation.

2️⃣ Database Changes (New + Updated Entities)
A. Update VisitTests (if not already)

Must include Radiology metadata:

Department (varchar) = 'Radiology' for radiology tests

B. RadiologyStudies (NEW)
RadiologyStudies (
  RadiologyStudyId UNIQUEIDENTIFIER PK,
  VisitTestId UNIQUEIDENTIFIER NOT NULL FK,
  VisitId UNIQUEIDENTIFIER NOT NULL FK,
  PatientId UNIQUEIDENTIFIER NOT NULL FK,
  Modality VARCHAR(50) NOT NULL, -- XRay, CT, MRI, USG, etc.
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  AssignedTo UNIQUEIDENTIFIER NULL FK, -- Technician
  ExternalSystemName VARCHAR(100) NULL,
  ExternalAccessionNumber VARCHAR(100) NULL,
  ExternalStudyInstanceUid VARCHAR(200) NULL,
  ExternalViewerUrl NVARCHAR(MAX) NULL,
  CreatedAt DATETIMEOFFSET DEFAULT SYSUTCDATETIME(),
  CreatedBy UNIQUEIDENTIFIER NOT NULL FK -- Reception/Billing user
)


Statuses:

Pending → Assigned → ImagingCompleted → ResultDrafted → Signed

C. RadiologyImages (NEW)

Metadata only — NOT DICOM storage.

RadiologyImages (
  ImageId UNIQUEIDENTIFIER PK,
  RadiologyStudyId UNIQUEIDENTIFIER NOT NULL FK,
  FileName NVARCHAR(200) NOT NULL,
  FileUrl NVARCHAR(MAX) NOT NULL,
  ViewLabel NVARCHAR(100) NULL,
  SeriesNumber INT NULL,
  SequenceNumber INT NULL,
  UploadedAt DATETIMEOFFSET DEFAULT SYSUTCDATETIME(),
  UploadedBy UNIQUEIDENTIFIER NOT NULL FK
)

D. Reports (EXTEND existing generic entity)

Ensure attributes support Radiology:

Department = 'Radiology'
SourceType = 'RadiologyStudy'
SourceId = RadiologyStudyId


This keeps Delivery API functional without changes.

E. RadiologyReports (NEW 1-1 Report Extension)
RadiologyReports (
  ReportId UNIQUEIDENTIFIER PK FK → Reports(ReportId),
  RadiologyStudyId UNIQUEIDENTIFIER NOT NULL FK,
  Findings NVARCHAR(MAX) NOT NULL,
  Impression NVARCHAR(MAX) NOT NULL,
  AdditionalNotes NVARCHAR(MAX) NULL
)

F. ReportAttachments (NEW)

Stores deliverable files (PDF or ZIP):

ReportAttachments (
  AttachmentId UNIQUEIDENTIFIER PK,
  ReportId UNIQUEIDENTIFIER NOT NULL FK,
  Type VARCHAR(50) NOT NULL, -- 'ReportPdf','ImagePdf','ImageZip','ViewerLink'
  FileUrl NVARCHAR(MAX) NULL,
  DisplayName NVARCHAR(200) NOT NULL,
  CreatedAt DATETIMEOFFSET DEFAULT SYSUTCDATETIME()
)

3️⃣ Technician Flow APIs

Base route: /api/v1/radiology/studies
Authorization: Technician OR Admin

✔ Worklist

GET /queue?status=Pending|Assigned|ImagingCompleted


✔ Assign a study to technician

POST /assign
{ "studyId": "uuid" }


→ Status: Assigned

✔ Upload imaging deliverable file (PDF/ZIP export)

POST /upload-attachment (multipart/form-data)
  studyId
  file


→ Create ReportAttachment with Type ImagePdf or ImageZip
→ If first media uploaded → Status: ImagingCompleted

✔ Optionally set vendor system mapping

POST /set-external-mapping
{
  "studyId": "uuid",
  "systemName": "GE_XRAY_1",
  "accessionNumber": "XR-2025-000123",
  "viewerUrl": "https://pacs/vendor/viewer?acc=XR-2025-000123"
}

4️⃣ Radiologist Flow APIs

Base route: /api/v1/radiology/reports
Authorization: Radiologist OR Admin

✔ Worklist (grouped by Visit/Token)

GET /worklist


Should return:

Visit info (Token/patient)

All studies under that visit grouped together

For each: StudyId, TestName, Modality, Status, ReportStatus, any attachments

✔ View Study details

GET /{studyId}


→ Study + attachments + existing draft fields

✔ Draft report

POST /draft
{
  "studyId": "uuid",
  "findings": "...",
  "impression": "..."
}


→ Create/Update Reports row
→ Create/Update RadiologyReports row
→ Status: ResultDrafted

✔ Sign report

POST /sign
{ "studyId": "uuid" }


Backend action:

Generate PDF

Insert ReportAttachment (Type=ReportPdf)

Update Reports row:

Status='Signed'

PdfUrl set

Update RadiologyStudy.Status='Signed'

Now report is automatically eligible for Delivery via Day 14 APIs.

5️⃣ Delivery Extensibility

No changes to DeliveryController.
Instead, implement a new public download endpoint:

Base route: /api/v1/public/reports (no auth)

✔ Extra endpoint for package download:

GET /download-package/{token}?phone=10digit


Logic:

1️⃣ Verify phone exactly like existing secured download
2️⃣ Retrieve ReportAttachments for ReportId
3️⃣ ZIP report + media attachments
4️⃣ Stream file (Content-Type: application/zip)

Existing download endpoint remains PDF only.

Update WhatsApp/SMS/Email message templates to mention images included in the package.

6️⃣ RBAC Enforcement

Applies policies under Day 14.1 RBAC rules:

Action	Roles Allowed
Technician queue + upload	Technician, Admin
Draft + Sign report	Radiologist, Admin
Delivery Desk access	DeliveryDesk, Admin

Each API must have correct [Authorize(Roles = "...")]

✔ Acceptance Criteria (Batch QA)

Billing radiology tests auto-spawn studies

Technician sees a queue with proper statuses

Images/exports uploadable and linked to study/report

Radiologist sees grouped view by Token

Radiologist draft + sign works same as Pathology

Delivery desk sees Signed radiology reports automatically

Secure download:

/download → PDF

/download-package → ZIP (report + attachments)

All through Day 14 Delivery flow (secure link + phone gate)

No UI code touched

🧪 Output format (mandatory)

When done:

TLDR only:

Issue/Goal (1–2 lines)

What you implemented (1–2 lines)

Changed files (names only)

NO code dumps.
NO frontend files.
NO migrations execution — only generate them.

END OF PROMPT


TL;DR:
We’ll tell Gemini to:

* Fix the **ExternalAccessionNumber NULL** error properly (not hack it). 
* Introduce a clean **internal AccessionNumber** on RadiologyStudy.
* Auto-create radiology studies when **payment completes**, not via manual hacks.
* Prepare the model for **SynOS-as-DICOM-node (Option B)** in Day 16, but **don’t implement DICOM** yet.

Here’s a prompt you can copy-paste into Gemini.

---

### 🔧 PROMPT FOR GEMINI – Day 14.2 Radiology Workflow (updated, Accession-Ready, No DICOM Yet)

You are working on **SynOS**, a Diagnostic Lab Management System.
Tech stack: **.NET + EF Core + SQL Server**.
You are continuing the backend implementation for **Day 14.2 – Radiology Workflow**, mirroring the already working **Pathology + Phlebotomy flow**, but adapted for imaging.

The goal of this task is to:

1. Fix a current **RadiologyStudies insert error** related to `ExternalAccessionNumber` (see below).
2. Make the **Radiology backend workflow stable and testable end-to-end** (reception → billing/payment → radiology tech → radiologist → report + delivery).
3. Prepare the data model for a future **DICOM integration (Day 16) where SynOS will act as a DICOM node**, but **do NOT implement DICOM networking or Cornerstone viewer yet**.

---

## 1. Current error to fix (DO NOT IGNORE)

When we call:

* `POST /api/v1/radiology/studies/create-for-visit`
  with a valid `visitId` for a paid Radiology visit

we get a **500 error**. Logs show:

> Cannot insert the value NULL into column 'ExternalAccessionNumber', table 'SynOSDb.dbo.RadiologyStudies'; column does not allow nulls. INSERT fails. 

So right now, when creating `RadiologyStudy` rows, **`ExternalAccessionNumber` is required in the DB**, but we **don’t have PACS data yet**, and we are not ready to wire external systems.

This is wrong for Day 14.2. The system must be able to create Radiology studies **without any external PACS mapping**.

You must fix this at the **model + migration + code level**, not by stuffing fake values.

---

## 2. Target radiology workflow (business side)

Mirror the successful Pathology flow, but for imaging:

1. **Reception**

   * `POST /api/v1/reception/start-visit` with `dept = "Radiology"` and `testCodes` like `"XRAY_CHEST"`.
   * Creates Visit, Orders, Invoice in **PendingPayment**.

2. **Payment**

   * `POST /api/v1/reception/complete-payment` marks the invoice as **Paid** and visit as **Paid**.
   * At this moment, for each Radiology order (X-ray, CT, MRI, etc.) we want the system to **ensure a RadiologyStudy exists**.

3. **Radiology technician (X-Ray Tech user)**

   * They should see a **Radiology studies queue** filtered by status.
   * For now, we assume they will eventually use a separate DICOM console to send images.
   * SynOS only needs to manage:

     * Worklist / statuses (`PendingImaging`, `ImagingInProgress`, `ImagingCompleted`, `ReadyForReporting`)
     * Optional manual attachments (e.g. PDFs/images) as a fallback.

4. **Radiologist**

   * Sees a **Radiologist worklist** based on RadiologyStudy status (`ReadyForReporting` etc.).
   * Opens study details, writes report, signs.
   * Delivery logic should behave similar to Pathology: we can reuse existing `Report` + report signing + delivery mechanism.

Day 14.2: backend is radiology-aware and fully testable via Swagger/Postman.
Day 16: we will plug in Cornerstone 3D + DICOM receiver.

---

## 3. Data model – what must exist and how

### 3.1 RadiologyStudy – internal accession and external mapping

Update the **RadiologyStudy** entity and database schema with the following rules:

* **Mandatory fields:**

  * `RadiologyStudyId` (GUID, PK)
  * `VisitId` (FK)
  * `VisitTestId` (FK to the specific ordered test)
  * `PatientId` (FK)
  * `Modality` (e.g. `"XRAY"`, `"CT"`, `"MRI"` – can come from TestDefinition.Modality)
  * `Status` (string/enum: `PendingImaging`, `ImagingInProgress`, `ImagingCompleted`, `ReadyForReporting`, `Reported`, `Cancelled`)
  * `AccessionNumber` (**new, internal accession**, non-nullable, length ~50–100)
  * `CreatedAt` (DateTimeOffset)
  * `CreatedBy` (UserId)

* **External / PACS-related fields (MUST ALL BE NULLABLE for now):**

  * `ExternalSystemName` (string, nullable)
  * `ExternalAccessionNumber` (string, nullable)
  * `ExternalStudyInstanceUid` (string, nullable)
  * `ExternalViewerUrl` (string, nullable)

**Important design rule for Day 14.2:**

* `AccessionNumber` = **SynOS’s internal accession**, always populated and unique per RadiologyStudy.
* The `External*` fields are **optional** and will be used later when we map to PACS/DICOM (Day 16).
* You must adjust the EF Core entity + configuration + migration so that **the database allows NULL for all `External*` columns** and **requires `AccessionNumber`** instead.

Do **not** add fake default values to `ExternalAccessionNumber`. This must be structurally nullable.

### 3.2 RadiologyImage (preparing for DICOM, minimal for now)

Create/ensure a **RadiologyImage** entity/table to hold references to image assets.
For Day 14.2 we are only preparing the schema; we’re **not** implementing DICOM or real upload logic yet.

Suggested fields:

* `RadiologyImageId` (GUID, PK)
* `RadiologyStudyId` (FK)
* `FilePath` (string, nullable for now if you want)
* `ContentType` (string, e.g. `application/dicom`, `image/png`)
* `StudyInstanceUid` (string, nullable)
* `SeriesInstanceUid` (string, nullable)
* `SopInstanceUid` (string, nullable)
* `CreatedAt`
* `UploadedByUserId` (nullable for now)

For Day 14.2, this table just needs to exist and be wired via EF.
Later (Day 16) we’ll let the DICOM receiver populate it.

---

## 4. Accession number generation rules

You must implement **internal accession numbers** on RadiologyStudy.

Requirements:

1. Generated when the RadiologyStudy is created (see next section).
2. Must be unique per RadiologyStudy.
3. Stable, human-readable pattern (example, you can pick a reasonable format):

   * `RAD-{yyyyMMdd}-{runningNumber}`
   * or `XR-{tokenNumber}-{sequence}`

Keep it **server-side only**; we’ll expose it via DTOs later so that:

* It can be printed on the radiology request slip.
* In the future, it can be typed/scanned into the X-ray / MRI console as the DICOM `AccessionNumber`.

For now, it’s enough that we **store it** and **return it** on API DTOs.

---

## 5. When/how RadiologyStudy should be created

We want radiology to behave like pathology: **once payment is done**, the work moves to the imaging department.

### 5.1 Automatic creation on payment

Update **ReceptionFlowService** (or the relevant payment completion service) so that:

* When `POST /api/v1/reception/complete-payment` is called and succeeds, and the visit’s `dept = "Radiology"` or it has Radiology tests:

  * For each Radiology `VisitTest` (based on TestDefinition.Dept/Modality):

    * If there is no existing `RadiologyStudy` for that VisitTest:

      * Create a new `RadiologyStudy`:

        * Set `VisitId`, `VisitTestId`, `PatientId`, `OrderId` (if present),
        * Set `Modality` from the test definition,
        * Generate an `AccessionNumber`,
        * Set `Status = "PendingImaging"`,
        * Leave **all `External*` fields null**.
      * Save it.

So after a visit is paid, radiology tech should have a study waiting in their queue (status `PendingImaging`).

### 5.2 Manual `create-for-visit` endpoint

You already have:

* `POST /api/v1/radiology/studies/create-for-visit`

Keep this endpoint but make it:

* Idempotent and safe:

  * For each radiology VisitTest in that visit, if a RadiologyStudy exists, don’t duplicate.
  * If not, create new ones (same rules as above).
* It must **also generate `AccessionNumber` and leave `External*` nullable**.
* It’s primarily a **repair utility** now (e.g., if auto creation fails), not the main path.

Fix the current failure by obeying the `AccessionNumber`/`External*` rules above.

---

## 6. Radiology technician flow (backend only)

Update/ensure **RadiologyService** and **RadiologyController** support the following:

### 6.1 Tech worklist

Endpoint:

* `GET /api/v1/radiology/studies/queue?status=PendingImaging&status=ImagingInProgress...`

Behavior:

* Filter by status array.
* Only return **RadiologyStudy** rows where:

  * Status is in the requested set,
  * Belong to active visits,
  * Include patient summary, visit token, order info, modality, accession number.
* **Authorization:** XRayTech and Admin (do not require Receptionist/Admin only).

### 6.2 Update study status

For now, we just need simple status updates:

* e.g. `POST /api/v1/radiology/studies/{id}/set-status`

  * Body: `{ "status": "ImagingCompleted" }`
  * Valid transitions:

    * PendingImaging → ImagingInProgress
    * ImagingInProgress → ImagingCompleted
    * ImagingCompleted → ReadyForReporting

We don’t need ultra-strict state machine logic now, just don’t allow nonsense transitions (like Reported → PendingImaging).

### 6.3 Optional: manual attachments (non-DICOM)

We already have `ReportAttachment` etc.
If any upload endpoints exist for radiology attachments, keep them working but **do not treat them as DICOM**. They are just PDFs/images.

---

## 7. Radiologist flow (backend)

You already have **RadiologyReportsController** and related DTOs.

Ensure:

* `GET /api/v1/radiology/reports/worklist`:

  * Returns studies with Status `ReadyForReporting` or similar.
  * Includes:

    * `RadiologyStudyId`
    * AccessionNumber
    * Patient summary
    * Visit token
    * Test name / modality
    * Current report status.

* `GET /api/v1/radiology/studies/{id}`:

  * Full detail: study info, patient, visit, orders, current report (if any), attachments.

* `POST /api/v1/radiology/reports/draft`:

  * Allows radiologist to create/update a draft report (impression, findings, recommendations).

* `POST /api/v1/radiology/reports/sign`:

  * Marks report as signed.
  * Updates RadiologyStudy status to `Reported`.
  * Triggers the same **DeliveryService** mechanisms as pathology:

    * Generate PDF,
    * Store report record,
    * Optionally create a secure download token and notification.

**Important:** Do **not** depend on any DICOM fields being present yet. All external PACS fields must be allowed to be null.

---

## 8. Auth / roles

Make sure:

* **XRayTech** can:

  * View radiology queue,
  * View specific study details (for their department),
  * Update study status (PendingImaging → ImagingCompleted, etc.),
  * Upload manual attachments (if present).

* **Radiologist** can:

  * View radiology worklist,
  * Open study detail,
  * Draft + sign reports.

* **Receptionist** should **not** be allowed to call radiology queue or status endpoints.

Fix any `[Authorize(Roles = "...")]` mismatches so that:

* No more 403s for legitimate XRayTech/Radiologist usage.

---

## 9. Non-goals for Day 14.2

Do **NOT** implement these now:

* No DICOM C-STORE listener.
* No Cornerstone viewer or DICOMweb integration.
* No calls into external PACS (SciencePACS etc.).
* No real filesystem/DICOM parsing logic (beyond what already exists).

Just:

* Correct schema,
* Correct RadiologyStudy creation,
* Clean status transitions,
* Fully testable API flow via Swagger.

---

## 10. What to output

1. **List of files changed** with a one-line summary each.
2. Updated **entities and DbContext** snippets that show:

   * RadiologyStudy with `AccessionNumber` (non-nullable) and `External*` as nullable.
   * RadiologyImage entity.
3. Any **new migrations** required to:

   * Add `AccessionNumber` column (non-nullable, with sensible default for existing rows if needed).
   * Alter `ExternalSystemName`, `ExternalAccessionNumber`, `ExternalStudyInstanceUid`, `ExternalViewerUrl` to allow NULL.
4. Updated **service methods** in:

   * `ReceptionFlowService` (or equivalent) to auto-create studies on payment.
   * `RadiologyService` for:

     * create-for-visit
     * queue
     * set-status
5. Updated **controller actions**:

   * `RadiologyController`
   * `RadiologyReportsController`
6. A short **test script** (Swagger/Postman sequence) that I can follow, step-by-step, to verify:

   * Reception → start visit (Radiology),
   * Reception → complete payment,
   * Radiology queue shows the new study with AccessionNumber,
   * Status transitions work,
   * Radiologist sees it and can draft/sign report without any DICOM data.

Make sure the code compiles and the database migrations run cleanly with `dotnet ef database update`, and that `POST /api/v1/radiology/studies/create-for-visit` no longer throws the `ExternalAccessionNumber` null insert error.
