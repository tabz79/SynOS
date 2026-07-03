# SynOS & TBZ Middleware Complete System Architecture

This document provides a comprehensive, deep-dive explanation of SynOS and the TBZ Middleware. It details their roles, modules, internal architectures, configurations, data models, integration pipelines, and real-time coordination loops. It is designed to provide full context to any Large Language Model (LLM) or developer working on or auditing this codebase.

---

## 1. Executive Summary: The Diagnostic Operating System

### What is SynOS?
SynOS is a modern, high-performance **Diagnostic Operating System** designed for medical laboratories and diagnostic centers. Unlike legacy pull-based Laboratory Information Management Systems (LIMS), SynOS is **push-based and event-driven**, orchestrating workflows across reception desks, phlebotomy collection bays, testing counters, radiology suites, pathologist rooms, and administrative ledgers in real-time.

### Architectural Philosophy
* **Operator-First Workflows**: Tailored workspaces designed to reduce cognitive load and click counts for technicians, front-desk staff, and clinicians.
* **Technical Abstraction**: Hides database schemas and engineering complexities from the operator, utilizing operational naming conventions (e.g., *Test Master*, *Catalog*, *Parameters*, *Overrides*, and *Report Layouts*).
* **Premium User Experience (UX)**: Features high-fidelity design, instant UI responsiveness, smooth transitions, and high contrast standards (`text-zinc-600` or higher).

---

## 2. SynOS Core System Architecture

SynOS is built as a classic Client-Server system with three main components:
1. **Frontend Client**: A rich, interactive React application ([SynOS.Frontend](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend)) wrapper that can run in standard browsers or inside an Electron shell to handle native desktop integrations (such as direct webContents thermal printing).
2. **Backend Web API**: An ASP.NET Core application ([SynOS.Api](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Api)) running on port `59999` using Kestrel, handling authentication, business logic, inventory, billing, PACS routing, and PDF generation.
3. **Database Layer**: Entity Framework Core mapping to a SQL Server database (LocalDB during development, configured in `appsettings.json`).

```
[ Electron / Browser Client ] <---(SignalR / REST)---> [ SynOS.Api (Port 59999) ]
                                                              │
                                                              ▼
                                                       [ SQL Server Db ]
```

### Core Modules & Responsibilities

#### A. Reception & Billing (`ReceptionScreen.jsx`, `IntentPanel.jsx`)
* **Purpose**: Registers patients, schedules visits, creates invoices, calculates prices, and processes payments.
* **Key Features**:
  * **Interactive Billing**: Searches and attaches tests dynamically.
  * **B2B Partner Mapping**: Automatically applies customized referral doctor and B2B lab rates.
  * **Discount Governance**: Applies rules-based discounts.
  * **Release Signal**: Once payment is received/verified, it broadcasts a SignalR event that releases the patient in the Phlebotomy or Radiology queues.

#### B. Sample Collection & Phlebotomy (`PhlebotomyScreen.jsx`)
* **Purpose**: Manages biological specimen draws (blood, urine, swabs) and generates barcode labels.
* **Key Features**:
  * **Release Check**: Keeps patients blocked in a "Pending Payment" state until released by Billing.
  * **Specimen Registration**: Scans/generates barcode IDs and records collection timestamps.
  * **Direct Routing**: Promotes patient state immediately to laboratory department workbenches.

#### C. Laboratory Department Workbenches (`DepartmentWorkbenchScreen.jsx`)
* **Purpose**: Allows lab technicians to view pending samples and enter clinical values.
* **Key Features**:
  * **Inline Spreadsheet Grid**: Optimized for fast keyboard navigation during data entry.
  * **Smart Range Checks**: Compares entered values against reference ranges in real-time, auto-flagging abnormal or critical levels based on patient age and gender.

#### D. Transcription & Typist Terminal (`TypistTerminal.jsx`)
* **Purpose**: Medical typists format narrative results and structure diagnostic draft reports.
* **Key Features**:
  * **Split-Screen Layout**: Left pane displays entered raw values; right pane holds a WYSIWYG rich-text template editor.
  * **Macros**: Employs rapid shorthand keyboard macros for clinical typing.

