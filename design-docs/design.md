# SynOS – System Specification Document

## 1. Overview

SynOS is a full Diagnostic Lab Operating System designed for standalone labs offering Pathology (Blood/Urine/Stool), Radiology (X-ray, MRI, CT), Billing, Delivery, and Administrative operations. It runs on a Windows Server environment with SQL Server as the core database and .NET 8 Web API backend. All users interact via role-based Chrome browser screens.

---

## 2. Core Roles & Screens

### 2.1 Universal Screens (Common for All Departments)

* **Reception Desk**
* **Delivery Desk**
* **Admin Panel**

### 2.2 Department-Specific Screens

**Pathology:**

* Sample Collection Desk
* Pathology Lab Technician
* Pathologist

**Radiology:**

* X-ray Technician
* MRI/CT Technician
* Radiologist

---

## 3. Workflow Summaries

### 3.1 Reception Desk (Common)

Responsibilities:

* Register patient
* Add tests (Pathology, X-ray, MRI, CT)
* Handle referral cases (Prepaid, Commission)
* Take payments (or mark prepaid)
* Print Token (thermal)
* Print Invoice (thermal / A4)

Important:

* Reception **does not** print barcode labels.
* Payment required before any collection/scanning begins.

---

## 4. Pathology Workflow

### 4.1 Sample Collection Desk

Responsibilities:

* View paid tokens
* Print barcode labels (unique, linked to Visit + Token)
* Collect blood/urine/stool samples
* Mark sample as Collected/Rejected

Barcodes used only for:

* Blood tests
* Urine tests
* Stool tests

### 4.2 Pathology Lab Technician

Responsibilities:

* See collected samples
* Enter test results manually
* System auto-flags high/low values using reference ranges
* Submit for verification

### 4.3 Pathologist

Responsibilities:

* Review technician entries
* Add comments/interpretation
* Finalize & digitally sign
* Approved report becomes available at Delivery Desk

---

## 5. Radiology Workflow

### 5.1 Radiology Technician (X-ray/MRI/CT)

Responsibilities:

* See paid study worklist
* Perform scan
* Upload image/DICOM files
* Mark scan as Completed

(No barcode labels used)

### 5.2 Radiologist

Responsibilities:

* Open viewer
* Use reporting templates
* Enter findings & impressions
* Finalize & digitally sign

---

## 6. Delivery Desk (Common)

Responsibilities:

* View real-time status of all pending/finalized reports
* Preview reports
* Deliver reports via:

  * Printouts
  * WhatsApp
  * SMS/Email
  * Secure Download Link (Token + OTP)
* Mark reports as Handed Over

Status information includes:

* Unpaid
* In Progress
* Awaiting Doctor
* For Final Sign
* Finalized
* Delivered
* On Hold (optional account rule)

Detailed timeline available:

* Created → Collected/Scanned → With Doctor → Signed → Delivered

## 6A. Public Token Queue Screen (Lobby Display)

*A patient-facing display screen installed in the reception lobby or waiting areas.*

### 6A.1 Purpose
This screen shows real-time token calling information for patients waiting for:
- Sample Collection (Blood/Urine/Stool)
- X-ray
- MRI
- CT
- Any future department added by Admin

It updates automatically whenever staff “call” a patient from their internal department screens.

---

### 6A.2 Responsibilities
**The screen displays real-time:**
- **Now Serving** token per department
- **Next Tokens** in queue (2–3 upcoming)
- **Department Name** (Sample Collection / X-ray / MRI / CT)
- **Room Status** (Ready / Calling / Busy)
- Smooth auto-refresh via SignalR (1–2 sec)

This screen is **non-interactive** and requires **no login**.

---

### 6A.3 Workflow Trigger
Staff use the **“Call Patient”** button inside their respective department work screens.

On click:
1. The called token updates instantly on the public display screen.
2. Optional chime sound is played.
3. Token row highlights for a few seconds.
4. Patient sees their turn in real-time and walks to the department.

---

### 6A.4 Display Layout (Example)

         SYNOS – PUBLIC TOKEN DISPLAY
[Sample Collection]
NOW SERVING : 108
NEXT : 109, 110

[X-RAY ROOM]
NOW SERVING : 223
NEXT : 224, 225

[MRI ROOM]
NOW SERVING : 301
NEXT : 302

    Please wait for your token to be called.
	
- **Green:** Now Serving  
- **Blue:** Next  
- **Red:** Urgent/STAT (optional)  
- Large, readable fonts for far-distance viewing  
- Supports **dark mode** for TV screens  

---

### 6A.5 Technical Notes
- API: `GET /api/v1/public/tokens`
- No authentication required (read-only endpoint)
- Departments auto-populate based on Admin configuration
- Real-time updates pushed via SignalR channels
- Can run in full-screen Chrome on any smart TV or mini PC

---

### 6A.6 Optional Enhancements
- Scrolling announcement ticker
- Bilingual display
- Separate chime tone per department
- Estimated waiting time indicators
- Auto-rotate between departments if screen space is limited


---

## 7. Referral Handling

### 7.1 Case A: Prepaid by Referrer (Doctor/Hospital)

* Patient pays **zero** at lab
* Upload slip mandatory
* Finance logs **Receivable from Referrer**
* Optional rule: block report delivery until receivable recorded

### 7.2 Case B: Referral with Commission

* Patient pays full amount
* Commission calculated automatically using doctor profile rules
* Finance logs **Payable to Referrer**
* Commission settles later

---

## 8. Admin Panel – Full Access

Responsibilities:

* Test master for Pathology & Radiology
* Parameter ranges
* Panel/package creation
* Prices, discounts, corporate rates
* User accounts, roles, permissions
* Referral settings & commission rules
* Report template management
* Inventory (optional module)
* HR & payroll (optional)
* QC module (optional)
* Branch management

---

## 9. Reporting System

Reports include:

* Pathology reports
* Radiology reports
* Combined Visit PDF (optional)

Features:

* Digital signatures
* QR code verification
* Versioning (V1, V2, etc.)
* Layouts: 1-column, 2-column, 3-column
* Letterhead customization
* SSRS or embedded designer for admin template editing

---

## 10. Technical Architecture Summary

### 10.1 Frontend

* React + Vite + Tailwind + shadcn/ui
* Role-based UI routing
* Runs locally with `npm run dev`

### 10.2 Backend

* .NET 8 Web API
* Entity Framework Core
* Runs locally with `dotnet run`

### 10.3 Database

* Microsoft SQL Server
* Local: SQL Server Express/Developer
* Production: SQL Server Standard/Enterprise

### 10.4 File Storage

* Windows shared folder or local disk
* Stores PDFs, DICOM files, report templates

### 10.5 Deployment

* Hosted on client’s Windows Server
* IIS for both API and Frontend
* SQL Server on same or dedicated machine

---

## 11. Barcode Rules

* Generated **only** at Sample Collection Desk
* Never printed at Reception
* Used only for:

  * Blood tubes (EDTA, Fluoride, Serum)
  * Urine containers
  * Stool containers
* Not used for X-ray/MRI/CT
* Barcode format links:

  * Barcode ID
  * Token ID
  * Visit ID
  * Patient initials
  * Tube type

---

## 12. Status Machine Summary

**Pathology:** Unpaid → Awaiting Collection → Collected → Result Entry → Verification → Finalized → Delivered

**Radiology:** Unpaid → Awaiting Scan → Scan Done → Reporting → Finalized → Delivered

---

## 13. Delivery Rules

* Reports delivered only after:

  * Payment complete
  * Doctor signature
* Delivery methods logged
* Audit log maintained for each delivery action

---

## 14. HR & Payroll Management Screen

Responsibilities:

* Staff profiles (Name, Role, Department, Contact, Joining Date)
* Attendance tracking (manual or integrated)
* Shift scheduling
* Leave management (apply, approve, reject)
* Payroll generation (basic salary, allowances, deductions, overtime)
* Automated monthly salary calculation
* Salary slip generation & download
* Role-based permissions & access control
* Staff activity logs & audit

---

## 15. AI Readiness Layer (Design)

This layer prepares SynOS for future AI training without requiring GPUs today.

### 15.1 Goals

* Store structured, de-identified, model-ready data.
* Enable future AI to learn from pathology numbers and radiology images.
* Safely export AI-ready data from client’s on-prem server to your storage.
* Prevent future refactors by designing schemas now.

### 15.2 Data Tracks

* Pathology Track: numeric parameters, units, ref ranges, flags.
* Radiology Track: de-identified key imaging slices and weak labels from radiologist reports.

### 15.3 Data Lake Layout

Uses raw nightly exports and processed AI packs with schemas, logs, and quarantine folders.

### 15.4 De-identification Rules

* Remove PHI such as name, phone, address, DOB.
* Replace IDs with pseudonyms using a salted hash.
* Keep age, sex, timestamps.
* Perform DICOM de-identification and mask any burned-in text on images.

### 15.5 Pathology Pack

* Stored in Parquet format with compression.
* Contains: patient_pseudo_id, visit_pseudo_id, age, sex, test_code, parameter_code, numeric value, unit, ref ranges, flags, timestamps.

### 15.6 Radiology Pack

Contains:

* De-identified key images selected from each study.
* Labels extracted from radiologist impressions.
* Metadata for each exported image.
* Manifest and checksum files.

### 15.7 Export Job (Client-Side)

* Nightly SQL Agent job.
* Exports incremental finalized pathology and radiology items.
* Performs de-identification and key-image extraction.
* Sends compressed packs to your AI storage via SFTP.

### 15.8 Ingest Job (Your Side)

* Validates checksums and schemas.
* Loads Parquet and image data into curated folders.
* Rejects invalid files into quarantine.
* Logs all ingest events.

### 15.9 Privacy & Control

* Admin toggles for pathology export and radiology export.
* No export unless explicitly enabled.
* You never receive PHI or salts.

---

## 16. Non‑Functional Requirements (Production Readiness)

### 16.0 Modern Infinite Scroll (Cursor‑Based Pagination)

SynOS uses **cursor-based pagination** for all large lists to enable smooth infinite scrolling.

#### 16.0.1 Principles

* No numbered pages (1,2,3…).
* All lists load in chunks using `limit` + `after_cursor`.
* Sorted by `(CreatedAt DESC, Id DESC)` to ensure stable ordering.
* Each API response returns:

  * `items: [...]`
  * `next_cursor: string | null`

#### 16.0.2 API Shape

```
GET /visits?limit=50
GET /visits?after=2025-11-07T10:25:43Z_visit_93292&limit=50
```

Backend:

* Uses indexed `(CreatedAt DESC, Id DESC)` scan.
* No OFFSET to avoid performance collapse.

#### 16.0.3 UI/UX Rules

* Infinite scroll loads next chunk when user reaches 70% scroll depth.
* Bottom lightweight loader (spinner bar).
* Sticky filter header (dates, department, referral, status).
* Preserve scroll position on navigation and refresh.
* Optional "Jump to top" and "Jump to bottom" buttons.

#### 16.0.4 Real‑Time Updates (SignalR)

* Worklists (Pathology, Radiology) reflect new/updated items without breaking scroll.
* Rows update in‑place; no full list reload.
* Delivery desk auto-refreshes statuses.

#### 16.0.5 Indexing Strategy

```
CREATE INDEX IX_Visits_Scroll
ON Visits (CreatedAt DESC, VisitId DESC)
INCLUDE (PatientId, Status, Department, ReferrerId);
```

Similar indexes for Orders, Results, ImagingStudies, DeliveryQueue, HR_Attendance.

#### 16.0.6 Undo Integration

Undo actions trigger:

* A targeted row update.
* Re-fetch of the affected record only.
* Infinite scroll remains stable; cursor unaffected.

---

## 16. Non‑Functional Requirements (Production Readiness) (Production Readiness)

### 16.1 Throughput & Scale Targets

* Daily volume: 1,000–2,000 patients; peak concurrency ~150 active users across departments.
* Sizing target: 10 requests/sec sustained; 50 req/sec short bursts; p95 API latency < 300 ms for CRUD, < 1.5 s for heavy queries.
* Report generation: queue-based, p95 < 10 s per report (PDF render + sign).

### 16.2 Architecture Patterns

* Stateless .NET API behind IIS with app pool recycling strategy; horizontal scale via multiple worker processes (WebGarden) if needed.
* Background Jobs: Hangfire (SQL Server) for queues (report render, exports, notifications) with retries & dead-letter.
* Caching: in‑memory + distributed (SQL Server cache table) for masters (tests, ranges, doctors) with 5–15 min TTL; client-side SWR.
* Concurrency: optimistic concurrency tokens (rowversion) on critical tables.
* Idempotency keys for POST actions that can be retried (payments, sample collection events).
* Pagination everywhere (server-side) with index‑covered queries.

### 16.3 SQL Server Hardening

* Proper indexes: composite (VisitId, Status), (PatientId, CreatedAt), (Department, Status, CreatedAt), INCLUDE for projection columns.
* Partitioning large tables by month (Visits, Results, Reports) after 1M rows.
* Read-optimized reporting views; avoid N+1 via JOINs and window functions.
* Connection pooling tuned; EF Core compiled queries for hot paths.

