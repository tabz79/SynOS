# SYNOS CURRENT STATE (AUGUST 2026)

## Project Overview

SynOS is a full Diagnostic Laboratory & Radiology Operating System developed by TBZ Labs.

The system is designed for single-location diagnostic centers, multi-branch laboratory chains, and hospital diagnostic units. It focuses on operational workflow execution and real-time laboratory throughput rather than traditional hospital administrative ERP functions.

Core philosophy:

* **Operational First & Always Available On-Premise**: Local lab operations are strictly non-blocking and NEVER fail or block users with HTTP 403 errors during cloud network outages or subscription sync delays.
* **Queue & Workflow Driven**: Strict status progression from Reception to Phlebotomy, Processing, Verification, and Delivery.
* **High Performance on Low-End Hardware**: Fast response times and optimized resource consumption on entry-level Windows client/server hardware.
* **Multi-Branch & Role-Aware Architecture**: Multi-branch isolation, central governance, and granular permission enforcement.
* **Unified Pathology & Radiology Engine**: Pathology sample workflows operating seamlessly alongside Radiology PACS/DICOM imaging suites.
* **Hybrid Cloud & Intelligence Ready**: On-premise primary operational engine coupled with standalone event-driven Middleware for analytics, WhatsApp delivery, and AI capabilities.

---

## Current Architecture

### 1. Backend Service Layer (`SynOS.Api` — Port `59999`)
* **Framework**: ASP.NET Core 8.0 running on .NET 8.0 runtime.
* **ORM & Database**: Entity Framework Core targeting Microsoft SQL Server (Local / Named Instances e.g., `.\SYNOS` / `SynOSDb-1`).
* **Real-time Engine**: SignalR Hubs (`/hubs/branchOperationsHub`) for live workbench updates, queue notifications, and audit logging.
* **Report Generation**: QuestPDF dynamic PDF engine supporting absolute coordinate positioning (mm) for preprinted background paper letterheads.
* **Network & Connectivity**: Outbound cloud activation and license check calls use `SocketsHttpHandler` with an explicit IPv4-first `ConnectCallback` (`AddressFamily.InterNetwork`) to bypass 15-21s timeouts on dual-stack hosts (`cloud.tbzlabs.in`).
* **Session & Middleware Hardening**: `SessionValidationMiddleware.cs` enforces on-premise operational continuity, allowing local diagnostic workflows to execute without HTTP 403 locks.

### 2. Standalone Middleware Layer (`TBZ.Middleware.Api` — Port `5069`)
* **Framework**: Lightweight ASP.NET Core 8.0 service.
* **Storage**: SQLite database (`MiddlewareDb.db`).
* **Event Processing**: Listens to domain events pushed by `MiddlewareSyncWorker` from SynOS SQL Server `OutboxEvents`.
* **Fact Projections**: Aggregates operational records into `PatientVisitFact` and `PatientIntelligenceFact` tables for cross-branch analytics.
* **WhatsApp Dispatcher**: Calls Meta Graph API using template `report_ready` for direct patient report delivery.
* **License & Local Validation**: Provides local `/api/labs/validate` endpoint. Automatically reactivates lab subscription (`Status = "Active"`) when `ExpiryDate >= DateTime.UtcNow`.

### 3. Frontend Web Application (React + Vite — Port `5173` / `wwwroot`)
* **Framework**: React 18 with Vite build tooling, styled with custom Vanilla CSS design tokens, dynamic animations, and dark/light UI modes.
* **Control Tower Dashboard**: Displays real-time lab metrics, operational state, license status, and a **1-Click Sync License** button for instant license auto-healing.
* **Role Views**: Dedicated interfaces for Reception, Phlebotomy, Lab Workbench (Pathology), Radiology DICOM Suite, Typist, Pathologist/Radiologist Verification, and Delivery Desk.

### 4. Desktop Operations Console (`SynOS.ServerManager.exe`)
* **Framework**: Standalone WPF application built on .NET 8.0-windows, compiled with embedded high-resolution application icon (`SynOS.ico`), deployed into `{app}\ServerManager`.
* **Functions**: Enables local laboratory administrators to start/stop Windows backend services (`TBZSynOSService`), inspect SQL Server connection strings, monitor active port listeners (`59999`, `5069`), and view real-time system logs.

---

## Core Implemented Workflows & Pipelines

### 1. Phlebotomy Queue Isolation
* Dedicated Phlebotomy Sample Collection interface, separate from the general Lab Processing Workbench.
* Phlebotomists track pending collections, record tube barcodes, select collection sites/specimen types, and record collection timestamps before advancing samples to the Pathology Workbench.

### 2. Radiology Findings Draft & Immutable Snapshot Engine
* **Draft Findings Persistence**: Radiologists can type and save partial report findings via `fetchReportDraft` (`/api/v1/radiology/reports/{studyId}`) without prematurely finalizing reports.
* **Verification & Digital Signature**: Signing a report generates a rich narrative HTML report body, updates `ReportInterpretation`, and stores immutable `ReportVersion` & `ReportSnapshot` records in SQL Server. Empty findings guards prevent signing incomplete draft reports.