#### E. Clinical Signing Authority (`PathologistTerminal.jsx`)
* **Purpose**: Allows certified pathologists and radiologists to review results, cross-examine historical trends, and digitally approve reports.
* **Key Features**:
  * **Signature Enforcement**: Restricts signing slots to specific roles (`Default Pathologist (Lab Owner)`, `Additional Pathologist`, `Radiologist`). The `Default Pathologist` slot is required, pre-selected, and locked from deletion.
  * **Interactive PDF signing sheet**: Generates and displays the final PDF on-screen for validation prior to signing.

#### F. PDF Generation Engine (`QuestPdfReportRenderer.cs`)
* **Purpose**: Compiled PDF reports are rendered using QuestPDF, dynamically styling reports according to the JSON layout template configured in the database.
* **JSON DSL Configurations**:
  * Page margins (`TopMargin`, `BottomMargin`, `LeftRightMargin`).
  * Branding options (`IncludeBranding`, `IncludeLogo`, `IncludeHeaderName`, `IncludeHeaderSubtitle`).
  * Canvas options (`BgType` [Solid/Gradient/Image], `BgColor`, `BgGradientStart`, `BgGradientEnd`, `BgGradientAngle`, `BackgroundPath` [Base64 image string]).
* **Preprinted vs. Digital Printing Modes**:
  * **Digital Mode**: Renders full color schemes, background gradients, clinic logos, divider lines, and footer grids.
  * **Preprinted Mode (`usePreprinted` = true)**: Omitted during printing on preprinted paper. It programmatically hides background graphics, divider lines, the main billing/reporting metadata grid table, and clinic headers to prevent overlap on physical letterhead.
  * **Absolute Positioning (`enableAbsolutePositioning` = true)**: Instead of rendering patient metadata inside a standard flow table, it places the patient's details (`Patient Name`, `Ref. by Dr.`, `Age/Sex`, `ID No.`, `Date of Billing`, `Date of Reporting`) at exact coordinates (`X`, `Y` offsets in millimeters) mapped from the React template designer relative to the page.

#### G. Administrative Operations (Exception-Based)
* **Finance**: Ledger tracking integrated with billing. B2B payouts and outsource reference lab billing are reconciled automatically.
* **Inventory**: Automatically decrements reagent and consumable stock levels based on consumption mappings when reports are signed. Alerts trigger when stock hits threshold.
* **HR & Payroll**: Exception-only attendance logs (assumes present by default). Automates monthly payroll adjustments from leaves or late check-ins.

---

## 3. TBZ Middleware Architecture

The TBZ Middleware is a standalone, event-driven integration suite designed to handle analytics projections, webhook ingest, and automated WhatsApp notification deliveries.

```
[ SynOS.Api ] --(Outbox Push)--> [ TBZ.Middleware.Api (Port 5069) ] <---> [ SQLite (MiddlewareDb.db) ]
                                            │
                                            ▼
                                   [ Meta Graph API ]
```

### Technical Stack
* **Database**: Local SQLite database ([MiddlewareDb.db](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/TBZ.Middleware/src/TBZ.Middleware.Api/MiddlewareDb.db)) containing audit logs, enqueued notifications, and projected facts.
* **Backend Web API**: ASP.NET Core application ([TBZ.Middleware.Api](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/TBZ.Middleware/src/TBZ.Middleware.Api)) running on port `5069`.
* **Control Tower Frontend**: Vite-powered React/TypeScript application ([web](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/web)) enabling administrators to view metrics and configure Meta WhatsApp integrations.

### Database Fact Tables
The Middleware projects incoming raw JSON events into specialized tables for analytics:
* `StoredEvents`: Persists raw JSON payloads received from SynOS.
* `PatientVisitFact`: Represents visit demographics, B2B mappings, billing values, and referring doctors.
* `PatientIntelligenceFact`: Consolidates long-term patient records and diagnostics.
* `DoctorReferralFact` & `ReferralPartnerFact`: Track financial performance and commission ledgers.
* `NotificationMessage` & `NotificationOutbox`: Queue and track WhatsApp and SMS notifications.

---