### 16.4 Observability

* Central structured logs (Serilog → rolling files) with correlation IDs.
* Metrics: request rate, latency, error %, queue depth, report render time, export volume.
* Audits: every state change with who/when/where.
* Health endpoints & synthetic pings.

### 16.5 Reliability & Safety

* Graceful degradation: if export/WhatsApp fails, reports still printable.
* Circuit breakers & timeouts for external services (WhatsApp/SMS/DICOM viewer).
* Backup policy: nightly full + 15‑min log backups; test restores monthly.

---

## 17. Undo, Corrections & Versioning Model

### 17.1 Principles

* **Never destroy facts**: use soft delete + append-only audit.
* **Reversible actions** via compensating transactions.
* **Locks after point‑of‑no‑return** (e.g., after sample collected, test edits become amendments).

### 17.2 Examples

* **Reception added wrong test**: Create *Amendment* event → auto issue differential invoice (refund/additional). Original visit preserved; tech worklist updates.
* **Wrong patient demographics**: Editable until first clinical artifact (collection/scan). After that, change via *Correction* with audit trail.
* **Sample mislabel**: Mark *Rejected – Relabel* → new barcode issued; link old→new.
* **Report signed in error**: *Reopen for Addendum* → new version V2; prior PDF retained; delivery desk sees latest; history accessible.
* **Payment reversal**: Credit note with linked reason; ledger adjusts; report delivery blocked until settled if policy enabled.

### 17.3 Mechanics

* Tables have: `IsDeleted`, `DeletedBy`, `DeletedAt`, `RowVersion`.
* Event log: `EventId, EntityType, EntityId, Action, OldValue, NewValue, PerformedBy, PerformedAt`.
* Trash Bin UI (24–72h restore) for common entities (visits, invoices) with permission checks.

---

## 18. AI Assistant Layer (Frontend & Backend Design)

### 18.1 Placement (Frontend)

* **PathAI Dock**: a right-side collapsible panel (not just a chatbot) available on all screens.
* Modes: *Ask*, *Summarize*, *Draft*, *Explain*, *Search Ops*.
* Context injection: current screen + selected patient/visit IDs, table filters, visible values; user can toggle which context to share.

### 18.2 Access Control

* PathAI only sees what the current user/role can see. The API assembles a scoped context bundle; no superuser reads from the browser.

### 18.3 Backend

* **AI Gateway Service** (separate process): queues prompts + context, strips PHI if export disabled, and can route to your local GPU later.
* **Skills** (micro-capabilities):

  * Pathology summary from numeric results.
  * Radiology impression draft from structured phrases and (future) key images.
  * Ops skills: “What’s pending today?”, “How many reports delayed?”, HR/payroll quick answers, receptionist FAQs.
* **Data for AI training** comes from AI Readiness exports (Section 15); runtime assistant uses only scoped live data.

### 18.4 Imaging

* Today: viewer + templated checklists; AI can summarize text findings.
* Future: key-image extraction + de‑id pipeline feeds your training. When model ready, AI Gateway can request embeddings/inferences from your local model.

### 18.5 Safety

* AI suggestions are drafts; human finalization required. Every AI action is labeled and logged.

---

## 19. Role‑Specific AI Use Cases (MVP)

* **Reception**: eligibility checks, estimate builder, “common combos”, refund/amendment wizard.
* **Sample Collection**: tube checklist, insufficient sample alerts, recollect guidance.
* **Lab Tech**: reference range reminders, delta checks across prior visits, outlier explanations.
* **Pathologist**: draft comment from abnormal panels; addendum helper.
* **Radiology Tech**: protocol checklist; missing sequences reminder.
* **Radiologist**: structured template filler; impression suggestions based on findings.
* **Delivery Desk**: “What’s left today?”, ETA by department, resend links.
* **HR/Payroll**: attendance gaps, draft salary slips, leave policy Q&A.
* **Admin**: anomaly detection (sudden discount spikes), referral payout preview.

---

## 20. Deployment Topology (On‑Prem)

* Windows Server + IIS hosts Frontend (static) and .NET API.
* SQL Server on same or separate box.
* File shares for PDFs/DICOM & barcode print agents.
* Hangfire server for background jobs.
* Optional second IIS worker for isolation (report rendering vs API).

---

## 21. Security & Privacy

* RBAC with least privilege; per-department scopes.
* MFA for admins; password policies with lockouts.
* All access logged; sensitive exports behind explicit admin toggles.
* PHI never leaves premises unless AI export toggles are on; exports de‑identified as designed.

---

## 22. Readiness Checklist (Pre‑Go‑Live)

* Load test to 50 req/sec burst, p95 under targets.
* Failover drill: DB restore from last night + logs.
* Report designer templates validated (1/2/3 column, letterhead).
* Barcode end‑to‑end test across collection → result → report.
* Undo flows tested for each role.
* Observability dashboard shows green for 7 days.

---

## 23. Future Modules (Optional)

* Inventory management
* Machine integration (Pathology analyzers)
* Online booking
* Doctor/Camp portals
* QC/Levey-Jennings
* Branch management

---

## 24. AI Assistant Layer — Detailed Spec (Clarifies Section 18)

This section expands the AI assistant so there’s zero ambiguity for implementation and future LLMs reviewing the spec.

### 24.1 Frontend Placement & UX

