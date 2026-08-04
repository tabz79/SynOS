# SynOS: The Diagnostic Operating System (Operating Model)

This document outlines the system architecture, organizational relationships, departmental pipelines, real-time synchronization flows, resilience mechanisms, and management controls of SynOS. It serves as a blueprint for designing interactive visual storyboards, scroll-driven narratives, and system orchestration diagrams for the TBZ Labs product experience page.

---

## 1. Executive Overview

### What is SynOS?
SynOS is not a traditional Laboratory Information Management System (LIMS) or Diagnostic Laboratory Management System (DLMS). It is a **Diagnostic Operating System**. 

Legacy software acts as a static database—a system of record where operators manually input data after tasks are finished. SynOS acts as a **system of action and coordination**. It runs a real-time event-driven loop that active-syncs reception desks, phlebotomy bays, laboratory counters, radiology suites, pathologist desks, and administration ledgers.

```
       [ Reception Desk ] ----(Registration)----> [ Billing & Payment ]
               |                                           |
               |                                           v
    [ Live Activity Stream ] <---(Updates)------- [ Phlebotomy Queue (Isolated) ]
               |                                           |
               v                                           v
      [ Director Dashboard ]                     [ Department Workbench ]
                                                 (Lab / Path / Radio / CT)
```

### Why it is called an "Operating System"
In computing, an Operating System schedules tasks, coordinates hardware devices, manages resource consumption, and handles communication between processes. 

SynOS does the same for a diagnostic center:
1. **Process Scheduler (Action Queues)**: Schedules patient workflows across departments, routing them dynamically based on payment status, sample viability, and machine availability.
2. **Device Coordination (PACS & DICOM)**: Connects imaging hardware directly to radiologist workspaces.
3. **Resource Management (Inventory Engine)**: Tracks reagent and consumable consumption automatically as tests run.
4. **Inter-Process Communication (SignalR & Real-Time Deltas)**: Broadcasts updates across terminals immediately, eliminating verbal check-ins and walking between departments.
5. **On-Premise Resilience & Fault Isolation**: Operates completely independently on client hardware; network or licensing sync hiccups never disrupt local clinical operations.

---

## 2. Organizational Structure

SynOS models the physical topology of a diagnostic laboratory. The following roles and departments participate in the system:

```
                          ┌──────────────────────────┐
                          │   Director / Owner       │
                          └────────────┬─────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
  ┌──────────────────────────┐                  ┌──────────────────────────┐
  │      Administration      │                  │    Clinical Operations   │
  └─────────────┬────────────┘                  └─────────────┬────────────┘
                │                                             │
      ┌─────────┼─────────┐                         ┌─────────┼─────────┐
      ▼         ▼         ▼                         ▼         ▼         ▼
  ┌───────┐ ┌───────┐ ┌───────┐                 ┌───────┐ ┌───────┐ ┌───────┐
  │Finance│ │  HR   │ │Inventory                │Recepn │ │Lab/Phl│ │Imaging│
  └───────┘ └───────┘ └───────┘                 └───────┘ └───────┘ └───────┘
```

1. **Director**: The owner/management user who monitors operations, financials, performance KPIs, and workflow funnels from a single high-level panel.
2. **Administration**: Responsible for billing governance, revenue/expense reconciliation, purchasing, staff management, and system restores/resets.
3. **Reception & Billing**: The initial touchpoint for patient registration, invoice generation, discount application, and payment verification.
4. **Sample Collection (Phlebotomy - Isolated Bay)**: The partitioned bay where biological samples (blood, urine, swab) are drawn, barcoded, and validated.
5. **Laboratory Departments (Pathology / Biochemistry / Hematology / Microbiology)**: The analytical core where samples are loaded onto analyzers and parameters are recorded.
6. **Imaging Departments (Radiology / MRI / CT / Ultrasound)**: The diagnostic imaging suites where scans are captured and sent to the PACS (Picture Archiving and Communication System).
7. **Reporting & Transcription**: The typing pool where draft reports are formatted, using medical macros for fast data entry.
8. **Clinical Signing Authority (Pathologists & Radiologists)**: Certified doctors who review results, compare parameters with historical benchmarks, draft findings, and digitally sign reports.

---

## 3. Department Responsibilities

### Reception & Billing
* **Primary Responsibilities**: Patient check-in, demographic recording, B2B partner mapping, test billing, cash/online payment collections, and invoice printing.
* **Outputs**: Registered Patient MRN, Billing Invoices, Payment Status tokens.

### Sample Collection (Phlebotomy - Isolated Queue)
* **Primary Responsibilities**: Partitioned sample collection queue, specimen extraction, barcode labeling, sample check-in, and verification of fasting/safety protocols.
* **Outputs**: Physical barcoded tubes, Sample Collected events in the system.