## 4. SynOS to Middleware Connection & Integration Flows

```
  SynOS SQL Server              HTTP POST               Middleware SQLite
┌──────────────────┐        ┌──────────────┐         ┌─────────────────────┐
│  Outbox Events   ├───────>│ /api/events  ├────────>│ StoredEvents Table  │
└──────────────────┘        └──────────────┘         └──────────┬──────────┘
                                                                │
                                                                ▼
                                                     [ Relational Facts /  ]
                                                     [ Notification Queues ]
```

### A. The Transactional Outbox Pattern
To guarantee data consistency between SynOS (SQL Server) and the Middleware (SQLite) without complex distributed transactions:
1. When a visit is billed or a report signed, SynOS saves the state change and writes a corresponding event (e.g., `BillCreated`, `ReportDeliveryRequestedEvent`) to its local `OutboxEvents` table in SQL Server in a single transaction.
2. A background service in SynOS (`MiddlewareSyncWorker`) polls this outbox table, serialization-formats the event, and pushes it to the Middleware's `/api/events` endpoint via HTTP POST.
3. The Middleware writes the event to its SQLite `StoredEvents` table and marks the event as processed. A projection engine (`OperationalStatsProjectionWorker`) handles secondary updates asynchronously.

### B. WhatsApp Secure Report Delivery Pipeline
When a report is signed and WhatsApp delivery is requested:
1. SynOS enqueues a `ReportDeliveryRequestedEvent` carrying a secure download link created by `DeliveryService` using the configured `SecureLink:PublicBaseUrl`.
2. The `MiddlewareSyncWorker` posts the event to the Middleware API.
3. The Middleware API extracts the phone number, patient name, investigation summary, and the secure URL:
   * URL Format: `https://<cloudflare-domain>/r/{token}`
4. The Middleware enqueues the notification request into the SQLite database.
5. The Middleware's notification dispatcher formats the request into a Meta Graph API call using template `report_ready` with the parameters:
   * `{{1}}`: PatientName
   * `{{2}}`: DownloadLink (SecureReportUrl)
   * `{{3}}`: InvestigationSummary
6. The request is transmitted to Meta's WhatsApp servers.

---

## 5. Webhook Routing & Tunnel Integration (The Hybrid Tunneling Strategy)

Meta requires a public URL to send webhook events (subscription challenges and read/delivery receipts). However, developers typically run a single Cloudflare Quick Tunnel to expose the local system.

Because patient secure download links must reach `SynOS.Api` (port `59999`) and Meta webhooks must reach `TBZ.Middleware.Api` (port `5069`), SynOS employs a **Hybrid Tunneling Strategy**:

```
                       [ Cloudflare Quick Tunnel ]
              (Exposing Port 59999 - SynOS.Api on Public URL)
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          Patient Downloads                    Meta Webhooks
          (Served Locally)              (Proxied to Port 5069)
                  │                                   │
                  ▼                                   ▼
        [ SynOS.Api (59999) ]               [ SynOS.Api (59999) ]
                                                      │
                                                      ▼ (HTTP Redirect/Forward)
                                            [ TBZ.Middleware.Api (5069) ]
```

1. **The Cloudflare Tunnel** points exclusively to the SynOS.Api port:
   `cloudflared tunnel --url http://127.0.0.1:59999`
2. **Patient Downloads** `/r/{token}` are resolved directly by SynOS.Api.
3. **Meta Webhook calls** are intercepted by a proxy controller in SynOS.Api:
   * Path: `/api/webhooks/whatsapp`
   * Controller: [WhatsAppWebhookProxyController.cs](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Api/Controllers/WhatsAppWebhookProxyController.cs)
4. **Proxy Forwarding**:
   * **`GET` (Verification Challenges)**: The proxy forwards `hub.mode`, `hub.verify_token`, and `hub.challenge` to the local Middleware instance on port `5069`, returning the challenge back to Meta.
   * **`POST` (Status Updates)**: The proxy forwards the raw event body and Meta signature headers (`X-Hub-Signature-256`) to the Middleware.
5. This allows a single tunnel domain to handle both clinical report downloads and real-time integration webhooks seamlessly.