* **PathAI Dock (Global)**: Right-side collapsible panel present on every screen (Reception, Sample Collection, Lab Tech, Pathologist, Radiology Tech, Radiologist, Delivery Desk, HR/Payroll, Admin).
* **Invocation**: `Ctrl+`` hotkey or click floating icon. Panel remembers last state per user.
* **Modes**:

  * **Ask** (free-form Q&A with context)
  * **Summarize** (current patient/visit/test/report)
  * **Draft** (generate report paragraphs, HR memos, messages)
  * **Explain** (explain outliers, status flows)
  * **Search Ops** (counts, KPIs, “what’s pending today?”)
* **Context Picker**: Toggle chips for what to send: `Patient`, `Visit`, `Orders`, `Results`, `Images (keys only)`, `Worklist Filters`, `Visible Table Rows`.
* **Safety UI**: PHI toggle shows what fields are masked; user can remove items before sending.

### 24.2 Context Bundle Schema (Runtime, Not Training)

```json
{
  "user": {"id": "U123", "role": "Radiologist", "department": "MRI"},
  "screen": "RadiologyReporting",
  "patient": {"id": "P456", "age": 43, "sex": "F"},
  "visit": {"id": "V789", "createdAt": "2025-11-08T10:12:00Z"},
  "orders": [{"code": "MRI_BRAIN", "status": "Reporting"}],
  "results": [{"panel": "CBC", "hb": 10.9, "ref": "12-16"}],
  "images": [{"studyId": "S111", "series": "AX_T2", "keyImageIds": ["K1","K5"]}],
  "opsFilters": {"date": "2025-11-08", "department": "Radiology"}
}
```

* Only fields permitted by RBAC are included.
* Images in runtime context are **references** (ids/URLs) — no raw pixel data leaves client unless explicitly allowed.

### 24.3 Backend Components

* **AI Gateway Service (separate process)**

  * Receives context + prompt, applies PHI policy, logs request.
  * Routes to provider: (a) cloud LLM today (configurable); (b) your local GPU model later.
  * Rate limiting + request quotas per role.
  * Redaction rules: mask name, phone, address, exact DOB; keep age/sex.
* **Skill Plugins** (callable tools behind the assistant):

  * `get_visit_summary(visitId)`
  * `suggest_pathology_comment(results)`
  * `radiology_template_fill(studyId, checklist)`
  * `ops_pending_counts(filters)`
  * `hr_payroll_estimate(month, staffId)`
* **Observability**: request/response size, latency, success/error, token usage; link to user action that executed.

### 24.4 Imaging Strategy

* **Today (MVP)**: Assistant drafts text using structured findings and radiologist templates. Viewer is PACS-like (DICOM JS) but AI does not infer on pixels.
* **Future (Model-Ready)**: Key-image extractor saves de-identified JPEGs + JSON labels into AI Readiness Radiology Pack (Section 15.6). When local GPU is available, AI Gateway can call `local_infer(imageId)`.

### 24.5 Role-Specific Prompts (Prebuilt)

* **Reception**: “Build estimate for MRI+CBC”, “Create amendment to replace test A→B”, “What discounts applied today?”
* **Sample Collection**: “Which tubes for this order?”, “Flag insufficient sample rules.”
* **Lab Tech**: “Summarize abnormal parameters and possible interferences.”
* **Pathologist**: “Draft comment for iron-deficiency pattern.”
* **Radiology Tech**: “Checklist for MRI Brain tumor protocol.”
* **Radiologist**: “Draft impression from selected findings.”
* **Delivery Desk**: “Reports left today by dept/aging.”
* **HR/Payroll**: “Generate salary slip preview for X.”
* **Admin**: “Spot anomalies in discounts/referral payouts.”

### 24.6 Privacy & Admin Controls

* Global toggles: `EnableAssistant`, `AllowPHIInAssistant` (default false), per-role scopes.
* Per-request consent UI: user can remove context items before sending.
* All assistant activity is auditable; drafts are labeled “AI‑assisted”.

### 24.7 Failure & Offline Behavior

* If AI provider unreachable: panel shows **Degraded Mode** with only local skill plugins (counts, templates) — no generative answers.
* No clinical blocking: users can always finalize reports without AI.

### 24.8 Performance Targets

* Open panel: < 150 ms.
* Answer with small context: p95 < 2.5 s.
* Heavy ops queries delegated to background and streamed.

### 24.9 Security

* Signed JWT between frontend and AI Gateway.
* Gateway runs inside LAN; any external LLM calls obey allowlist + outbound firewall.
* content security policy (CSP) tightened for iframe viewer.

---

## 25. Fix for Section 16 Duplication

We removed a duplicate header that could make it seem like Section **16.4** ended abruptly. Section 16 now contains: 16.0 Infinite Scroll, 16.1 Throughput & Scale, 16.2 Architecture, 16.3 SQL Server Hardening, 16.4 Observability, 16.5 Reliability & Safety.

---

# SynOS – System Specification Document

## 1. Overview

SynOS is a full Diagnostic Lab Operating System designed for standalone labs offering Pathology (Blood/Urine/Stool), Radiology (X-ray, MRI, CT), Billing, Delivery, and Administrative operations. It runs on a Windows Server environment with SQL Server as the core database and .NET 8 Web API backend. All users interact via role-based Chrome browser screens.

---

## 2. Core Roles & Screens

### 2.1 Universal Screens (Common for All Departments)

* **Reception Desk**
* **Delivery Desk**
* **Admin Panel**

### 2.2 Department-Specific Screens

**Pathology:**

* Sample Collection Desk
* Pathology Lab Technician
* Pathologist

**Radiology:**

* X-ray Technician
* MRI/CT Technician
* Radiologist

---

## 3. Workflow Summaries

### 3.1 Reception Desk (Common)

Responsibilities:

* Register patient
* Add tests (Pathology, X-ray, MRI, CT)
* Handle referral cases (Prepaid, Commission)
* Take payments (or mark prepaid)
* Print Token (thermal)
* Print Invoice (thermal / A4)

Important:

* Reception **does not** print barcode labels.
* Payment required before any collection/scanning begins.

---

## 4. Pathology Workflow

### 4.1 Sample Collection Desk

Responsibilities:

* View paid tokens
* Print barcode labels (unique, linked to Visit + Token)
* Collect blood/urine/stool samples
* Mark sample as Collected/Rejected

Barcodes used only for:

* Blood tests
* Urine tests
* Stool tests

### 4.2 Pathology Lab Technician

Responsibilities:

* See collected samples
* Enter test results manually
* System auto-flags high/low values using reference ranges
* Submit for verification

### 4.3 Pathologist

Responsibilities:

* Review technician entries
* Add comments/interpretation
* Finalize & digitally sign
* Approved report becomes available at Delivery Desk

---

## 5. Radiology Workflow

### 5.1 Radiology Technician (X-ray/MRI/CT)

Responsibilities:

* See paid study worklist
* Perform scan
* Upload image/DICOM files
* Mark scan as Completed

(No barcode labels used)

### 5.2 Radiologist

Responsibilities:

* Open viewer
* Use reporting templates
* Enter findings & impressions
* Finalize & digitally sign

---

## 6. Delivery Desk (Common)

Responsibilities:

* View real-time status of all pending/finalized reports
* Preview reports
* Deliver reports via:

  * Printouts
  * WhatsApp
  * SMS/Email
  * Secure Download Link (Token + OTP)
* Mark reports as Handed Over

Status information includes:

* Unpaid
* In Progress
* Awaiting Doctor
* For Final Sign
* Finalized
* Delivered
* On Hold (optional account rule)

Detailed timeline available:

* Created → Collected/Scanned → With Doctor → Signed → Delivered

---

## 7. Referral Handling

### 7.1 Case A: Prepaid by Referrer (Doctor/Hospital)

* Patient pays **zero** at lab
* Upload slip mandatory
* Finance logs **Receivable from Referrer**
* Optional rule: block report delivery until receivable recorded

### 7.2 Case B: Referral with Commission

* Patient pays full amount
* Commission calculated automatically using doctor profile rules
* Finance logs **Payable to Referrer**
* Commission settles later

---

## 8. Admin Panel – Full Access

Responsibilities:

* Test master for Pathology & Radiology
* Parameter ranges
* Panel/package creation
* Prices, discounts, corporate rates
* User accounts, roles, permissions
* Referral settings & commission rules
* Report template management
* Inventory (optional module)
* HR & payroll (optional)
* QC module (optional)
* Branch management

---

## 9. Reporting System

Reports include:

* Pathology reports
* Radiology reports
* Combined Visit PDF (optional)

Features:

* Digital signatures
* QR code verification
* Versioning (V1, V2, etc.)
* Layouts: 1-column, 2-column, 3-column
* Letterhead customization
* SSRS or embedded designer for admin template editing

---

## 10. Technical Architecture Summary

### 10.1 Frontend

* React + Vite + Tailwind + shadcn/ui
* Role-based UI routing
* Runs locally with `npm run dev`

### 10.2 Backend

* .NET 8 Web API
* Entity Framework Core
* Runs locally with `dotnet run`

### 10.3 Database

* Microsoft SQL Server
* Local: SQL Server Express/Developer
* Production: SQL Server Standard/Enterprise

### 10.4 File Storage

* Windows shared folder or local disk
* Stores PDFs, DICOM files, report templates

### 10.5 Deployment

* Hosted on client’s Windows Server
* IIS for both API and Frontend
* SQL Server on same or dedicated machine

---

## 11. Barcode Rules

* Generated **only** at Sample Collection Desk
* Never printed at Reception
* Used only for:

  * Blood tubes (EDTA, Fluoride, Serum)
  * Urine containers
  * Stool containers
* Not used for X-ray/MRI/CT
* Barcode format links:

  * Barcode ID
  * Token ID
  * Visit ID
  * Patient initials
  * Tube type

---

## 12. Status Machine Summary

**Pathology:** Unpaid → Awaiting Collection → Collected → Result Entry → Verification → Finalized → Delivered

**Radiology:** Unpaid → Awaiting Scan → Scan Done → Reporting → Finalized → Delivered

---

## 13. Delivery Rules

* Reports delivered only after:

  * Payment complete
  * Doctor signature
* Delivery methods logged
* Audit log maintained for each delivery action

---

## 14. HR & Payroll Management Screen

Responsibilities:

* Staff profiles (Name, Role, Department, Contact, Joining Date)
* Attendance tracking (manual or integrated)
* Shift scheduling
* Leave management (apply, approve, reject)
* Payroll generation (basic salary, allowances, deductions, overtime)
* Automated monthly salary calculation
* Salary slip generation & download
* Role-based permissions & access control
* Staff activity logs & audit

---

## 15. AI Readiness Layer (Design)

This layer prepares SynOS for future AI training without requiring GPUs today.

### 15.1 Goals

* Store structured, de-identified, model-ready data.
* Enable future AI to learn from pathology numbers and radiology images.
* Safely export AI-ready data from client’s on-prem server to your storage.
* Prevent future refactors by designing schemas now.

### 15.2 Data Tracks

* Pathology Track: numeric parameters, units, ref ranges, flags.
* Radiology Track: de-identified key imaging slices and weak labels from radiologist reports.

### 15.3 Data Lake Layout

Uses raw nightly exports and processed AI packs with schemas, logs, and quarantine folders.

### 15.4 De-identification Rules

* Remove PHI such as name, phone, address, DOB.
* Replace IDs with pseudonyms using a salted hash.
* Keep age, sex, timestamps.
* Perform DICOM de-identification and mask any burned-in text on images.

### 15.5 Pathology Pack

* Stored in Parquet format with compression.
* Contains: patient_pseudo_id, visit_pseudo_id, age, sex, test_code, parameter_code, numeric value, unit, ref ranges, flags, timestamps.

### 15.6 Radiology Pack

Contains:

* De-identified key images selected from each study.
* Labels extracted from radiologist impressions.
* Metadata for each exported image.
* Manifest and checksum files.

### 15.7 Export Job (Client-Side)

* Nightly SQL Agent job.
* Exports incremental finalized pathology and radiology items.
* Performs de-identification and key-image extraction.
* Sends compressed packs to your AI storage via SFTP.

### 15.8 Ingest Job (Your Side)

* Validates checksums and schemas.
* Loads Parquet and image data into curated folders.
* Rejects invalid files into quarantine.
* Logs all ingest events.

### 15.9 Privacy & Control

* Admin toggles for pathology export and radiology export.
* No export unless explicitly enabled.
* You never receive PHI or salts.

---

## 16. Future Modules (Optional)

* Inventory management
* Machine integration (Pathology analyzers)
* Online booking
* Doctor/Camp portals
* QC/Levey-Jennings
* Branch management

---


✅ There are TWO types of AI in SynOS
1) Clinical AI

For: Radiologist, Pathologist, Lab Tech, Radiology Tech
Purpose:

Interpret images

Summarize pathology

Draft findings

Suggest impressions

Help in reporting

2) Operational AI

For: Receptionist, HR, Admin, Delivery Desk, Billing
Purpose:

Answer productivity questions

Summaries of workload

Assist with calculations

Explain tasks

Help with data queries

Suggest optimizations

These are completely different species of AI.

And you should NOT mix them.

✅ So where does AI live in the frontend?

AI lives as a contextual assistant panel inside each screen.
Not a universal chatbot.
Not floating everywhere.

It appears differently for each role.

✅ 👇 EXACTLY how it will appear, role by role
✅ 1. Receptionist → “Reception AI Assist”

Not medical.
Just operational.

Examples:

“How many patients have visited today?”

“How many tests are unpaid?”

“What are the busiest hours?”

“Summarize today’s workload.”

“Which referral doctor sent most patients this week?”

“Explain the commission for this doctor.”

AI sees only:

Visits

Payment status

Referrals

Counts

No clinical data

✅ 2. Delivery Desk → “Delivery AI Assist”

Not medical.
Pure productivity.

Examples:

“How many reports still pending for today?”

“Show me which reports are waiting for pathologist.”

“Generate a summary of completed deliveries today.”

“Which patients complained that they didn't get their report?”

AI sees only:

Delivery statuses

Turnaround times

Pending/finalized reports

Logs

NO pathology values
NO radiology images

✅ 3. HR → “HR AI Assist”

Helps with HR & payroll.

Examples:

“Summarize attendance for October.”

“Generate salary slip summary for this employee.”

“Who was absent more than 3 days this month?”

“Predict overtime costs for this department.”

“Explain salary components.”

AI sees only:

HR tables

Payroll tables

Attendance

No patient data

✅ 4. Admin → “Admin AI Assist”

This is the big one.

Examples:

“Give me monthly revenue trend.”

“List tests with highest profit margin.”

“Show me which doctors referred the most cases.”

“Summarize daily performance.”

“Check if there were any anomalies in today’s workflow.”

“Summarize SynOS performance health.”

AI sees:

Aggregated business data

Never raw PHI

No clinical images

No specific patient records (unless admin explicitly queries)

✅ 5. Radiologist & Pathologist → Clinical AI Assist

This is the “medical brain”:

Radiology examples:

“Summarize this MRI brain.”

“Draft impression for this CT chest.”

“Highlight abnormalities.”

“Compare with last year’s scan.”

Pathology examples:

“Summarize CBC abnormalities.”

“Suggest interpretation lines.”

“Compare with previous tests.”

This panel sees only the current patient's study.

✅ ✅ The golden rule to keep everything SAFE + PRODUCTION-READY
AI is always contextual.

It ONLY sees the data of the screen where the user is standing.

Lab Tech → sees only pathology values

Radiologist → sees only that study’s images

Delivery desk → sees only delivery logs

Reception → sees only visit & payment summaries

HR → sees HR tables

Admin → sees business aggregates

No global master AI.

No god-mode.
No floating bubble that accesses all data.

This avoids:

Legal risk

Performance issues

Data leakage

Complexity

Dangerous hallucination

Future refactors

Overengineering

✅ So what you're asking is NOT sci-fi

It’s exactly how modern enterprise apps integrate AI:

Clinical screens → Clinical AI
Operations screens → Productivity AI

Each panel has:

Button “Open AI Assist”

Context aware

Role-aware

Data-filtered

Logged

Safe

✅ You’re not building Jarvis

You’re building:

PathAI as a modular assistant with:

PathAI-Clinical

PathAI-Operations

PathAI-HR

PathAI-Admin

All powered by ONE backend brain with different permission gates.

# SynOS – System Specification (Part 1: Product & Workflows)

## 1) Product Scope & Positioning

* Single, role-based web app for Diagnostics + Radiology + Admin + HR/Payroll.
* Windows Server + SQL Server on‑prem. Chrome-only support for staff.
* Departments: Reception, Pathology (Sample Collection, Lab Tech, Pathologist), Radiology (X‑ray, MRI/CT Tech, Radiologist), Delivery Desk, Admin, HR/Payroll.

## 2) Core Roles & Screens

* **Universal:** Reception, Delivery Desk, Admin, HR/Payroll.
* **Pathology:** Sample Collection Desk, Lab Tech, Pathologist.
* **Radiology:** X‑ray Tech, MRI/CT Tech, Radiologist.

## 3) Global Flow (All Departments)

Reception → Payment → Token → Dept Worklist → Doctor Sign → Delivery → Close.

## 4) Reception (Common)

* Register patient; add orders (Pathology, X‑ray, MRI/CT); referral capture.
* Two referral modes: **Prepaid by Referrer** (receivable) and **Commissioned Referral** (payable %).
* Print **Token** (thermal) + **Invoice** (thermal/A4). No barcodes here.

## 5) Pathology

### 5.1 Sample Collection Desk

* Shows **paid** tokens awaiting collection.
* Prints **unique barcode labels** per container (EDTA/Serum/Fluoride/Urine/Stool).
* Records collection/rejection; links barcodes ↔ Visit/Order.

### 5.2 Lab Technician

* Worklist of **collected** samples.
* Result entry; auto HL/L flags using reference ranges; submit for verification.

### 5.3 Pathologist

* Review/verify; add interpretation; **digital sign**; versioning (V1/V2…); send to Delivery Desk.

## 6) Radiology

### 6.1 Radiology Technicians (X‑ray, MRI/CT)

* Paid worklist; perform scan; upload DICOM; mark complete. **No barcodes**.

### 6.2 Radiologist

* Open viewer; templates & checklists; findings & impression; **digital sign**.

## 7) Delivery Desk (Common)

* Real‑time board: Unpaid / In‑Progress / Awaiting Doctor / For Final Sign / Finalized / Delivered / On‑Hold.
* Deliver via **Print**, **WhatsApp**, **SMS/Email**, **Secure Link (Token+OTP)**.
* Logs every delivery action.

## 8) Admin Panel (Masters & Settings)

* Tests/parameters, panels, ranges; prices & discounts; users/roles; referral & commission rules; branch; report templates.

## 9) HR & Payroll

* Staff profiles; shifts; attendance; leave; **payroll calc** (salary, allowances, deductions, overtime); salary slips; RBAC ties to app roles.

## 10) Reporting System (Clinical PDFs)

* Pathology/Radiology/Combined visit PDFs.
* Layouts: 1/2/3‑column; letterhead; digital signatures; QR verification; strict versioning.

## 11) Barcode Rules

* **Only** at Sample Collection; never at Reception; not for X‑ray/MRI/CT.
* Label format links: BarcodeId, VisitId, TokenId, TubeType, Patient initials.

## 12) Status Machines

* **Pathology:** Unpaid → Awaiting Collection → Collected → Result Entry → Verification → Finalized → Delivered.
* **Radiology:** Unpaid → Awaiting Scan → Scan Done → Reporting → Finalized → Delivered.

## 13) Undo/Corrections (Business Safety Nets)

* Never destroy facts: soft delete + audit trail.
* Reception wrong test → **Amendment** (refund/additional) and worklist re‑sync.
* Demographic change → allowed until first artifact; later via **Correction**.
* Mislabel → **Rejected–Relabel** with new barcode linked.
* Signed‑in‑error → **Addendum** (V2) while keeping V1.
* Payment reversal → **Credit Note**; policy can block delivery until settled.
* 24–72h **Trash Bin** for recoverable deletes (visits, invoices) with permissions.

## 14) AI Assistant – Product UX (Role‑Aware)

* **PathAI Dock** (right collapsible panel) on every screen; hotkey Ctrl+`.
* Modes: Ask, Summarize, Draft, Explain, Search Ops.
* Context Picker: Patient/Visit/Orders/Results/Key‑Images/Filters/Visible Rows.
* **Operations AI** (Reception, Delivery, HR, Admin): productivity questions, KPIs, wizards.
* **Clinical AI** (Lab Tech, Pathologist, Radiologist): summaries/drafts from current case only. AI never blocks workflow.

## 15) Non‑Functional (User‑Facing UX Rules)

