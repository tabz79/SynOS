# SynOS - Product Brain

## What is SynOS?

SynOS is a Diagnostics Lab Operating System designed for high-throughput diagnostic laboratories.

It is not merely a Lab Management System (LMS/LIMS).

Its primary objective is operational control of the laboratory from patient arrival to report delivery.

Core philosophy:

- Fast
- Reliable
- Operational First & Always Available On-Premise
- Low Hardware Friendly
- Queue Driven
- Role Based
- Zero Ambiguity Workflows

---

# Core Patient Journey

Patient Arrival
→ Reception
→ Billing
→ Payment Confirmation
→ Sample Collection (Isolated Phlebotomy Queue) / Radiology Routing
→ Processing Workbench / PACS DICOM Suite
→ Typing / Draft Findings
→ Verification & Digital Signature
→ Delivery (Print / WhatsApp via Hybrid Middleware)

---

# Primary Departments

## Pathology

Handles:

- Hematology
- Biochemistry
- Clinical Pathology
- Microbiology
- Serology
- Immunology

Workflow:

Reception
→ Phlebotomy Queue (Isolated)
→ Workbench
→ Typist
→ Pathologist
→ Delivery Desk

---

## Radiology

Handles:

- X-Ray
- Ultrasound
- CT
- MRI

Workflow:

Reception
→ Technician (MWL Worklist / PACS DICOM Upload)
→ Radiologist Draft Findings (`/api/v1/radiology/reports/{studyId}`)
→ Radiologist Verification & Digital Signature (`ReportSnapshot` & `ReportVersion`)
→ Delivery Desk

Radiology bypasses:

- Sample Collection
- Lab Workbench

---

# Core Design Principles

## Operational Status Driven

All queues derive from operational state.

Examples:

- Ready for Sample
- Pending Collection
- Collected
- In Processing
- Reporting
- Reported
- Delivered

---

## Single Source of Truth

Operational state is derived centrally.

Frontend screens must not invent workflow rules.

---

## Report First Architecture

Reports are generated from snapshot structures.

Snapshots represent immutable report data at a specific point in time (`ReportVersion` and `ReportSnapshot`).

---

## Catalog Driven

Tests, parameters, profiles and report structures are driven from catalog definitions (Test Master).

No hardcoded medical definitions in UI.

---

# Product Goals

1. Diagnostics Labs
2. Diagnostic Chains
3. Multi Branch Labs
4. Radiology Centers
5. Pathology Centers

---

# Non Goals

- Hospital EMR
- IP Billing
- Pharmacy Management
- General ERP

These may integrate later but are not core.

---

# Implemented Extensions & Hardened Pipelines

## QuestPDF Absolute A4 Coordinate Engine
* Reports are rendered dynamically via QuestPDF using templates designed in React.
* When `enableAbsolutePositioning` is true, all patient metadata is positioned at precise `X` and `Y` coordinate offsets (in millimeters) relative to the page canvas, enabling compatibility with preprinted background paper letterheads.

## Non-Blocking On-Premise Resilience & License Auto-Healing
* Local operational APIs and WebSockets are NEVER blocked with HTTP 403 errors if network or subscription sync issues occur (`SessionValidationMiddleware.cs`).
* Licensing system uses IPv4-first `SocketsHttpHandler` callback to bypass dual-stack DNS timeouts.
* Direct local middleware validation probes port **`5069`** (`http://localhost:5069/api/labs/validate`).
* UI includes a 1-click **Sync License** button on the Control Tower dashboard for immediate auto-healing status synchronization.

## Active Session Preserving Database Backup & Restore Pipeline
* Pre-restoration caching of restoring user GUID/claims (`"sub"` claim fallback), roles (`UserRole`), branch assignments (`UserBranchRole`), workspace access (`UserWorkspaceAccess`), and employee profile (`Employee`).
* Post-restore role name-to-ID mapping (`roleIdToNameMap`) prevents `FK_UserBranchRoles_Roles_RoleId` foreign key violations.
* `NT AUTHORITY\SYSTEM` service account has `sysadmin` role in SQL Server (`.\SYNOS`), enabling `RESTORE DATABASE WITH REPLACE` to run without permission errors.

## Safe Operational Data Reset Pipeline
* `ResetOperationalData` endpoint in `SettingsController.cs` validates administrator password hash via `BCrypt.Net.BCrypt.Verify`.
* Automatically creates an emergency database backup before purging transactional tables while preserving static masters, users, roles, settings, and templates.

## Radiology Findings Draft & Immutable Snapshot Engine
* Draft findings persist via `fetchReportDraft` (`/api/v1/radiology/reports/{studyId}`).
* Signing generates rich narrative HTML, updates `ReportInterpretation`, and stores immutable `ReportVersion` & `ReportSnapshot` records.

## Transactional Outbox & Hybrid Middleware Sync
* Domain events enqueued in the local outbox table are picked up by `MiddlewareSyncWorker` and synced to standalone TBZ Middleware (port 5069).
* Meta webhooks (`/api/webhooks/whatsapp`) received on SynOS.Api (port 59999) are reverse-proxied to Middleware on port 5069 over a single Cloudflare Quick Tunnel (`WhatsAppWebhookProxyController.cs`).

## Desktop Operations Console (SynOS Server Manager)
* Standalone WPF desktop application (`SynOS.ServerManager.exe`) published with embedded `<Resource Include="SynOS.ico" />` assets and deployed into `{app}\ServerManager`.
* Enables local laboratory administrators to monitor backend Windows services (`TBZSynOSService`), SQL Server engine state, database connectivity, and port listeners (`59999`, `5069`), with 1-click service control and logs viewing.

-------

## Technical Debt:
Parameter definitions are duplicated between standalone tests and profile tests.

## Future Architecture:
Introduce ParameterMaster and TestParameterLinks.

Target version:
Post-MVP / v2 architecture migration.