### 3. Absolute A4 Coordinate QuestPDF Letterhead Engine
* Reports are rendered dynamically via QuestPDF using templates created in React.
* When `enableAbsolutePositioning` is true, patient metadata, test headers, and signature blocks are placed at exact `X` and `Y` millimeter coordinate offsets, allowing seamless printing on pre-printed letterhead paper.

### 4. 1-Click License Sync & Self-Healing Auto-Healing Pipeline
* **Local Validation Probe**: Probe order includes local port `5069` (`http://localhost:5069/api/labs/validate` and `http://127.0.0.1:5069/api/labs/validate`).
* **1-Click Sync Button**: Placed on the Control Tower dashboard (`ControlTowerDashboard.jsx`), sending a `RefreshLicense` command or calling `TriggerSelfHealingRecoveryAsync(force: true)` to sync license status instantly.
* **Non-Blocking Continuity**: Inactive or expired subscription status displays non-intrusive UI warning banners while maintaining full local operational access.

### 5. Active Session Preserving Database Backup & Restore Pipeline
* **Session Preservation**: Before restoring a SQL Server database backup `.bak` file, `BackupService.cs` caches the active restoring administrator's GUID (extracting `User.FindFirst("sub")?.Value` claim), roles (`UserRole`), branch assignments (`UserBranchRole`), workspace access (`UserWorkspaceAccess`), and employee profile (`Employee`).
* **Constraint Protection**: Post-restore role name-to-ID mapping (`roleIdToNameMap`) prevents `FK_UserBranchRoles_Roles_RoleId` foreign key constraint violations.
* **Database Engine Permissions**: `NT AUTHORITY\SYSTEM` service account holds the `sysadmin` server role in SQL Server (`.\SYNOS`), enabling `RESTORE DATABASE WITH REPLACE` to run without permission errors.

### 6. Safe Operational Data Reset Pipeline
* `ResetOperationalData` endpoint in `SettingsController.cs` verifies the administrator's password hash using `BCrypt.Net.BCrypt.Verify`.
* Automatically creates an emergency database backup before purging transactional tables (visits, phlebotomy, samples, lab results, bills, reports) while retaining static masters, user accounts, roles, settings, and templates.

### 7. WhatsApp Delivery & Hybrid Single-Tunnel Webhook Proxy
* **Domain Event Dispatch**: `ReportDeliveryRequestedEvent` written to `OutboxEvents` is polled by `MiddlewareSyncWorker` every 30s and sent to Middleware (port 5069) for Meta Graph API dispatch.
* **Single-Tunnel Webhook Proxying**: A single Cloudflare Quick Tunnel maps port `59999` to public web traffic (`https://<cloudflare-domain>`). Patient download links (`/r/{token}`) hit port `59999` directly, while Meta webhooks (`/api/webhooks/whatsapp`) are reverse-proxied by `WhatsAppWebhookProxyController.cs` on port `59999` to `TBZ.Middleware.Api` on port `5069`.

### 8. Installer & Packaging Stability (`SynOS_Setup_v152_final.exe`)
* Compiled with Inno Setup 6.
* Custom data decommission form configured with `UninstallForm.FormStyle := fsStayOnTop` to ensure the uninstallation dialog renders cleanly in the foreground on Windows.

---

## Infrastructure Port Topology & Database Layout

| Component | Port / Instance | Technology | Description |
| :--- | :--- | :--- | :--- |
| **SynOS.Api** | `59999` | ASP.NET Core 8.0 | Primary backend API, WebSockets, QuestPDF, SQL Server connection |
| **TBZ.Middleware.Api** | `5069` | ASP.NET Core 8.0 | Standalone event processor, SQLite fact store, Meta WhatsApp dispatcher |
| **Frontend Web App** | `5173` (Dev) / WebRoot | React 18 + Vite | Single Page Application UI with Control Tower & Department Workbenches |
| **SynOS Server Manager** | Standalone Executable | WPF .NET 8.0-windows | Desktop administration console (`{app}\ServerManager\SynOS.ServerManager.exe`) |
| **Primary Database** | `.\SYNOS` / `SynOSDb-1` | SQL Server | Transact-SQL relational database holding operational masters & clinical data |
| **Analytics Database** | Local File | SQLite (`MiddlewareDb.db`) | Embedded database storing event outbox logs & fact projections |

---

## System Status & Health Summary

* **On-Premise Operations**: 100% Operational & Non-Blocking.
* **Licensing Auto-Healing**: Verified working locally via port 5069 and remotely via Control Tower.
* **Database Backup & Restore**: Fully hardened against lockout and foreign key errors.
* **Pathology & Phlebotomy**: Dedicated isolated Phlebotomy queue and Workbench operational.
* **Radiology Suite**: Draft findings persistence, signing narrative HTML generation, and immutable snapshots verified.
* **WhatsApp Dispatch**: Webhook proxying operational via single-tunnel architecture.