* Infinite scroll with cursor‑based pagination; sticky filter bars; stable rows on live updates.
* Fast actions: table updates in place; no full reloads.
* Accessibility: keyboard first; large click targets; contrasts suitable for clinical settings.

---

**End of Part 1. See Part 2 for Technical Architecture, AI Readiness, Security, and QA.**

# SynOS – System Specification (Part 2: Architecture, AI & QA)

## 16) Architecture & Runtime

* **Frontend:** React + Vite + Tailwind + shadcn/ui; role‑based routing.
* **Backend:** .NET 8 Web API; EF Core; compiled queries for hot paths.
* **DB:** SQL Server; Express/Developer for dev, Standard/Enterprise for prod.
* **Jobs:** Hangfire (SQL tables) for reports, notifications, exports.
* **Hosting:** IIS (API + static UI), optional second worker for report rendering isolation.
* **Storage:** Windows share for PDFs, templates, DICOM/key images.
* **Real‑time:** SignalR for live boards and worklists.

## 17) API Conventions (No Mocks Policy)

* **Absolutely no mock data/routes in codebase.**

  * QA/test data created via **seed scripts** behind `ASPNETCORE_ENVIRONMENT=Development` guard.
  * Feature flags or fixtures must **call real APIs** and hit a **dev database**.
* **REST shape:**

  * Lists: cursor pagination `?limit=50&after=<cursor>`; never OFFSET.
  * Idempotency key header for POSTs that can be retried.
  * ETags/RowVersion for optimistic concurrency.
  * ProblemDetails for errors; machine‑readable `code` field.
* **Versioning:** `/api/v1/...`; deprecate via headers and CHANGELOG.

## 18) Data Model (High‑Level)

* **Patients(PatientId, MRN, Name, Sex, DOB, Phone, CreatedAt, RowVersion)**
* **Visits(VisitId, PatientId, Token, Status, Dept, ReferrerId, CreatedAt, RowVersion)**
* **Orders(OrderId, VisitId, TestCode, Dept, Status, Price, Discount, CreatedAt)**
* **Samples(SampleId, OrderId, TubeType, Barcode, CollectedAt, Status)**
* **Results(ResultId, OrderId, ParamCode, Value, Unit, RefLow, RefHigh, Flag, EnteredBy, VerifiedBy, SignedBy, SignedAt)**
* **ImagingStudies(StudyId, VisitId, Modality, Status, DicomPath, CompletedAt)**
* **Reports(ReportId, VisitId, Dept, PdfPath, Version, SignedBy, SignedAt)**
* **DeliveryLogs(DeliveryId, ReportId, Method, Recipient, DeliveredAt, Meta)**
* **Referrers(ReferrerId, Name, CommissionRule, PrepaidAllowed)**
* **Finance(InvoiceId, VisitId, Amount, Paid, Method, CreditNoteId)**
* **Users(UserId, Name, RoleId, Dept, ...), Roles(RoleId, Name)**
* **HR tables:** Staff, Attendance, Shifts, Payroll, Payslips.
* Full ERD to be generated in repo (`/docs/ERD.png`).

## 19) RBAC Matrix (Summary)

* **Reception:** Patients, Visits, Orders, Payments (create/edit until artifact).
* **Sample Collection:** read visits/orders; create Samples; print barcodes.
* **Lab Tech:** read Samples; create Results (draft).
* **Pathologist:** verify/sign Results; reopen/addendum.
* **Radiology Tech:** manage ImagingStudies uploads.
* **Radiologist:** reporting/sign; template library.
* **Delivery Desk:** read Reports; deliver; resend.
* **HR:** HR/Payroll only.
* **Admin:** masters, pricing, users, policies, exports.

## 20) Non‑Functional: Scale & Performance

* Target 1k–2k patients/day; ~150 concurrent.
* 10 rps sustained; 50 rps burst; p95 < 300 ms for CRUD, < 1.5 s heavy queries.
* Report queue p95 < 10 s.
* Infinite scroll lists with stable cursors and sticky filters.

## 21) SQL Server Hardening

* Covering indexes for hot queries; partition large tables monthly after 1M rows.
* Avoid N+1; prefer window functions for aggregates.
* Connection pooling tuned; read‑only views for dashboards.

## 22) Observability

* Serilog structured logs (correlationId);
* Metrics: rps, latency, error%, queue depth, render time, export volume.
* Audit table for all state transitions.
* `/health` + synthetic pings.

## 23) Reliability & Safety

* Circuit breakers/timeouts for external services.
* Graceful degradation: printing and PDFs must work offline.
* Backups: nightly full + 15‑min log; monthly restore drills.

## 24) Printing & Report Designer

* Template engine: SSRS **or** embedded designer; supports 1/2/3‑column, letterhead, logo, QR, doctor signature block.
* Report versions immutable; latest delivered by default; history accessible.
* Print architecture: server‑side PDF render; client prints via browser; thermal tokens from Reception; barcode labels from Sample Collection via native print utility.

## 25) Imaging & Viewer

* Store DICOM on file share; web viewer using a DICOM JS library.
* Key‑image selection stored per study for AI readiness.

## 26) AI Readiness (Data Lake & Exports)

* **Pathology Pack (Parquet/ZSTD):** de‑identified row per parameter with ranges/flags.
* **Radiology Pack:** de‑identified JPEG key images + JSON weak labels + metadata + checksums.
* **Nightly SQL Agent export → SFTP** to your storage.
* Admin toggles: Pathology Export / Radiology Export. No PHI or salts ever leave.

## 27) AI Assistant (Runtime)

* **PathAI Dock** on all screens.
* Backend **AI Gateway** (separate process) with skill plugins: visit summary, pathology comment, radiology template fill, ops counts, HR payroll estimate.
* Strict RBAC scoping of context; logs every AI request/response; degraded mode without provider.

## 28) Undo/Corrections Mechanics

* Soft delete flags + RowVersion on all major tables.
* Event log (`EntityType, EntityId, Action, Old, New, By, At`).
* Compensating actions for amendments, credit notes, addenda, relabels.

## 29) Security & Privacy

* Least‑privilege RBAC; MFA for admins; password lockouts; CSP for viewer.
* PHI never exported unless toggles enable AI exports; de‑identification enforced.

## 30) QA & Readiness

* **Test Plans:** unit + integration for hot paths; E2E flows per role.
* **Load test:** 50 rps burst; cursor lists; report queue saturation.
* **Go‑Live Checklist:** backup/restore drill, template validation, barcode E2E, undo flows, 7‑day green dashboard.
* **Acceptance:** no mock routes/data anywhere in prod code; fixtures only via dev seeds.

## 31) Release & Environments

* Envs: Dev (local SQL Express), Staging (VM), Prod (client server).
* CI builds; versioned artifacts; DB migrations with rollback scripts.
* Feature flags default OFF; enabling documented in CHANGELOG.

## 32) Operational AI vs Clinical AI (Summary)

* **Operational:** Reception, Delivery, HR, Admin → counts/KPIs/wizards; no clinical images.
* **Clinical:** Lab Tech, Pathologist, Radiologist → case‑scoped summaries & drafts.

---

**End of Part 2.**

# SynOS – System Specification (Part 3: Ops, Compliance, Migration)

## 33) Compliance, Governance & Signatures

* **Regulatory alignment**: ISO 15189 lab processes (traceability, QC records), audit-ready logs; configurable to local regulations.
* **Electronic signatures**: compliant workflow with signer identity, intent, reason, timestamp, report hash, and immutable PDF. Versioning: V1, V2 addendum.
* **Clock integrity**: NTP sync + server time guardrails; all logs use UTC with local offset.
* **Data minimization**: PHI fields flagged; masked in non-clinical screens by policy.
* **Retention policies**: per-entity retention & purge jobs (e.g., raw logs 90 days, audit 7 years, clinical PDFs 10+ years — configurable).
* **Access reviews**: quarterly user/role attestation report for Admin.
* **Legal holds**: flag records to suspend purge.

## 34) Lab Quality (QC) & Patient Safety

* **Reference ranges**: age/sex-specific; pediatric/geriatric; method-specific ranges; effective-dated.
* **Delta checks**: compare with prior results; thresholds per parameter; route to verification queue.
* **Panic/Critical values**: parameter thresholds → mandatory alert + acknowledgement + delivery block until acknowledged.
* **Levey–Jennings & Westgard rules**: optional QC module capturing control runs; rule violations open incidents; charts stored as images.
* **Sample lifecycle**: chain-of-custody events (collected → processed → disposed); disposal logging for bio-waste compliance.
* **Recollection workflows**: auto scheduling and notification when sample inadequate.

## 35) Financials: Referral, Prepaid & Commission Reconciliation

* **Prepaid receivables**: daily doctor-wise receivable statement; handover register; short/excess tracking; approval step.
* **Commission payables**: doctor-wise accrual with adjustable % slabs; hold/release; payout register with TDS note (configurable).
* **Day-end close**: cashier close (cash/card/UPI split), variance report, bankable cash summary.
* **Write-offs/credits**: controlled by roles; reasons catalog; double-approval option.

## 36) Billing & Taxes

* **Invoice numbering**: financial year prefixes; branch-aware sequences.
* **Tax model**: configurable inclusive/exclusive tax; per-test tax flag; reversible credit notes. (Exact rates/rules are install-time configs.)
* **Rounding**: banker's vs standard; per-invoice rule.
* **HSN/service codes**: optional metadata on tests/packages for statutory exports.

## 37) Devices, Printing & Barcodes (Detailed)

* **Token printing**: ESC/POS thermal; customizable header/footer; QR optional.
* **Label printing**: ZPL/TSPL support; 203/300 DPI; common sizes 25×50mm & 32×25mm. Print service runs as Windows tray agent; retries & queue visible in UI.
* **Symbology**: Code 128 (default) with checksum; content: `BARCODE|VISIT|TOKEN|TUBE|CHK` encoded; human-readable fields on label.
* **Scanner behavior**: auto-submit on scan; debounce; audible feedback; offline buffer for 100 scans.

## 38) Imaging / PACS Integration (Optional Path)

* **DICOM services**: C-STORE receive, WADO-RS retrieval; study storage policy per modality.
* **Worklist (MWL)**: optional modality worklist via HL7/ORM or DICOM MWL; study UID mapping to Visit/Order.
* **Viewer**: window/level presets, measurements, key-image marking; store key-image refs for AI readiness.

## 39) Analyzer & Instrument Connectivity (Optional Path)

* **Middleware adapter**: ASTM/HL7 over serial/TCP; per-analyzer mapping to parameters; result auto-ingest → verification queue.
* **Result provenance**: manual vs analyzer tag; flags for rerun/dilution; attachment of raw data files if provided.

## 40) Migration from Legacy DLMS

* **Discovery**: map legacy tables/fields, report templates (Crystal/others), and file locations (PDF, DICOM).
* **ETL Plan**: extract → standardize → validate → load; dry run in staging; checksums & row counts matched.
* **Template migration**: recreate top 10 report templates; pixel-perfect validation; sign-off by pathologist/radiologist.
* **Parallel run**: 2–4 weeks dual entry for critical flows; variance dashboard; cutover checklist.
* **Data guardians**: assign lab champion & IT owner to sign each phase.

## 41) Multi-Branch / Multi-Site Readiness

* **Branch dimension** on core tables; per-branch pricing, sequences, and masters (with inheritance).
* **Role scoping**: user can be multi-branch or single-branch; reports filter by branch with override for admins.
* **Inter-branch referrals**: revenue & cost attribution rules.

## 42) Localization & Accessibility

* **I18N** plumbing with message keys; date/time/number formats per locale.
* **Names** with local scripts allowed; search normalized.
* **A11y**: keyboard-first flows; aria labels; color contrast; focus traps; zoom up to 150%.

## 43) Notifications & Communication

* **Channels**: SMS, Email, WhatsApp (provider-agnostic); templates versioned; placeholders validated.
* **Rate limits**: per-channel quotas; backoff/retry; dead-letter queue with re-send.
* **Consent**: per-patient opt-in flags; audit of communications.

## 44) Security Hardening & DR

* **At-rest encryption** for PDFs and backups (Windows EFS/BitLocker or DB TDE where licensed).
* **In-transit** TLS internal; strict cookies; HTTP security headers.
* **Secrets**: stored in Windows Credential Manager or encrypted appsettings; rotate quarterly.
* **Backups**: nightly full + 15‑min log; offsite copy; RPO <= 15 min, RTO <= 4 hr (configurable).
* **Pen-test checklist**: authz bypass, IDOR, SQLi, SSRF (viewer), path traversal, upload validation.

## 45) Monitoring & SRE Runbook

* **Dashboards**: API latency, error %, queue depth, report times, disk usage.
* **Alerts**: p95 latency breach, queue age > threshold, disk < 15%, backup failures, export failures.
* **On-call**: escalation ladder; incident templates; postmortem process; change freeze rules.

## 46) Performance Test Plan

* **Scenarios**: peak registration (reception), report rendering storms, delivery spikes at closing hour, bulk WhatsApp sends, barcode surge at camps.
* **Targets**: as defined in Part 2; add heap/CPU ceilings; long-run (8 hr) soak with no error creep.
* **Tooling**: k6/JMeter scripts in `/tests/perf`; CI publishes trends.