### Laboratory Departments (Pathology, Biochemistry, etc.)
* **Primary Responsibilities**: Analytical processing of biological specimens, recording parameter values, flag verification (abnormal/critical values).
* **Outputs**: Raw parameter results, abnormal alerts.

### Imaging Departments (MRI, CT, Ultrasound, X-Ray)
* **Primary Responsibilities**: Patient scanning, DICOM metadata association, image transfer to PACS, draft findings persistence (`/api/v1/radiology/reports/{studyId}`), and radiologist reporting.
* **Outputs**: High-resolution DICOM slices stored in PACS, immutable `ReportVersion` and `ReportSnapshot` records.

### Reporting & Transcription
* **Primary Responsibilities**: Speed-typing pathology narratives, formatting templates, applying medical macros, and organizing draft reports for doctor reviews.
* **Outputs**: Formatted clinical reports awaiting signature.

### Pathologists & Radiologists (Clinical Signing Authority)
* **Primary Responsibilities**: Medical validation of findings, historical comparison, report signing, and dispatching critical notifications.
* **Outputs**: Electronically signed PDF reports (Digital or Preprinted formats using QuestPDF A4 absolute coordinates).

### Administration & Finance
* **Primary Responsibilities**: Ledger tracking, B2B doctor commission management, procurement, expense tracking, payroll processing, database backup/restoration, and operational data resets.
* **Outputs**: Profit & Loss statements, stock purchase orders, payroll disbursements, backup files.

---

## 4. End-to-End Patient Journey

```
[Arrival] ──(ReceptionScreen)──> [Billing] ──(Payment verified)──> [Phlebotomy Queue (Isolated)]
                                                                         │
[Validation/Sign] <──(Pathologist/Radiologist)── [Typing/Draft] <──(Lab/PACS) ◄┘
         │
         └──(Print/WhatsApp)──> [Delivery Desk]
```

1. **Patient Arrival & Billing**: Receptionist registers demographics and billing intentions. Payment receipt fires `VisitStarted` via SignalR.
2. **Sample Collection (Phlebotomy)**: Patient appears in the isolated Phlebotomy Action Queue. Phlebotomist draws blood/sample and scans barcode, firing `SampleCollected`.
3. **Laboratory / Radiology Processing**: Lab technician logs parameters on the Workbench. Radiology technologists perform scans, linking PACS studies.
4. **Draft Findings & Transcription**: Radiologists and typists persist draft findings (`/api/v1/radiology/reports/{studyId}`).
5. **Clinical Review & Approval**: Pathologists/Radiologists review trends, approve narrative, and apply digital signature. System generates immutable `ReportVersion` and `ReportSnapshot`.
6. **Report Delivery**: Report is printed (Digital or Preprinted mode via QuestPDF A4 absolute positioning) or sent automatically via WhatsApp.

---

## 5. Real-Time Coordination Events

The heartbeat of SynOS is its real-time event-driven loop powered by SignalR:
* **`VisitStarted`**: Adds patient to Phlebotomy queue, increments walk-in KPI counter.
* **`SampleCollected`**: Moves patient from Phlebotomy to Laboratory Processing workbench.
* **`ResultsEntered`**: Highlights patient row in green and notifies typists.
* **`ReportFinalized`**: Generates signed PDF snapshot, notifies Delivery Desk, updates TAT metrics.

---

## 6. Radiology Operating Model

1. **Scan Ordering**: Reception bills the scan; worklist entry is sent directly to modality console via MWL protocol.
2. **PACS Integration**: Machine pushes DICOM files to PACS. Viewer link is attached to the SynOS patient file.
3. **Draft Findings & Dictation**: Radiologist opens record in `RadiologistTerminal.jsx`, reviews images, records dictation, and persists draft findings (`/api/v1/radiology/reports/{studyId}`).
4. **Immutable Snapshot & Release**: Upon approval, system updates `ReportInterpretation`, generates immutable `ReportVersion` and `ReportSnapshot`, attaches digital signature, and releases signed PDF.

---

## 7. System Hardening & On-Premise Resilience

SynOS implements strict architectural pipelines to guarantee continuous, zero-downtime operation on client hardware:

### Rule 1: Initial Setup & License Auto-Healing Pipeline
* Outbound activation endpoints (`/api/v1/setup/test-middleware` & `/api/v1/settings/test-middleware`) use `SocketsHttpHandler` with an IPv4-first `ConnectCallback` (`AddressFamily.InterNetwork`) to bypass 15-21 second timeouts on dual-stack hosts (`cloud.tbzlabs.in`).
* `LicenseRecoveryService.cs` checks direct local port **`5069`** (`http://localhost:5069/api/labs/validate` and `http://127.0.0.1:5069/api/labs/validate`).
* `/api/labs/validate` in Middleware auto-reactivates labs with future expiry dates.
* **Non-Blocking Guarantee**: `SessionValidationMiddleware.cs` NEVER blocks local operational routes (Reception, Workbench, Radiologist, WebSockets, Control Tower Summary) with 403 Forbidden on network or licensing sync errors. UI displays non-disruptive warning banners instead.

### Rule 2: Active Session Credential Preservation & Database Restore Pipeline
* `OperationsController.cs` and `UserContext.cs` resolve `CurrentUserId` using `ClaimTypes.NameIdentifier` with a mandatory fallback to `"sub"` (JWT subject GUID).
* Before restoring a `.bak` file, `BackupService.cs` caches the restoring administrator's GUID, roles (`UserRole`), branch assignments (`UserBranchRole`), workspace access (`UserWorkspaceAccess`), and employee profile (`Employee`).
* `NT AUTHORITY\SYSTEM` service account has `sysadmin` role in SQL Server (`.\SYNOS`), enabling `RESTORE DATABASE WITH REPLACE` to run without permission errors.
* `BackupService.cs` maps role GUIDs by role name (`roleIdToNameMap`) post-restore to prevent `FK_UserBranchRoles_Roles_RoleId` violations, seamlessly merging the restoring administrator back into the database.

### Rule 3: Operational Data Reset Pipeline
* `SettingsController.cs` (`ResetOperationalData`) validates administrator password hash using `BCrypt.Net.BCrypt.Verify`.
* Automatically creates an emergency database backup before purging transactional tables (visits, reports, bills, phlebotomy, samples) while preserving static masters, users, roles, settings, and templates.

### Rule 4: Uninstaller & Packaging Stability
* `SynOS_Setup.iss` configures `UninstallForm.FormStyle := fsStayOnTop` to ensure custom data decommission dialogs render in the foreground on Windows.

### Rule 5: Desktop Operations Console (SynOS Server Manager)
* Desktop WPF operations console (`SynOS.ServerManager.exe`) published with embedded `<Resource Include="SynOS.ico" />` packaging and bundled into `{app}\ServerManager`.
* Provides administrators with real-time monitoring of Windows services (`TBZSynOSService`), SQL Server database status, port bindings (`59999`, `5069`), and application logs with 1-click service restart capabilities.

---

## 8. WhatsApp Delivery Integration & TBZ Middleware Connection

SynOS is fully integrated with **TBZ Middleware** for event-driven diagnostics projections and patient communications:
* **Transactional Outbox Pattern**: Clinical actions enqueue events into a local SQL Server Outbox table. `MiddlewareSyncWorker` polls and posts events over HTTP to Middleware on port `5069`.
* **WhatsApp Report Delivery**: Signed reports generate a secure download link (`https://<cloudflare-domain>/r/{token}`). Middleware sends Meta Graph API template messages (`report_ready`).
* **Hybrid Webhook Proxying (`WhatsAppWebhookProxyController.cs`)**:
  A single Cloudflare Quick Tunnel is bound to SynOS.Api on port `59999`. Patient download links are resolved locally on port `59999`, while Meta webhooks (`/api/webhooks/whatsapp`) received on port `59999` are reverse-proxied to `TBZ.Middleware.Api` on port `5069`.

---

## 9. Visual Storyboard For Website

1. **Scene 1: Patient Arrival** — Receptionist registers patient in Registration Drawer.
2. **Scene 2: Dynamic Billing** — Intent Panel searches tests, applies rules-based discounts.
3. **Scene 3: Payment Confirmation** — Payment signal fires `VisitStarted`, unlocking Phlebotomy queue.
4. **Scene 4: Phlebotomy Queue (Isolated)** — Phlebotomist scans specimen barcode in dedicated queue.
5. **Scene 5: Lab Processing** — Workbench parameter grid auto-populates from analyzers.
6. **Scene 6: Radiology Scan & PACS** — MRI/CT DICOM slices transfer to PACS; viewer link lights up on Radiologist terminal.
7. **Scene 7: Reagent Consumption** — Inventory stock auto-decrements as tests are signed.
8. **Scene 8: Radiologist Draft & Sign** — Draft findings saved (`/api/v1/radiology/reports/{studyId}`); digital signature releases immutable PDF version.
9. **Scene 9: Revenue Ledger & Outbox Sync** — Clinical completion posts financial entry and outbox sync event.
10. **Scene 10: Unified Director View** — Director dashboard displays workflow funnel, TAT metrics, and 1-click License Sync.