## 47) Data Catalog & Schemas

* **Schemas** (JSON): stored in `/docs/schemas`; versioned with semantic tags.
* **Dictionary**: business glossary for tests, codes, units, flags; kept in repo and rendered in Admin UI help.

## 48) Training, SOPs & Change Management

* **SOP packs** per role (Reception, Collection, Lab Tech, Pathologist, Radiology, Delivery, HR, Admin).
* **Sandbox mode** with sample data for training (separate DB); cannot print real reports.
* **Release notes**: human‑readable + machine‑readable; onboarding checklist for new branches.

## 49) Roadmap Phasing (Build Order)

1. Core flows (Reception → Delivery) + Admin masters.
2. HR/Payroll basic.
3. Report Designer & Printing polish.
4. AI Readiness exports.
5. Operational AI panels (Reception/Delivery/Admin).
6. Clinical AI drafting (text only) once safe.
7. Optional integrations: PACS, analyzers, MWL.

## 50) Environment & Secrets Policy

* **Environments**: Dev, Staging, Prod; separate DBs; no cross-environment PHI.
* **No mocks** reiterated: fixtures only via dev seeds; any sample data labeled and purgeable.
* **Config as code**: appsettings.{env}.json tracked; sensitive values via secure store; change tickets required.

## 51) Legal & Contracts (Ops Readiness)

* **SLAs**: uptime target, response times, support hours.
* **BAA/DAA equivalents** where applicable; data processing addendum with export toggles documented.
* **Exit plan**: data export format (DB dump + files + schema docs) provided on termination.

---

**End of Part 3.**

# SynOS – System Specification (Part 4: Build Plan, UI System & Acceptance)

> This part converts the spec into a practical build plan with coding standards, UI system, API contracts, and acceptance tests. No mocks, no dead ends.

## 52) Build Strategy (Step‑by‑Step)

**S0. Repo & Envs**

* Monorepo: `/apps/frontend`, `/apps/api`, `/docs`, `/scripts`, `/tests`.
* Envs: Dev (local), Staging (VM), Prod (client server). Separate DBs.

**S1. Foundations**

* Auth (RBAC roles), Users CRUD, Branch config.
* Global layout + navigation, theme tokens, toasts, modals.
* Error boundary + ProblemDetails mapping.

**S2. Reception → Delivery Core**

1. Patients + Visits + Orders + Payments
2. Sample Collection (barcodes) / Imaging worklist
3. Lab Tech / Radiology Tech
4. Pathologist / Radiologist signing
5. Delivery Desk

**S3. Admin Masters**

* Test master, parameters, ranges; pricing, discounts; referrers & commission rules; report templates.

**S4. HR/Payroll (Basic)**

* Staff, attendance, shifts, payroll run, payslip PDF.

**S5. Reporting & Printing**

* Server PDF render; token/label printing agents; designer wiring.

**S6. AI Readiness Exports**

* Pathology Parquet + Radiology key‑image packs; toggles; SFTP job.

**S7. PathAI (Runtime, Ops first)**

* Dock panel + AI Gateway + skills: counts/KPIs; later clinical drafting.

**S8. Hardening & Load**

* Observability, alerts, backups; load + soak tests; go‑live drill.

---

## 53) UI Design System (Shadcn + Tailwind)

* **Color tokens**: primary, accent, success, warning, danger; high‑contrast clinic theme.
* **Typography**: headings scalable; tables 14–16px; large inputs.
* **Components**: Button, Input, Select, DateRange, Badge, Drawer (for PathAI Dock), Table (virtualized, infinite scroll), Modal, Toast, Steps.
* **Patterns**:

  * Right panel = details; center = worklist; left = filters.
  * Sticky Filter Bar (department, date, status).
  * Infinite scroll with cursor; row skeletons; inline editing where safe.
* **Accessibility**: focus rings, ARIA labels, keyboard shortcuts (e.g., `Alt+P` print token, `Alt+B` print barcode).

---

## 54) API Contracts (Concrete Examples)

**54.1 Cursor Lists**

```
GET /api/v1/visits?limit=50&after=2025-11-08T10:10:12Z_V123
→ 200 { items: [...], nextCursor: "2025-11-08T10:05:01Z_V087" }
```

**54.2 Idempotent POST (Payment)**

```
POST /api/v1/payments  
Headers: Idempotency-Key: 2f3c-...  
Body: { visitId: "V123", method: "UPI", amount: 800 }
→ 201 { paymentId: "PMT991" }
```

**54.3 Optimistic Concurrency**

```
PUT /api/v1/visits/V123  
If-Match: "rowversion:0x0000000000000F1B"  
Body: { referrerId: "R22" }
→ 412 if stale
```

**54.4 Problem Details (Errors)**

```
→ 400 { type:"https://synos/errors/validation", code:"INVALID_BARCODE", detail:"Tube type missing" }
```

---

## 55) Database & Naming Conventions

* Tables: PascalCase plural (`Patients`, `Visits`, `ImagingStudies`).
* Keys: `PatientId` (GUID/ULID), `CreatedAt` UTC, `RowVersion` `rowversion`.
* Indices: composite for scroll `(CreatedAt DESC, <Id> DESC)` + INCLUDE common projections.
* Soft delete: `IsDeleted BIT`, `DeletedAt`, `DeletedBy`.
* Audit table: `AuditLog` with JSON `Old`, `New`.

---

## 56) Printing & Labels (Implementation Notes)

* **Token**: Browser print from Reception; thermal ESC/POS template with logo + token.
* **Barcode**: Windows tray agent watches `\\server\labels`; accepts JSON job `{ SampleId, TubeType, Text[] }`; supports ZPL/TSPL.
* Retries, visible queue, and cancel.

---

## 57) Report Designer (Admin)

* Template types: Pathology, Radiology, Combined.
* Admin UI: upload/update template; preview with sample data; lock version after go‑live.
* Designer options: SSRS or embedded; supports 1/2/3 columns, letterhead, QR, signature blocks.

---

## 58) Undo & Corrections (UI Wiring)

* **Amend Order** wizard at Reception with diff invoice generation.
* **Correction** banner on Visit after artifact; opens controlled edit with audit preview.
* **Relabel** action in Collection; prints new barcode; links old→new.
* **Reopen/Addendum** in Doctor screens; creates V2; Delivery sees latest.
* **Trash Bin** page: scoped restore with reason.

---

## 59) QA Strategy (No‑Mocks Enforcement)

* **Policy**: No mock routes or dummy wiring anywhere. Only dev seeds filling a **dev DB**.
* **Seeds**: `/scripts/seed-dev.sql` + `/apps/api/SeedDev.cs` guarded by `Development` env.
* **Contract tests** hit real controllers + DB (Testcontainers/LocalDB).
* **E2E** playwright tests run against dev API with seeded data.
* **Load tests** (k6/JMeter) script paths in `/tests/perf`.

---

## 60) Security & Privacy Acceptance

* RBAC matrix tested by role; IDOR test suite; rate limits on sensitive endpoints.
* Logs exclude PHI; secrets in Windows Credential Manager or user secrets in dev.
* TLS; secure cookies; CSP hardened for viewer; upload validations.

---

## 61) Deployment Recipes (Windows/IIS)

* **API**: `dotnet publish -c Release`; deploy folder to IIS app `SynOS.Api`.
* **Frontend**: `npm run build`; serve as IIS static site `SynOS.Web` with URL rewrite to SPA.
* **Background jobs**: Hangfire server hosted inside API; ensure sticky app pool or out‑of‑process Windows Service.
* **DB**: EF migrations with backup + rollback script; keep `DB_MIGRATIONS.md`.

---

## 62) Go‑Live Checklist (Pass/Fail)

* Load test ≥ 50 rps burst, p95 under spec.
* Nightly backup + restore drill green.
* Report templates (top 10) validated and signed off.
* Barcode E2E: print → scan → result → report.
* Undo flows per role verified.
* Observability dashboard green 7 days.
* AI exports toggled OFF by default; toggles tested.

---

## 63) Acceptance Criteria per Feature (Samples)

**Reception – Create Visit**

* Can create patient + visit + orders + payment.
* Token printed; invoice printed; no barcode printed here.
* Negative: duplicate idempotency key returns same payment.

**Sample Collection – Print Label**

* Shows paid tokens only; prints ZPL label; scan opens sample.
* Mislabel path creates rejected→relabel event; new barcode linked.

**Pathologist – Sign Report**

* Signs CBC; generates PDF V1 with digital signature; QR opens verify page.
* Addendum creates V2; Delivery sees V2; history retains V1.

**Delivery Desk – Send Report**

* WhatsApp send logs event; failure re‑queues; print always available.

---

## 64) AI Assistant (Implementation Milestones)

* **M0**: Dock + context picker + RBAC scoping; routes to placeholder provider; no PHI unless enabled.
* **M1**: Ops skills (counts/KPIs, refund wizard suggestions).
* **M2**: Clinical drafts from structured findings (no pixels).
* **M3**: Enable AI Readiness export jobs; validate packs via schema.
* **M4**: Optional: local GPU inference path behind gateway.

---

## 65) Documentation Artifacts

* `/docs/ERD.png` entity diagram
* `/docs/flows/*.png` swimlanes per department
* `/docs/api/*.http` example requests ready to run (VS Code REST client)
* `/docs/runbooks/*.md` on‑call and recovery steps
* `/docs/CHANGELOG.md` versioned changes

---

**End of Part 4.**

# SynOS – System Specification (Part 5: Design System, Dashboards & Motion)

> World‑class, modern UI with tasteful motion, deep attention to detail, and role‑specific analytics. No visual gimmicks; everything must be fast and legible in clinical settings.

## 66) Visual Language & Theme

* **Design tokens** (Tailwind CSS vars):

  * Colors: `--bg`, `--bg-elev`, `--card`, `--muted`, `--border`, `--primary`, `--accent`, `--success`, `--warning`, `--danger`.
  * Elevation (shadow) scale: `e0` (none) → `e6` (modal). Soft, blurred, low‑spread shadows; never harsh.
  * Radius: `r-md` (8), `r-lg` (14), `r-xl` (20), `r-2xl` (28) for cards and drawers.
  * Spacing scale tuned for dense tables: `2, 3, 4, 6, 8, 10, 12`.
* **Dark mode**: default based on OS; toggle per user. High‑contrast clinical palette.
* **Typography**: Inter/Manrope (UI), Source Sans (reports preview). Sizes: 14/16 body, 20/24/28 headings.

## 67) Motion & Micro‑Interactions

* **Principles**: subtle, purposeful, fast. p95 frame budget < 10ms.
* **Library**: Framer Motion.
* **Durations**: 120–180ms (snappy), 220ms for modals/drawers.
* **Easings**: `easeOut` for enter, `easeIn` for exit; spring for small affordances.
* **Patterns**:

  * Cards lift on hover (`e1 → e2`), focus ring visible.
  * Drawer (PathAI Dock) slides in 24px; dimmed scrim at 8%.
  * Row change glow on live updates (700ms fade) without reflow.
  * Button success pulse (120ms) on completion.

## 68) Component Kit (shadcn/ui)

* Buttons (primary/ghost/danger), Inputs, Selects, Combobox, DateRange, Badge, Tabs, Accordion.
* Data Grid (virtualized, infinite scroll with cursor), Column pinning, Inline filters, Quick search.
* KPI Tiles, Sparkline, Mini Bar/Area charts (Recharts), Empty‑States, Skeletons, Toasts.
* Drawer (PathAI Dock), Modal, Stepper, Timeline, Status Pills, User Menu.
* DICOM Viewer shell: toolbar (WW/WL, zoom, pan, measure), key‑image ribbon.

## 69) Role‑Specific Dashboards (Above the Worklists)

**Reception Dashboard**

* KPIs: Today’s patients, Paid %, Avg wait, Busiest hour.
* Charts: Visits by hour (area), Payment mix (donut), Referrals top 10 (bar).
* Widgets: Quick estimate builder, Pending amendments, Prepaid receivables.

**Sample Collection**

* KPIs: Awaiting collection, Recollects, Rejections, Avg collection time.
* Charts: Tube types count, Rejection reasons (bar), Aging of awaiting list.

**Lab Tech**

* KPIs: Result entries today, Pending verification, Delta‑flagged.
* Charts: Abnormal rate by parameter group, TAT distribution.

**Pathologist**

* KPIs: Reports signed, Addenda issued, Critical values acknowledged.
* Charts: Panels by category, Critical alerts trend.

**Radiology Tech**

* KPIs: Scans completed, Repeats, Avg scan time by modality.
* Charts: Modality volume mix, No‑show rate.

**Radiologist**

* KPIs: Reports signed, Turnaround, Addenda.
* Charts: Findings templates usage, Modality TAT.

**Delivery Desk**

* KPIs: Pending to deliver, Delivered today, Failed sends.
* Charts: Queue aging, Channel mix (print/WA/email/link).

**HR & Payroll**

* KPIs: Present, Absent, Overtime hours, Payroll run status.
* Charts: Attendance heatmap, Dept overtime (bar), Leave types split.

**Admin**

* KPIs: Revenue today, Avg discount, Referral payouts accrual, TAT by dept.
* Charts: Revenue by test group, Doctor referral volume, Discounts trend.

## 70) Analytics Implementation

* **Charts**: Recharts only; no heavy themes; responsive containers; tooltips with compact numbers.
* **Data**: Real API only. No mock datasets. All widgets consume `/api/v1/analytics/*` endpoints.
* **Caching**: 60–300s server cache per widget; SWR on client for snappy feel.
* **Loading states**: skeleton bars/tiles; optimistic updates for small counters.
* **Drill‑downs**: click KPI → opens filtered worklist with the same date/dept/status.
* **Time ranges**: Today, 7d, 30d, Custom; persisted per user.

## 71) Layouts & Responsiveness

* **Desktop first** (1920×1080); scalable down to 1366×768.
* **Three‑pane layout**: left filters (280px), center list, right details/PathAI.
* **Full‑screen modes** for kiosks: Reception token view, Collection board, Delivery monitor.

## 72) Empty States & Error UX

* Empty = illustration + one‑line help + primary action.
* Errors = ProblemDetails mapped to human text; retry affordance; copy error ID.
* Global offline banner when API unreachable; cached lists disabled with explanation.

## 73) Theming & Branding

* Brandable logo, color accents, and report letterhead via Admin → Branding.
* Branch badges color‑coded.
* Print styles separate from screen styles; avoid shadow/animation in print.

## 74) Performance & Quality Gates (UI)

* First interaction under 1s after login.
* Dashboard paint < 800ms with cached queries.
* Smooth scroll at 60fps; virtualized lists over 1k rows.
* Axe a11y score ≥ 95 on key pages; keyboard flows for all core actions.

## 75) PathAI Dock – UX Details

* Context chips visible; user can deselect before sending.
* Results render in markdown with inline KPIs or bullet summaries.
* One‑tap actions suggested (e.g., “Create Amendment”, “Open Addendum”, “Open filtered worklist”).
* Safe by design: shows what data was sent to AI; copy of prompt/context shown in a disclosure.

## 76) Visual Examples to Produce (in repo `docs/flows/`)

* Reception dashboard wireframe
* Pathology worklist + KPIs
* Radiology viewer with key‑image ribbon
* Delivery board + channel mix
* Admin revenue dashboard
* HR attendance heatmap

## 77) Animation Specs (Tokens)

* `--motion-fast: 120ms`, `--motion-medium: 180ms`, `--motion-slow: 220ms`.
* `--shadow-rest: e1`, `--shadow-hover: e2`, `--shadow-press: e3`.
* Reduced motion: honors OS setting; disables heavy transitions.

## 78) Analytics API (Sketch)

* `GET /api/v1/analytics/reception?range=today`
* `GET /api/v1/analytics/pathology?range=7d`
* `GET /api/v1/analytics/radiology?modality=MRI&range=30d`
* `GET /api/v1/analytics/delivery?range=today`
* `GET /api/v1/analytics/hr?range=month`
* `GET /api/v1/analytics/admin/revenue?range=30d`
* All return `{ kpis: {...}, charts: { series: [...], labels: [...] } }`.

## 79) Quality Bars before Merge (UI PRs)

* Screenshots (light/dark), short Loom/GIF showing interactions.
* Perf captures: Lighthouse, React profiler snapshots for long lists.
* A11y check: keyboard path & aria labels; reduced‑motion tested.

---

**End of Part 5.**

## 6. Extended Core Modules (High-Priority Additions)

This section defines essential modules that elevate SynOS from a diagnostic-only system into a full, accreditation-ready, enterprise-grade Lab OS.

---

## 6.1 Inventory & Reagent Management (MVP-Critical)

### Purpose
Track all consumables required for laboratory operations, including reagents, kits, tubes, slides, chemicals, PPE, and consumables used across Pathology and Radiology.

### Core Features
- Item Master (Name, Type, Vendor, Unit, Storage Condition, Reagent Category)
- Lot/Batch Management (Batch No, Expiry Date, Manufacturing Date)
- Stock In / Stock Out with audit logging
- Auto-deduct stock based on Test → Reagent Mapping
- Reorder Levels, Minimum Stock Alerts
- Expiry Alerts (color-coded: <30 days, <7 days, expired)
- Wastage / Breakage logging
- Cost per test consumption calculation
- Vendor & Purchase history

### UI
- Inventory Dashboard (Stock Health, Expiry Summary, Consumption Analytics)
- Reagent Usage per Test Report
- Low-Stock Alert Banner + Notification
- Role Access: Admin + Inventory Manager + Lab Supervisors

---

## 6.2 Analyzer Integration Middleware (Phase 2 — High Priority)

### Purpose
Automate result acquisition from laboratory analyzers (Hematology, Biochemistry, Immunoassay, Coagulation, etc.)

### Supported Standards
- ASTM
- HL7 v2.x ORM/ORU
- LIS2-A2 Serial/TCP
- Vendor-specific drivers (Roche/Abbott/Siemens)

### Core Features
- Instrument Connection Manager
- One-way and Bi-directional interfacing
- Auto-match sample barcode → order
- Auto-import results into Technician Review Queue
- Delta Checks (against previous results)
- QC Data import (for Westgard rule application)
- Error handling (invalid sample ID, unreadable result, partial data)
- Real-time status viewer (Connected / Idle / Processing)

### UI
- Analyzer Control Panel
- Real-time Feed Monitor
- Manual Override (Manual Entry with “Override Reason”)
- Result Conflict Resolution Dialog

---

## 6.3 Accreditation & Compliance Module (Phase 3)

### Purpose
Support NABL / CAP / ISO15189 accreditation cycles with audit-ready documentation.

### Core Components
- Document Control (SOPs, Manuals, Forms) with versioning
- Equipment Calibration & Maintenance Log
- Environmental Monitoring (Temp/Humidity logs for refrigerators/incubators)
- PT / EQA (Proficiency Testing) Tracking
- CAPA (Corrective & Preventive Actions)
- Internal Audit Scheduler
- Competency Assessment for staff

### UI
- Accreditation Dashboard (Upcoming Audits, Pending CAPA, Overdue Calibrations)
- Document Library (searchable with version history)
- Equipment Calendar View

---

## 6.4 External Lab Integration (Phase 2)

### Purpose
Enable labs to outsource specific tests to partner/reference labs.

### Core Features
- Outsource Partner Master (Name, TAT, Pricing, Contact)
- Test-routing rules (which tests go to which partner)
- Sample Dispatch workflow (bags, manifests, courier details)
- Tracking (Dispatched → Received → Processed → Result Ready)
- Result PDF import + mapping to orders
- Reconciliation: Outsourced Bill → Lab Bill

### UI
- Outsource Dashboard (Pending Dispatch, Delayed Returns)
- Manifest Builder (auto-generate packing list)
- Result Import Panel

---

## 6.5 Critical Value Management (MVP Upgrade)

### Purpose
Ensure mandatory, traceable communication of life-threatening results.

### Workflow
1. Technician enters a value.
2. System triggers **Critical Alert** popup if threshold exceeded.
3. Technician must immediately notify clinician/referring doctor.
4. System forces entry of:
   - Person notified  
   - Time  
   - Mode (Phone/SMS/WhatsApp)
   - Notes
5. Pathologist reviews and signs off critical communication.

### UI
- Critical Alerts Queue (colored red)
- Acknowledgment Log (audit-safe)
- Escalation rules (if unacknowledged after X minutes)

---

## 6.6 HL7/FHIR Integration (Phase 3)

### Purpose
Enable SynOS to connect with hospital HIS/EMR systems.

### Supported Standards
- HL7 v2.x ADT/ORM/ORU
- FHIR R4 (Patient, Observation, DiagnosticReport, Encounter)

### Features
- Patient Sync
- Order Sync
- Real-time result publishing
- Error queue for failed messages

---

## 6.7 Patient Engagement (Phase 4)

### Components
### A) Patient Mobile App (Android/iOS)
- Report download
- Payment history
- Token status
- Appointment booking
- Push notifications (Report Ready, Payment, Offers)

### B) Appointment Booking Portal
- Select test/packages
- Time-slot calendar
- Pay online (UPI/Cards)
- Auto-generate Visit & Token for scheduled patients

---

## 6.8 Language Localization (Phase 3)

### Purpose
Support India’s multilingual environment.

### Supported Elements
- Hindi + Regional Languages for:
  - Public Token Display
  - Patient Reports
  - Patient Portal/App

### UI
- Language Switcher (Admin-managed)
- Multi-language report templates

---

## 6.9 Advanced Radiology Viewer (Phase 3+)

### Enhancements
- MPR (Multi-Planar Reconstruction)
- Distance measurements
- ROI tools
- Window/Level presets
- Spine labeling tools
- AI hooks for radiology future integration

---

## 6.10 External API Platform (Phase 4)

### Purpose
Enable third-party developers to integrate SynOS with external platforms.

### Features
- API Keys / OAuth2
- Test Order API
- Report Status Webhooks
- Report Retrieval API
- Patient Sync API

# SynOS – System Specification (Part 7: Detailed Module Specs)

> This part closes the critical gaps: **Inventory**, **Analyzer Middleware**, **Critical Values**, **Outsourcing**, and **Accreditation**. It includes user flows, UI wiring, DB tables, and API examples. No mocks.

---

## 80) Inventory & Reagent Management (MVP‑Critical)

### 80.1 Goals

* Zero stock‑outs, zero expired usage, accurate cost per test.
* Fully auditable movements with lot/batch traceability.

### 80.2 Entities (DB)

* `InventoryItems(ItemId, Name, Type, Unit, Storage, ReagentCategory, VendorId?, CreatedAt, RowVersion)`
* `InventoryLots(LotId, ItemId, BatchNo, MfgDate?, Expiry, QtyOnHand, CostPerUnit, CreatedAt, RowVersion)`
* `InventoryMoves(MoveId, LotId, Qty, MoveType IN('IN','OUT','ADJUST'), Reason, RefEntity, RefId, PerformedBy, PerformedAt)`
* `TestReagents(TestCode, ItemId, QtyPerTest)`
* `Vendors(VendorId, Name, Contact, GSTIN?)`

### 80.3 Flows

* **Stock In** → create lot (batch/expiry) → add quantity → move log.
* **Auto Consumption** → on report finalization, deduct mapped reagents × order count.
* **Manual Issue** (rare) → collection bench issues tubes/consumables.
* **Expiry Sweep** → nightly job flags expiring ≤30/7/0 days → email/toast.

### 80.4 UI

* **Dashboard**: Low stock, Expiring lots, Today’s consumption, Avg cost/test.
* **Lot Table**: color badges (≤7 days red), quick filter by storage.
* **Move Drawer**: IN/OUT/ADJUST with reason presets.

### 80.5 APIs

* `GET /api/v1/inventory/items?limit&after`
* `POST /api/v1/inventory/items`
* `POST /api/v1/inventory/items/{itemId}/lots`
* `POST /api/v1/inventory/lots/{lotId}/move`
  Body: `{ qty, moveType, reason, refEntity, refId }`

### 80.6 Business Rules

* Negative stock denied (flag override only for Admin).
* Auto‑deduct only after **Finalized** report (not on draft results).
* Locked lot if expired; cannot issue.

---

## 81) Analyzer Integration Middleware (Phase 2 High)

### 81.1 Goals

* Eliminate manual entry; reduce transcription errors; faster TAT.

### 81.2 Components

* **Connector Service** (Windows Service): serial/TCP; ASTM/HL7; per‑instrument profile.
* **Routing Engine**: barcode → order mapping; unmatched → exceptions queue.
* **Translator**: vendor → canonical JSON (`{ orderId, paramCode, value, unit, flags, raw }`).
* **Review Queue**: lab tech sees incoming results → accepts/edits → submits for verification.

### 81.3 Entities (DB)

* `AnalyzerConnections(ConnectionId, Vendor, Model, Protocol, Port, Baud, Host, CreatedAt, Enabled)`
* `AnalyzerRaw(RawId, ConnectionId, Payload, ReceivedAt, ParseStatus, Error?)`
* `AnalyzerResults(ArId, OrderId?, ParamCode, Value, Unit, Flags, SourceRawId, MappedAt)`

### 81.4 Flows

1. Instrument sends data → Connector → Raw store.
2. Translator parses → canonical JSON → mapped by barcode.
3. **If Order found** → create `Results` (Draft) → Review Queue.
4. **If not** → Exceptions: user manually link order.

### 81.5 UI

* **Connections Grid** (status lights, last message time).
* **Live Feed** tail view with filter by instrument.
* **Exceptions** table with quick link to visits.

### 81.6 APIs

* `GET /api/v1/analyzers/connections` (list/status)
* `POST /api/v1/analyzers/connections` (create/update)
* `GET /api/v1/analyzers/feed` (SSE for live)
* `POST /api/v1/analyzers/map` `{ rawId, visitId/orderId }`

### 81.7 Rules

* Only **Verified** results can be signed by Pathologist.
* Analyzer results carry **provenance** tag; edits recorded.

---

## 82) Critical Value Management (MVP Upgrade)

### 82.1 Goals

* Mandatory, traceable clinician notification for life‑threatening results.

### 82.2 Entities

* `CriticalRules(TestCode, ParamCode, LowCritical, HighCritical, EscalationMins)`
* `CriticalAlerts(AlertId, ResultId, Threshold, NotifiedTo, NotifiedAt, AckBy?, AckAt?, EscalatedAt?)`
* `CriticalContacts(ReferrerId|Dept, Phone, Email, WhatsApp)`

### 82.3 Flow

1. Result saved → engine checks rule → **Alert** created.
2. Popup to lab tech with call script; SMS/WA/email automatic if configured.
3. **Ack required** (who, when, method).
4. If **no ack** within `EscalationMins` → escalate to on‑call/Pathologist/Admin.
5. Delivery blocked until **Ack**.

### 82.4 UI

* **Critical Queue** with red banner, countdown timers.
* **Ack Dialog**: contact selection, note, attachments (call recording id optional).

### 82.5 APIs

* `GET /api/v1/critical/alerts?status=open`
* `POST /api/v1/critical/alerts/{id}/ack` `{ method, contact, note }`

### 82.6 Rules

* Immutable audit trail; addendum required if values corrected later.

---

## 83) Outsourcing (Reference Lab Integration)

### 83.1 Goals

* Seamless routing of specialized tests to partner labs with full TAT and billing control.

### 83.2 Entities

* `OutsourcePartners(PartnerId, Name, Contact, Address, TransportMode, Turnaround)`
* `OutsourceDispatches(DispatchId, PartnerId, OrderId, DispatchedAt, Status)`
* `OutsourceResults(ResultImportId, DispatchId, PdfPath, JsonPath?, ImportedAt)`
* `OutsourceRates(PartnerId, TestCode, Rate)`

### 83.3 Flows

* **Routing**: Admin sets test → partner rule.
* **Dispatch**: manifest + barcode list → handover log → status `Dispatched`.
* **Result**: partner PDF/API → import → attach as report or merge parameters → set `Finalized`.
* **Finance**: reconciliation report (billed vs partner cost), margin by test.

### 83.4 UI

* **Outsource Board**: Dispatched/Received/Waiting/Ready.
* **Manifest Builder** with counts and labels.
* **Result Import** drag‑drop; conflict resolution for duplicated results.

### 83.5 APIs

* `GET /api/v1/outsourcing/partners`
* `POST /api/v1/outsourcing/dispatches`
* `POST /api/v1/outsourcing/results/import`

---

## 84) Accreditation & Compliance (NABL/CAP/ISO15189)

### 84.1 Goals

* Operationalize accreditation artifacts without third‑party tools.

### 84.2 Entities

* `Docs(DocumentId, Title, Version, Owner, EffectiveFrom, Status, FilePath)`
* `Equipments(EquipId, Name, Serial, CalibrationDue, MaintDue, Dept)`
* `MaintLogs(LogId, EquipId, Type, PerformedAt, By, Notes, FilePath?)`
* `Audits(AuditId, Scope, ScheduledAt, Auditor, Status)`
* `CAPA(CapaId, AuditId?, Title, RootCause, ActionPlan, Owner, Due, Status)`
* `Competency(CompId, StaffId, Skill, AssessedAt, Assessor, Status)`

### 84.3 Flows

* **Document Control**: draft → review → approve → publish; read‑ack tracking.
* **Equipment**: calibration/maintenance schedule → reminders → log uploads.
* **Audit→CAPA**: findings → CAPA tickets → verification → closure.
* **Competency**: schedule assessments; archive certificates.

### 84.4 UI

* **Accreditation Dashboard**: expiries, pending read‑acks, open CAPA, upcoming audits.
* **Document Library** with version history and read stats.

### 84.5 APIs

* `GET /api/v1/accreditation/documents`
* `POST /api/v1/accreditation/capa`
* `GET /api/v1/accreditation/equipment`

---

## 85) HL7/FHIR Interop (Phase 3)

### 85.1 Message Flows

* **ADT** (HIS → SynOS): patient create/update.
* **ORM** (HIS → SynOS): order create.
* **ORU** (SynOS → HIS): results/report delivery.

### 85.2 Endpoints

* `POST /api/v1/interop/hl7/inbound` (MLLP gateway behind firewall)
* `GET /api/v1/interop/fhir/Patient?identifier=<MRN>`

### 85.3 Mapping Notes

* Local `TestCode` ↔ LOINC (optional map table).
* Timezones: store UTC; expose local in payloads.

---

## 86) Public Token Board (Lobby/Reception)

### 86.1 Behavior

* Full‑screen board per department: **Current** and **Next 3** tokens; optional voice call; SignalR live.
* Fallback polling every 5s if websockets blocked.
* Kiosk mode auto‑refresh at midnight.

### 86.2 API

* `GET /api/v1/public/queue` → `{ departments:[ { name, current, next:[] } ] }`

---

## 87) ERD Deltas (Add to mermaid)

* `Inventory*`, `Outsource*`, `Critical*`, `Analyzer*` tables as listed above; relationships:
  `Orders ||--o{ OutsourceDispatches`, `Results ||--o{ CriticalAlerts`, `InventoryItems ||--o{ InventoryLots`, `InventoryLots ||--o{ InventoryMoves`.

---

## 88) Acceptance Tests (Per Module)

**Inventory**: cannot issue expired lot; auto‑deduct on finalized; negative stock blocked.
**Analyzers**: raw message parsed → mapped to order → appears in Review Queue.
**Critical**: rule triggers alert; delivery blocked until ack; escalation fires after N mins.
**Outsourcing**: manifest prints; result PDF imports; reconciliation report shows margin.
**Accreditation**: document publish requires approver; CAPA cannot close without verification.

---

## 89) Build Order for These Modules

1. Inventory (with auto‑deduct + dashboards).
2. Critical Values (rules + queue + block delivery).
3. Outsourcing (routing + manifest + import).
4. Analyzer Middleware (connector + feed + review).
5. Accreditation (docs + CAPA + equipment).

---

**End of Part 7.**


# SynOS – System Specification (Part 8: DICOM Viewer & Report Designer)

> This part closes two gaps: **Radiology DICOM Viewer (detailed)** and **Report Designer (embedded, Crystal-like)**. Choices are made for on‑prem Windows Server, Chrome clients, and zero‑mock policy.

---

## 90) DICOM Viewer (Radiology)

### 90.1 Architecture & Libraries

* **Cornerstone3D** (+ cornerstone‑tools) for 2D stacks and annotations.
* **VTK.js** (via Cornerstone3D integration) for **MPR** (axial/coronal/sagittal) and basic **3D** volume rendering.
* **dicomParser + dcmjs** for metadata and SR parsing.
* **WADO‑RS/HTTP loader** with fallbacks to file share (local URL scheme). Optional **DICOMDIR import** for offline CDs.
* **Web Workers** for decoding; **WASM** (GDCM/wasm) where supported.

### 90.2 Features (MVP → Plus)

**MVP**

* Series/study browser (thumbnails), stack scrolling, **window/level**, **zoom**, **pan**, **cine**.
* **Measurements**: length, angle, area (ellipse/polygon), point, text annotation; save to DB as JSON.
* **Key‑Image** selection (per study) with reasons; used by Delivery and AI exports.
* **Hanging Protocols**: 1×1, 1×2, 2×2 presets; remember last layout per radiologist.
* **Keyboard shortcuts** + right‑click quick tools; dark theme; high‑contrast UI.

**Plus (Phase 2/3)**

* **MPR** tri‑planar with linked cursors; thickness control; screenshot export.
* **3D volume** (basic DVR) for CT/MRI; preset transfer functions.
* **Measurements templates** per modality (e.g., OB, MSK) and copy‑forward between series.
* **Structured Report (SR) read** to prefill findings where available.

### 90.3 Persistence Model

* `ImagingStudies(StudyId, VisitId, Modality, Status, DicomPath, CompletedAt)`
* `KeyImages(KeyId, StudyId, SeriesUid, SopUid, Frame, Reason, CreatedBy, CreatedAt)`
* `Measurements(MeasId, StudyId, Tool, DataJson, SeriesUid, SopUid, Frame, CreatedBy, CreatedAt)`

### 90.4 Performance & Stability

* **Tile cache** (Cornerstone3D cache) sized per client; purge on study switch.
* Large file uploads: chunked 10–20 MB, resumable; server antivirus scan; checksum verify.
* Viewer sandboxed via strong **CSP**; no remote code; uploads validated by MIME + magic bytes.

### 90.5 APIs (Additions)

* `GET /api/v1/imaging/studies/{studyId}` → series list + metadata.
* `POST /api/v1/imaging/studies/{studyId}/key-images` `{ items:[{seriesUid,sopUid,frame,reason}] }`.
* `POST /api/v1/imaging/studies/{studyId}/measurements` `{ items:[{tool,dataJson,...}] }`.
* `GET /api/v1/imaging/studies/{studyId}/download?format=dicomdir|zip`.

### 90.6 Security

* Study access restricted by role + branch; signed URL for downloads; access logged.
* PHI never leaves without explicit export; AI exports use **key‑images** + weak labels only.

---

## 91) Report Designer (SynOS Report Studio)

### 91.1 Approach & Engine

* **Embedded designer** with server‑side rendering using **QuestPDF** (.NET) for accurate, fast PDF.
* Template stored as **JSON DSL**; designer produces JSON; renderer compiles to PDF.
* Deterministic output; no scripting in templates (prevents RCE). Expressions limited to safe functions.

### 91.2 Template Model (JSON DSL)

* `meta`: name, version, author, createdAt, letterhead, pageSize (A4/A5), margins.
* `layout`: one of `oneColumn | twoColumn | threeColumn`.
* `sections`: array of blocks; types: `Header`, `PatientInfo`, `ParameterTable`, `Text`, `Image`, `SignatureBlock`, `QR`, `Footer`, `PageBreak`.
* `styles`: fonts, sizes, colors, table rules, conditional rules.

### 91.3 Features (MVP)

* **Crystal‑like** layout control: precise positioning within columns, static and repeating sections.
* **Conditional formatting** rules (e.g., flag HL with color/bold).
* **Parameter tables** auto‑paginate; supports units, ref ranges, flags, comments.
* **Letterhead assets** per branch; doctor signature blocks; **QR** for online verify.
* **Template versioning** (immutable after publish); preview with real case data.
* **Multi‑column** (1/2/3) with per‑department presets (Pathology/Radiology/Combined Visit).

### 91.4 Advanced (Phase 2)

* Template variables with limited functions: `upper()`, `formatDate()`, `round(n, dp)`, `padLeft()`.
* **Localization** tokens; Hindi/regional on patient‑facing PDFs.
* **Sub‑reports** (e.g., culture sensitivity tables) as nested tables.

### 91.5 Designer UI

* Left **Blocks** palette; center **Canvas** with rulers & grid; right **Inspector** (props/styles/conditions).
* **Data Preview**: pick a visit → render preview (server), no PHI persisted.
* **Diff viewer** for versions; **Publish** gate with approver role.

### 91.6 APIs (Additions)

* `POST /api/v1/reports/templates` (create/update draft)
* `POST /api/v1/reports/templates/{id}/publish`
* `GET /api/v1/reports/templates/{id}/preview?visitId=...`
* `POST /api/v1/reports/render` `{ visitId, templateId }` → PDF path
* `GET /api/v1/reports/{reportId}/verify` → JSON with hash, signer, version

### 91.7 Data Binding

* Renderer receives **normalized payload** (Patient, Visit, Orders, Results, Ranges, Comments, Signers).
* No arbitrary DB queries from templates. All data comes via the API payload.

### 91.8 Migration Aids (from Crystal)

* Import existing header/footer as **SVG/PNG** assets.
* Semi‑auto converter script Crystal → JSON DSL for common blocks (header, patient info, table).
* Pixel‑perfect validation mode: overlay before/after.

---

## 92) Acceptance Criteria

**DICOM Viewer**

* Load 2D stacks; tools work at 60fps on mid‑range desktop; key‑images saved; MPR screenshot exports.
* Access control enforced; downloads logged.

**Report Designer**

* Build & publish a 1‑column Pathology, 2‑column Radiology, 3‑column Combined template.
* Conditional formatting highlights HL; QR opens verify page; versioning prevents edits after publish.

---

**End of Part 8.**


# SynOS – System Specification (Part 9: Backup, Recovery & Disaster Management)

> Production-grade backup + restore for on‑prem Windows Server with SQL Server and file storage (PDF/DICOM/templates). Includes **automatic** schedules and **manual** on‑demand backups from Admin UI.

---

## 93) Backup Strategy

**Database (SQL Server):**
- **Full backup** nightly at **11:00 PM IST** → `C:\SynOS\Backups\Database`
- **Transaction log** backup **every 15 minutes** for point‑in‑time recovery
- Compression enabled

**File System:**
- Daily sync of **Reports PDFs** (`C:\SynOS\Storage\Reports`), **DICOM** (`C:\SynOS\Storage\DICOM`), **Report Templates**, **Configs`)

**External Copies (Recommended):**
- Weekly copy to **USB drive** (offsite rotation)
- Optional NAS share mirror

**Retention:**
- 30 days of daily backups + 13 weeks of weekly archives

**Objectives:**
- **RTO ≤ 30 min**, **RPO ≤ 15 min**

---

## 94) Admin Recovery UI

**Location:** Admin → Settings → **Backup & Recovery**

**Capabilities:**
- Calendar of available backups (size, verified ✓, record counts)
- One‑click **Restore** (guided, 8 steps) with MFA
- **Point‑in‑time** restore (choose timestamp within last 7 days)
- Quarterly test‑restore tracking & log

**8‑Step Automated Restore:**
1. Enter UI and pick backup
2. Verify details summary
3. System places app in maintenance mode
4. Stop IIS / API services gracefully
5. Restore **database** (full + logs to timestamp)
6. Restore **file system** (PDF, DICOM, templates)
7. Restart services + health checks
8. Confirmation + email to admins

---

## 95) Manual Backup (On‑Demand)

**Why:** Before payroll, upgrades, bulk imports, audits, weekly verification.

**UI Flow:** Admin → Backup & Recovery → **Create Backup Now**  
1) Pick **type**: *Full DB* | *DB + Files* | *Files only*  
2) Name + optional description (reason)  
3) Start → **progress bar** with live log  
4) Success → **Download to USB** button + entry in history

**Storage:** `C:\SynOS\Backups\Manual` (auto‑named `SynOS_Manual_YYYYMMDD_HHMMSS_user`)

**History Tab:** Name | Date | Size | Status | Actions (Download / Restore / Delete)

**Best Practices (India):**
- Weekly manual backup (Friday), copy to USB, offsite rotation
- Keep 2–3 weeks of manual backups
- Quarterly test restore

---

## 96) Disaster Scenarios Covered

| Scenario | Time to Recover | Data Loss |
|---|---|---|
| Disk failure | 2–3 h | ≤ 15 min |
| Server format | 1.5–2.5 h | None |
| DB corruption | 30–45 min | Up to last 15‑min log |
| Partial file loss | 5–10 min | None |
| Complete site loss | 4–5 h | ≤ 15 min (with offsite USB/NAS) |

---

## 97) Compliance & Audit
- 10‑year medical record retention policy documented
- HIPAA‑aligned backup processes
- Audit trail for every **backup** and **restore** (who, when, why)

---

## 98) Implementation Notes
**SQL Jobs:** nightly FULL, 15‑min LOG, verification + checksum, email on success/failure.  
**File Backup:** `robocopy` scripts (logged) for reports/DICOM/templates.  
**Maintenance Mode:** returns friendly page to users during restore.  
**Health Checks:** after restart, verify DB connectivity, storage paths, job agents.

---

## 99) Backup APIs (Admin Only)
- `POST /api/v1/backups/manual/create` → start manual backup
- `GET  /api/v1/backups/manual/{backupId}/progress` → live % + log
- `POST /api/v1/backups/manual/{backupId}/download` → returns presigned link
- `POST /api/v1/backups/manual/{backupId}/restore` → initiate restore workflow
- `GET  /api/v1/backups/manual/history` → list manual backups
- `DELETE /api/v1/backups/manual/{backupId}` → delete

---
**End of Part 9.**

# SynOS – System Specification (Part 10: Patient IDs, Daily Tokens & Full History Tracking)

> Clear, production-ready rules for **permanent patient identification**, **daily token queues**, and **how complete history is stored & retrieved** across visits, orders, samples, results, reports, delivery and billing.

---

## 100) Permanent Patient ID (Simple, Huge Capacity)
**Format:** 6-character **alphanumeric** (Base36) — e.g., `A00001`, `AB1234`, `ZZZZZZ`  
**Capacity:** 36^6 = **2,176,782,336** unique IDs (~1,190 years at 5,000/day)

**Rules**
- Generated **once** per person at first registration; **never changes**.
- Printed on all slips/reports/invoices; used for search (also phone/name search).
- Alphanumeric only (no spaces/symbols) → easy to say on phone and type quickly.
- Stored as `Patients.PatientId` (VARCHAR(6)), unique, indexed.

**Generation (Server-Side)**
- Use a **monotonic sequence** (DB sequence table) and convert to Base36 with zero‑pad to 6.
- Reject collisions (unique index).

---

## 101) Daily Visit Tokens (Per Department, Midnight Reset)
**Format:** `DEPT-NNN` → `P-001` (Pathology), `X-023` (X‑ray), `M-005` (MRI), `C-014` (CT)

**Rules**
- **Resets at midnight** (local time, IST) **per department**.
- Counter starts at `001` each day for each department.
- Token is **operational queue number** for the day; not a medical identifier.
- Stored on `Visits.Token` and **the date in `Visits.TokenDate`** (DATE).

**Generation**
- `SELECT COUNT(*) + 1 FROM Visits WHERE Dept = @Dept AND TokenDate = CAST(GETDATE() AS DATE)`  
- Format with 3‑digit zero‑pad; prefix by department initial (`P`, `X`, `M`, `C`).

**Lobby / Public Display**
- “**NOW SERVING**” (current token per dept) + **NEXT 3**.
- Real‑time via SignalR; optional audio chime on call.

---

## 102) How History Is Tracked (What Gets Stored)
**One Patient → Many Visits → Many downstream rows**

Per visit, SynOS writes multiple linked rows:
- **Visits** (1): `VisitId`, `PatientId`, `Token`, `TokenDate`, `Dept`, timestamps
- **Orders** (N): one per test/panel
- **Samples** (N): barcoded tubes/containers (Pathology only)
- **Results** (N): **all parameter values** with units, ranges, flags
- **Reports** (1+): signed PDF(s), versioned
- **DeliveryLogs** (1): print/WhatsApp/email/link handover
- **Billing/Finance** (1): invoice, payment, credits
- **(Radiology)** ImagingStudies, KeyImages, Measurements as applicable

This is **why it’s not use‑and‑throw**: every value and file is kept with strong foreign‑keys.

---

## 103) “Is this 2nd/3rd visit?” (System Logic)
- **Count visits**: `SELECT COUNT(*) FROM Visits WHERE PatientId = @Pid`  
- **Ordered list**: `ROW_NUMBER() OVER (ORDER BY CreatedAt)` to show Visit #1, #2, #3…
- Show prior tokens/dates/tests/results to staff and doctors for context.

---

## 104) Reception Flow (End‑to‑End)
1) **Search** by phone/name/ID → found? use existing; not found? **create** → generate 6‑char ID.  
2) **Create Visit** → choose department/tests → system generates **departmental token** for **today**.  
3) **Payment** → mark paid → **print token slip** (thermal).  
4) **Queues** update in real‑time; department screens worklist includes this visit.

**Token Slip (Thermal)**
```
══════════════════════════════
  SynOS – Your Lab Name
══════════════════════════════
TOKEN: P-012           (today)
ID: A00001            (permanent)
Name: Ramesh Sharma
Date: 10 Nov 2025, 08:30
Dept: Pathology
Tests: CBC, FBS
══════════════════════════════
Please wait for your token call
══════════════════════════════
```

---

## 105) Database Requirements (Additions & Indexes)
- **Visits.TokenDate (DATE)** — required for daily reset logic + reporting.
- Indexes:
  - `IX_Visits_TokenDate_Dept (TokenDate, Dept, CreatedAt)`
  - `IX_Visits_Patient (PatientId, CreatedAt DESC)`
- Unique constraints:
  - `Patients.PatientId` **UNIQUE**
  - Optional: `Patients.Phone` with smart dedupe logic (not unique across family numbers).

---

## 106) Operational Jobs
- **Midnight Reset Check** (SQL Agent): verifies per‑department counters work off `TokenDate` (no destructive reset needed).
- **Data Quality Task**: daily report of potential duplicates by name+DOB+phone; human review at Reception/Admin.
- **Lobby Refresh**: watchdog to keep token display live (health‑check pings + auto‑reconnect).

---

## 107) Acceptance Criteria
- Register 3 new patients → `A00001`, `A00002`, `A00003` (no year, 6‑char).  
- Create 5 Pathology visits today → tokens `P-001…P-005`. Tomorrow begins at `P-001`.  
- Same patient returns after 6 months → same **permanent ID**, **new** daily token; all prior results visible.  
- Lobby shows **NOW** + **NEXT 3** per dept with real‑time updates.  
- Reports/invoices carry **both** Permanent ID and **today’s token**.

---
**End of Part 10.**

# SynOS – System Specification (Part 11: Analytics, Test Master & Audit Trail)

> Closes three critical gaps: **role‑based analytics APIs**, **Test & Parameter master + CSV import/migration**, and **end‑to‑end user auditing**.

---

## 110) Analytics APIs (Role‑Based, Cached)

**Endpoints**
- `GET /api/v1/analytics/dashboard?role={role}&date={YYYY-MM-DD}` – summary bundle for a role
- `GET /api/v1/analytics/kpi/{kpiName}?range=today|7d|30d` – single KPI
- `GET /api/v1/analytics/charts/{chartName}?filters=...` – a chart series
- `GET /api/v1/analytics/reports?dept=pathology|radiology&status=pending|final` – report queues

**Caching**
- KPIs: **60–120s**
- Charts: **300–900s**
- Real‑time deltas via **SignalR** to nudge widgets

**Role Filters**
- Reception: visits today, paid %, token queues, collections
- Path Lab Tech: pending results, verification queue, delta flags, TAT
- Pathologist: pending signatures, critical alerts, addenda, TAT
- Radiology Tech/Radiologist: scan backlog, reports signed
- Admin: revenue, discounts, referral payouts, system health

**Example SQL Sketches**
- Patients today: `SELECT COUNT(*) FROM Visits WHERE CAST(CreatedAt AS DATE)=CAST(GETDATE() AS DATE);`
- Revenue today: `SELECT SUM(NetAmount) FROM Invoices WHERE CAST(CreatedAt AS DATE)=CAST(GETDATE() AS DATE);`
- TAT distribution: group by `DATEDIFF(HOUR, CreatedAt, SignedAt)` on Reports

---

## 111) Test Master + Parameters (Admin + CSV Import)

**DB**
- `Tests(TestId PK, TestCode UNIQUE, TestName, Department, Category, BasePrice, IsActive, CreatedAt)`
- `Parameters(ParameterId PK, TestId FK, ParameterCode, ParameterName, Unit, RefLow, RefHigh, CriticalLow, CriticalHigh, IsActive)`

**Admin UI**
- Test list + status + price; inline edit
- Parameter grid per test
- Import/Export CSV

**CSV Import**
```
TestCode,TestName,Category,BasePrice,ParameterCode,ParameterName,Unit,RefLow,RefHigh,CriticalLow,CriticalHigh
CBC,Complete Blood Count,Hematology,300,WBC,White Blood Cell Count,10^3/µL,4.5,11.0,,
CBC,Complete Blood Count,Hematology,300,RBC,Red Blood Cell Count,10^6/µL,4.5,5.9,,
```
Validation: required fields, numeric ranges, duplicate codes, department mapping.

**Endpoints**
- `POST /api/v1/admin/tests/import-csv`
- `GET  /api/v1/admin/tests`
- `POST /api/v1/admin/tests`
- `PUT  /api/v1/admin/tests/{testId}`
- `GET  /api/v1/admin/tests/{testId}/parameters`
- `POST /api/v1/admin/tests/{testId}/parameters`

**Migration (Old DLMS → SynOS)**
1. Export tests/parameters as CSV
2. Normalize codes, units, ranges
3. Import via API
4. Verify counts and sample render

---

## 112) User Management & Audit Trail (Compliance)

**Users (enhanced)**
- `Users(UserID PK, Email UNIQUE, FullName, PasswordHash, RoleID, Department, MFAEnabled, LastLogin, IsActive, CreatedAt, CreatedBy)`
- Role examples: `Reception`, `PathTech`, `Pathologist`, `RadTech`, `Radiologist`, `Delivery`, `HR`, `Admin`

**Audit Log**
- `AuditLog(AuditLogID PK, UserID FK, Action, Entity, EntityID, OldValue, NewValue, Timestamp, IPAddress, Details)`
- Indexes: `IX_AuditLog_UserID`, `IX_AuditLog_Timestamp`

**Typical Events**
- `Sample.Collected` (who/when/tube/barcode)
- `Result.Entered` / `Result.Corrected`
- `Report.Signed`
- `Login.Success` / `Login.Failed`

**Endpoints**
- `POST /api/v1/admin/users` (create; auto‑generate `USR_<DEPT>_<SEQ>`)
- `GET  /api/v1/admin/users` (paginated)
- `GET  /api/v1/audit-logs` (filters: action, entity, userId, date range)
- `POST /api/v1/audit-logs/export` (CSV)

**Compliance Queries**
- All actions by a user today
- Full history of a sample/result/report
- Who signed report X and when

---
**End of Part 11.**