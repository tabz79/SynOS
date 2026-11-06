# SYNOS — AUDIT 01: COMPLETE SYSTEM-WIDE IMPLEMENTATION REPORT
**Target System:** SynOS (Diagnostic Laboratory Operating System & Enterprise ERP)  
**Repository Path:** `/Users/tabrez/TBZ-AI/Projects/SynOS`  
**Active Git Branch:** `cloud-testing-2`  
**Audit Date:** November 6, 2026  
**Audit Type:** Read-Only Source Code & Database Architecture Forensic Audit  
**Author:** DeepMind Antigravity Pair-Programming Agent (Antigravity 2.0)  
**Status:** Canonical Reference Audit (Do Not Overwrite)

---

## 1. Executive Summary

SynOS is currently deployed as a **live pilot** at a clinical diagnostic laboratory (*Sri Divya Diagnostic Centre*, Khammam). The reception desk actively uses the application for day-to-day patient registration, order entry, and cash/digital payment collection. 

### Core Audit Conclusion
**SynOS has successfully built the high-integrity operational and transactional core of a diagnostic laboratory, but it operates predominantly as a set of departmental operational logs rather than a fully synthesized Business ERP.**

1. **Transactional Engine (Strong & Mature):**
   - The core engine for patient demographics (`Patients`), multi-payer visits (`Visits`), commercial billing (`Invoices`, `Payments`), specimen tracking (`Specimens`), laboratory result entry (`Results`), and pathology report authorization (`Reports`, `QuestPdfReportRenderer`) is fully implemented in C# / EF Core / SQL Server with real database persistence.
   - Clinical accessioning, barcode label generation, department routing (Pathology vs. Radiology), and DICOM/PACS study associations are genuinely functional.

2. **The ERP Synthesis Gap (The "9-Tab Trap"):**
   - While transactional data is recorded with high integrity, the **executive synthesis layer** is fragmented.
   - Financial management has grown organically by adding new operational screens and top-level tabs (e.g., 9 separate tabs under *Finance > Revenue*).
   - Core enterprise ERP controls—specifically **Closed Shift Handover Cycles (Z-Reports / Till Drops)**, **Double-Entry General Ledger**, **Bank / Treasury Management**, and **Automated Exception Approval Workflows**—have either been partially grafted on very recently or remain unimplemented.

3. **Live Pilot Protection:**
   - Because real patients and counter payments flow through the system daily, any ERP transformation must maintain strict backward compatibility with existing tables (`Visits`, `Orders`, `Invoices`, `Payments`, `Specimens`, `Results`).

---

## 2. Technology and Repository Overview

### 2.1 Solution Structure
The solution is organized as a multi-project .NET 8 / React mono-repo:

```
SynOS/
├── SynOS.sln                               # Visual Studio Solution File
├── src/
│   ├── SynOS.Api/                          # ASP.NET Core 8 Web API & SignalR Host
│   │   ├── Controllers/                    # 60+ REST API Controllers
│   │   ├── Hubs/                           # SignalR Hubs (Dashboard, BranchOps, Collaboration)
│   │   ├── BackgroundServices/             # 8 Hosted Background Workers
│   │   └── Program.cs                      # Host Bootstrap, DI Container, Middleware Pipeline
│   ├── SynOS.Data/                         # Data Access Layer
│   │   ├── SynOSDbContext.cs               # Central EF Core DbContext (130+ DbSets)
│   │   ├── DbInitializer.cs                # Schema Migrations, DDL Fallbacks & Seed Data
│   │   └── migrations/                     # 230+ EF Core Historical Migrations
│   ├── SynOS.Models/                       # Domain Entities, DTOs, Enums, Facts
│   │   └── Entities/                       # Relational and Event-Sourced Entities
│   ├── SynOS.Services/                     # Domain & Application Logic (130+ Services)
│   ├── SynOS.Gateway/                      # YARP Reverse Proxy & Dynamic Routing Gateway
│   ├── SynOS.RemoteBridge/                 # Local Hardware & Serial Port/TCP Bridge (Lync)
│   ├── SynOS.Updater/                      # Automated Service/Desktop OTA Updater
│   └── SynOS.Frontend/                     # Single Page Application
│       ├── package.json                    # Vite 5 + React 18 + TailwindCSS + Radix UI
│       └── src/
│           ├── features/                   # Feature-Sliced Front-End Modules
│           ├── api/                        # Typed Fetch API Clients
│           └── App.jsx                     # Top-Level Router & Role-Based Access Guards
```

### 2.2 Technology Stack
* **Frontend Framework:** React 18.2 with Vite 5.4, React Router v6, TailwindCSS 3.4, Lucide React, and Radix UI primitives.
* **Backend Framework:** ASP.NET Core 8.0 (C# 12) running as a Windows Service or Kestrel Web Host with Serilog structured logging.
* **Database & ORM:** Microsoft SQL Server with Entity Framework Core 8.0.
  - Connection pooling with execution retries (`EnableRetryOnFailure`).
  - Dual migration strategy: standard EF Core migrations combined with `DbInitializer.EnsureTablesAndColumnsCreated()` for automatic idempotent schema synchronization.
* **Authentication & Authorization:**
  - JWT Bearer Token authentication (`HMAC-SHA256`) with ephemeral key generation if unconfigured.
  - Role-based policies (`AdminPolicy`, `ReceptionPolicy`, `PhlebotomyPolicy`, `PathologyPolicy`, `TypistPolicy`, `DeliveryPolicy`, `ReportingPolicy`, `LabProcessingPolicy`).
  - Multi-branch context managed via `X-Branch-Id` header and `IUserContext`.
* **File Storage:**
  - PDF Reports & DICOM files: Local file system abstraction (`IFileStorageService` / `LocalStorageService`) stored under configurable `FileStorage:BasePath` (e.g. `C:\SynOS_Files`).
  - Resumable DICOM Upload: Chunked upload pipeline via TUS protocol (`app.UseDicomTusUpload()`) supporting 10MB chunking to bypass cloud proxy limits.
* **Real-Time Communication:**
  - ASP.NET Core SignalR with 4 active hubs: `/dashboardHub`, `/branchOperationsHub`, `/collaborationHub`, `/radiologyCollaborationHub`.
  - SignalR Notifier triggers instant UI queue refreshes on reception desks and phlebotomy stations.
* **Background Processing:** 8 Hosted Services (`IHostedService`):
  1. `OperationalStatsProjectionWorker`: Event-driven background aggregations.
  2. `DraftVisitCleanupService`: Purges stale unbilled drafts.
  3. `ReportPdfBackgroundWorker`: Asynchronous QuestPDF rendering.
  4. `AnalyzerTcpListenerService`: ASTM E1381 / E1394 TCP analyzer socket listener.
  5. `SerialPortListenerService`: RS-232 serial port listener for bench analyzers.
  6. `DicomCStoreScpService`: DICOM C-STORE SCP service for modality image reception.
  7. `NotificationWorkerService`: Queue consumer for delivery logs.
  8. `MiddlewareSyncWorker`: Cross-branch synchronization agent.

---

## 3. Complete Module Inventory

| Module | Actual Screens / Components | Backend Controllers & Services | Database Entities & Tables | Real Functionality | Status | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Patient Registration** | `ReceptionScreen.jsx`, `RegistrationPanel.jsx`, `PatientSearchScreen.jsx`, `PatientDetailScreen.jsx` | `IntakePatientController.cs`, `IntakeVisitController.cs`, `ReceptionPatientService.cs`, `PatientService.cs` | `Patients`, `Visits`, `PatientPhoneHistories`, `PatientAliases` | Register new walk-in patients, search existing patients by mobile/MRN, create draft visits, assign tokens. | **Working** | Master Data, Branches |
| **Direct Patient Billing** | `BillingSummary.jsx`, `PosCashTenderModule.jsx`, `IntentPanel.jsx` | `ReceptionController.cs`, `ReceptionFlowService.cs`, `InvoiceService.cs` | `Invoices`, `Payments`, `Orders`, `DiscountFacts`, `PaymentConfirmedFacts` | Apply test tariffs, calculate concessions/discounts, accept Cash/UPI/Card payments, calculate cash change due. | **Working** | Catalog, Visits, Discounts |
| **B2B Referral Billing** | `ReceptionB2BReceivablesDrawer.jsx`, `ReferralTerminal.jsx`, `CorporateTerminal.jsx` | `SettlementsController.cs`, `SettlementService.cs`, `ReferralPartnersController.cs` | `ReferralPartners`, `ReferralRateRules`, `ReferralCommissionAccruals`, `ReferralSettlementFacts` | Tag referring doctors, calculate pre-negotiated partner net tariffs, record outsourced settlements, track commissions. | **Working** | Billing, Catalog |
| **Phlebotomy & Accessioning** | `PhlebotomyScreen.jsx`, `AccessionModal.jsx`, `BarcodePrintModal.jsx` | `PhlebotomyController.cs`, `PhlebotomyService.cs`, `AccessionService.cs` | `Specimens`, `SpecimenTypes`, `AccessionCounters`, `WorkAssignments` | View pending sample queues, claim patient collection, generate accession numbers, print barcode labels, mark collected. | **Working** | Visits, Orders |
| **Laboratory Processing** | `DepartmentWorkbenchScreen.jsx`, `ResultEntryTable.jsx`, `AnalyzerInboxModal.jsx` | `ProcessingController.cs`, `ResultController.cs`, `ProcessingService.cs`, `ResultService.cs` | `Results`, `ResultFlags`, `DeltaCheckConfigs`, `AutosaveBuffers`, `LabAnalyzerResultInboxes` | Enter numerical/textual test parameters, validate against biological reference ranges, auto-flag abnormal values, import analyzer data. | **Working** | Phlebotomy, Catalog |
| **Pathology & Reporting** | `PathologistTerminal.jsx`, `InterpretationPanel.jsx`, `CommercialDocumentViewer.jsx` | `ReportsController.cs`, `ReportService.cs`, `QuestPdfReportRenderer.cs` | `Reports`, `PathologyReports`, `ReportSignatures`, `ReportVersions`, `ReportTemplates` | Pathologist clinical review, delta-check comparison, add clinical narratives/macros, digital signature authorization, PDF generation. | **Working** | Processing, Results |
| **Report Delivery** | `DeliveryTerminal.jsx` | `DeliveryController.cs`, `DeliveryService.cs` | `DeliveryLogs`, `DeliveryAttempts`, `NotificationQueues` | Track report dispatch, print physical hardcopy, mark handed over over counter. | **Partially Working** (WhatsApp/SMS stubs) | Reporting |
| **Radiology & PACS** | `RadiologistTerminal.jsx`, `ModalityTerminalShell.jsx`, `DicomViewerContainer.jsx`, `PacsArchiveScreen.jsx` | `RadiologyController.cs`, `PacsController.cs`, `RadiologyService.cs`, `PacsService.cs` | `RadiologyStudies`, `RadiologyImages`, `RadiologyModalities`, `PacsStudies`, `PacsSeries`, `PacsInstances` | Modality worklist, DICOM image upload (TUS / C-STORE), cornerstone.js medical image viewing, radiologist dictation. | **Working** | Visits, File Storage |
| **Cash Drawer & Shift Management** | `RevenueScreens.jsx` (Tab 9: `CashDrawerLedgersScreen`), `ShiftClosingModal.jsx` | `FinanceBillsController.cs` (`my-ledger`, `my-shift-closing`, `submit-shift-closing`) | `Payments`, `CashierShiftClosings`, `SpendFacts` | Real-time shift cash inflow/outflow audit, cashier physical count entry, variance calculation (Shortage/Overage), shift lock. | **Working** | Billing, Overhead Expenses |
| **Overhead Expenses & Petty Cash** | `OverheadScreens.jsx`, `AccountsPayableTerminal.jsx` | `OverheadExpensesController.cs` | `OverheadExpenses`, `OverheadPayableFacts`, `SpendFacts`, `ExpenseCorrectionAudits` | Record operational petty cash outflows (Tea, Courier, Repairs), settle via drawer cash or UPI, full audit trail on corrections. | **Working** | Cash Drawer, Finance |
| **Inventory & Reagents (IMS)** | `InventoryTerminal.jsx`, `OpeningStockOnboarding.jsx`, `StockRequestPanel.jsx` | `InventoryController.cs`, `IMSTubeAdminController.cs`, `IMSStockOperationController.cs` | `ImsInventoryItems`, `ImsInventoryLots`, `ImsInventoryTransactions`, `ImsTubeMasters`, `ImsStockRequests` | Manage stock ledger, lot/expiry tracking, opening stock onboarding, stock replenishment requests, automated tube consumption. | **Working** | Phlebotomy |
| **Procurement** | `ProcurementTerminal.jsx`, `PODetailTerminal.jsx` | `PurchasingController.cs`, `PurchasingService.cs` | `ImsPurchaseOrders`, `ImsPurchaseOrderItems`, `ImsGoodsReceipts`, `VendorPayables` | Draft purchase orders, approve POs, record goods receipt (GRN), auto-generate pending vendor payable. | **Partially Working** | Inventory, Accounts Payable |
| **Doctor CRM & Commissions** | `ReferralTerminal.jsx`, `DoctorCrmScreen.jsx` | `DoctorCrmController.cs`, `ReferralPartnersController.cs`, `SettlementsController.cs` | `ReferralPartners`, `ReferralCommissionAccruals`, `ReferralSettlementFacts` | Track doctor referral volume, monthly commission accruals, payout authorization, direct desk recovery. | **Working** | B2B Billing |
| **Outsourced Lab Investigations** | `ExpenseScreens.jsx` (`OutsourcingTerminal`) | `OutsourcingController.cs`, `ReferencePayablesController.cs` | `ReferenceLabs`, `ReferenceLabRateRules`, `ReferenceLabPayables`, `SpendFacts` | Outsource specialized tests to third-party reference labs, track specimen dispatch, record reference lab costs, settle payables. | **Working** | Workbench, Accounts Payable |
| **Workforce & HR** | `WorkforceScreens.jsx`, `MyHRDashboard.jsx`, `LeaveApplication.jsx` | `AttendanceController.cs`, `WorkforceAdminController.cs`, `EmployeeAdminService.cs` | `Employees`, `AttendanceLogs`, `LeaveRequests`, `LeaveFacts`, `WorkforcePolicies` | Employee directory, biometric/manual clock-in logs, leave request submission, supervisor approval, loss of pay (LOP) tracking. | **Partially Working** | Auth, Security |
| **Payroll Management** | `WorkforceScreens.jsx` (Payroll Tab) | `PayrollController.cs`, `PayrollWorkflowService.cs`, `PayrollSettlementService.cs` | `PayrollPeriods`, `PayrollRuns`, `PayrollFacts`, `PayStructures`, `SalaryAdvances`, `EmployeePayables` | Create payroll periods, run payroll calculation, adjust salary advances, finalize payroll, settle individual/bulk employee salaries. | **Working** (Stub calculation logic) | HR, General Ledger |
| **Treasury & Bank Management** | *None* | *None* | *None* (Only strings in `Payment.Method`) | No bank account entities, no UPI payout reconciliation, no bank transfer reconciliation, no cash safe drops. | **Not Implemented** | Billing, Payables |
| **General Ledger / Accounting** | *None* | *None* | `ReceivableFacts`, `PaymentConfirmedFacts`, `SpendFacts`, `RevenueFacts` | Event-sourced operational facts exist, but there is no chart of accounts, debit/credit journal ledger, or trial balance. | **Disconnected / Incomplete** | All Financial Modules |

---

## 4. Implementation Status Matrix

| Subsystem / Feature | Classification | Technical Evidence & Codebase Verification |
| :--- | :--- | :--- |
| **Patient Intake & Registration** | **Working** | Fully wired via [`IntakePatientController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/Reception/IntakePatientController.cs) and [`ReceptionScreen.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx). Generates unique MRN and persists records into `dbo.Patients`. |
| **Commercial Billing Engine** | **Working** | Executes through [`InvoiceService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs). Accurately applies multi-test tariff aggregation, custom concessions, and discount master rules. |
| **Counter Cash Tender Calculator** | **Working** | [`PosCashTenderModule.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/PosCashTenderModule.jsx) dynamically calculates currency note denominations, live change return, and drawer shortage liabilities. |
| **Thermal POS Slip Printing** | **Working** | [`thermalPrinter.js`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/utils/thermalPrinter.js) formats 80mm ESC/POS receipts, including token numbers, billing items, payment methods, and pending change due liabilities. |
| **Accessioning & Barcoding** | **Working** | [`AccessionService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/AccessionService.cs) auto-increments daily branch accession numbers and links specimens to clinical orders. |
| **Laboratory Workbench** | **Working** | [`DepartmentWorkbenchScreen.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/processing/DepartmentWorkbenchScreen.jsx) communicates with [`ProcessingController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/ProcessingController.cs). Validates parameter ranges and supports draft auto-saving. |
| **Pathology PDF Report Generation** | **Working** | Fully functional in [`QuestPdfReportRenderer.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/QuestPdfReportRenderer.cs). Generates pixel-perfect diagnostic reports with letterheads, reference ranges, and doctor digital signatures. |
| **DICOM Modality Image Viewer** | **Working** | Built using cornerstone.js in [`DicomViewerContainer.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/radiology/DicomViewerContainer.jsx) backed by [`PacsController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/Radiology/PacsController.cs). |
| **Cash Drawer Shift Closing (Z-Report)** | **Working** | Recently completed via `CashierShiftClosing` entity and [`FinanceBillsController.cs:1890`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1890). Calculates expected cash, captures physical denominations, and logs cash variance. |
| **Customer Omnichannel Delivery** | **Partially Working** | Front-end UI exists in [`DeliveryTerminal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/delivery/DeliveryTerminal.jsx), but backend [`StubWhatsAppSender.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Stubs/StubWhatsAppSender.cs) and `StubSmsSender.cs` log mock messages instead of making live telco API calls. |
| **Purchasing & Goods Receipt (GRN)** | **Partially Working** | POs and GRNs can be created in [`PurchasingService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/PurchasingService.cs), but vendor credit notes, automated three-way matching, and partial returns are incomplete. |
| **Workforce Attendance** | **Partially Working** | Leave approval and LOP tracking are implemented in [`AttendanceController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/AttendanceController.cs), but physical biometric machine integrations rely on manual assertions. |
| **Payroll Calculation Logic** | **Placeholder** | Architecture exists, but [`Program.cs:566`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Program.cs#L566) explicitly registers `PayrollCalculationLogicStub.cs`. Calculations use hardcoded percentage splits rather than dynamic tax slabs. |
| **Cash & Bank Treasury Management** | **Not Implemented** | The database has no company bank account ledgers. Online collections (UPI/Card) are recorded merely as strings without tracking actual bank deposits or fees. |
| **Double-Entry General Ledger** | **Not Implemented** | No Chart of Accounts, Journal Entries (`JournalEntry`, `JournalLine`), Balance Sheet, or Trial Balance exists. Financial data resides in disconnected departmental tables. |

---

## 5. Operational Workflow Traces

### Workflow 1: Patient Registration
* **Entry Point:** [`ReceptionScreen.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx) $\rightarrow$ `RegistrationPanel.jsx` (`Step 1: Patient Identification`).
* **API Endpoints:**
  - Search: `GET /api/v1/reception/intake/patients/search?query={mobileOrName}`
  - Create: `POST /api/v1/reception/intake/patient`
* **Backend Services:** [`ReceptionPatientService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Reception/ReceptionPatientService.cs) and [`PatientService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/PatientService.cs).
* **Database Impact:** Creates a record in `dbo.Patients` (generating a deterministic MRN e.g. `A00003`) and logs phone changes in `dbo.PatientPhoneHistories`.
* **Subsequent Step:** Proceeds immediately to Step 2 (Test Selection & Referring Doctor).
* **Disconnection Point:** None. Registration is robust and verified in production.

### Workflow 2: Patient Billing and Invoice Creation
* **Entry Point:** `RegistrationPanel.jsx` (`Step 2: Visit Details` & `Step 3: Financials`).
* **API Endpoints:**
  - Create Draft: `POST /api/v1/reception/intake/visit`
  - Apply Concession: `POST /api/v1/reception/visit/discount`
* **Backend Services:** [`VisitService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs) and [`DiscountService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/DiscountService.cs).
* **Database Impact:**
  - Creates `dbo.Visits` with temporary token (e.g. `DRAFT-XXXXXX` or `D-XXXXXX`).
  - Creates `dbo.Orders` for each selected test.
  - Creates `dbo.Invoices` with `GrossAmount`, `DiscountAmount`, and `Total`.
  - Creates `dbo.DiscountFacts` if a concession is authorized.
* **Subsequent Step:** Proceeds to POS Payment Collection.

### Workflow 3 & 4: Payment Collection (Cash, UPI, Split)
* **Entry Point:** `BillingSummary.jsx` / `PosCashTenderModule.jsx` $\rightarrow$ Submit Action Button.
* **API Endpoints:** `POST /api/v1/reception/complete-payment`
* **Backend Services:** [`ReceptionFlowService.cs:831`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ReceptionFlowService.cs#L831) and [`InvoiceService.cs:292`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L292).
* **Database Impact:**
  - Promotes `dbo.Visits.Token` from `D-XXXX` to official daily sequential token (e.g. `MAI-001`).
  - Updates `dbo.Invoices.Status` (`Paid`, `PartialPayment`, or `PendingPayment`).
  - Creates one or more `dbo.Payments` records storing `Amount`, `Method` (`Cash`, `UPI`, `Card`, or `Split`), `ReceiptNo`, `TenderedAmount`, and `ChangeReturned`.
  - Creates `dbo.PaymentConfirmedFacts` for downstream financial projections.
* **Subsequent Step:**
  - Automatically provisions laboratory accession work items via `WorkRoutingEngine`.
  - Navigates to `Visit Finalized & Print Dispatch` screen for 80mm ESC/POS thermal printing.
* **Disconnection Point:** While payment is recorded in the invoice, digital payments (UPI) are not tagged to any specific bank ledger.

### Workflow 5: Sample Collection (Phlebotomy)
* **Entry Point:** [`PhlebotomyScreen.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/phlebotomy/PhlebotomyScreen.jsx).
* **API Endpoints:**
  - Fetch Queue: `GET /api/v1/phlebotomy/queue`
  - Claim Visit: `POST /api/v1/phlebotomy/claim`
  - Collect Specimens: `POST /api/v1/phlebotomy/collect`
* **Backend Services:** [`PhlebotomyService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Phlebotomy/PhlebotomyService.cs) and [`TubeConsumptionService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/TubeConsumptionService.cs).
* **Database Impact:**
  - Creates records in `dbo.Specimens` with unique Barcode IDs (e.g. `SP-20261106-XXXX`).
  - Updates `dbo.Orders.SpecimenId` and sets `OrderStatus` to `SampleCollected`.
  - Decrements tube inventory in `dbo.ImsInventoryLots` and records consumption in `dbo.ImsInventoryTransactions`.
* **Subsequent Step:** Work assignment transitions to `DepartmentWorkbenchScreen.jsx` for technician processing.

### Workflow 6: Laboratory Workbench & Result Entry
* **Entry Point:** [`DepartmentWorkbenchScreen.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/processing/DepartmentWorkbenchScreen.jsx).
* **API Endpoints:**
  - Get Department Queue: `GET /api/v1/processing/queue`
  - Save Draft: `POST /api/v1/processing/assignments/{id}/draft`
  - Post Completed Results: `POST /api/v1/processing/assignments/{id}/results`
* **Backend Services:** [`ProcessingService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ProcessingService.cs) and [`ResultService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ResultService.cs).
* **Database Impact:**
  - Upserts records in `dbo.Results` with parameter values, units, and flags (`High`, `Low`, `Critical`).
  - Evaluates `dbo.DeltaCheckConfigs` and records any historical variance in `dbo.DeltaCheckEvents`.
  - Updates `dbo.Orders.Status` to `TechnicianCompleted`.
* **Subsequent Step:** Automatically routes the completed orders to `PathologistTerminal.jsx`.

### Workflow 7: Pathologist Approval & Report Generation
* **Entry Point:** [`PathologistTerminal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/pathology/PathologistTerminal.jsx).
* **API Endpoints:**
  - Fetch Reports: `GET /api/v1/reports?status=PendingVerification`
  - Authorize & Sign: `POST /api/v1/reports/{id}/sign`
* **Backend Services:** [`ReportService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ReportService.cs) and [`QuestPdfReportRenderer.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/QuestPdfReportRenderer.cs).
* **Database Impact:**
  - Updates `dbo.Reports.Status` to `Authorized` / `Finalized`.
  - Creates a cryptographic digital signature entry in `dbo.ReportSignatures`.
  - Writes a frozen snapshot in `dbo.ReportSnapshots`.
  - QuestPDF renders the document and saves the binary PDF file to local disk storage (`C:\SynOS_Files\Reports\...`).
* **Subsequent Step:** Enqueues the visit for delivery in `DeliveryTerminal.jsx`.

### Workflow 8: Report Delivery
* **Entry Point:** [`DeliveryTerminal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/delivery/DeliveryTerminal.jsx).
* **API Endpoints:**
  - `GET /api/v1/delivery/queue`
  - `POST /api/v1/delivery/deliver-print`
  - `POST /api/v1/delivery/deliver-whatsapp`
* **Backend Services:** [`DeliveryService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/DeliveryService.cs).
* **Database Impact:** Creates `dbo.DeliveryLogs` and `dbo.DeliveryAttempts`.
* **Disconnection Point:** Physical counter printing works; however, WhatsApp and SMS rely on `StubWhatsAppSender.cs` and `StubSmsSender.cs`. Real messages are not dispatched across telco networks without custom gateway integration.

### Workflow 9: Radiology Operations
* **Entry Point:** [`ModalityTerminalShell.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/radiology/ModalityTerminalShell.jsx) & [`RadiologistTerminal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/radiology/RadiologistTerminal.jsx).
* **API Endpoints:**
  - Worklist: `GET /api/v1/radiology/queue`
  - DICOM Import: `POST /api/v1/radiology/pacs/{studyId}/import-enterprise`
  - Complete Imaging: `POST /api/v1/radiology/mark-completed`
* **Backend Services:** [`RadiologyService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/RadiologyService.cs) and [`PacsService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/PacsService.cs).
* **Database Impact:**
  - Creates `dbo.RadiologyStudies`, `dbo.PacsStudies`, `dbo.PacsSeries`, and `dbo.PacsInstances`.
  - Associates DICOM files stored on disk with orders.
* **Subsequent Step:** Radiologist views images in `DicomViewerContainer.jsx` (Cornerstone.js), dictates impressions, and authorizes the report.

### Workflow 10: Refunds and Cancellations
* **Entry Point:** `IntentPanel.jsx` (Cancel Modal) and [`ReceptionRefundTerminal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/ReceptionRefundTerminal.jsx).
* **API Endpoints:**
  - Cancel Visit: `POST /api/v1/visits/{id}/cancel`
  - Disburse Refund: `POST /api/v1/finance/bills/cancellations/{cancelId}/disburse-refund`
* **Backend Services:** [`VisitService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs) and [`FinanceBillsController.cs:1250`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1250).
* **Database Impact:**
  - Sets `dbo.Visits.Status = Cancelled`.
  - Creates a row in `dbo.VisitCancellations` with `BalancePendingRefund`.
  - Disbursing refund records an outflow payment in `dbo.Payments` (`Amount < 0`) and emits a `SpendFact`.

### Workflow 11: B2B / Corporate Billing & Receivables
* **Entry Point:** `ReceptionB2BReceivablesDrawer.jsx` and [`CorporateTerminal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/CorporateTerminal.jsx).
* **API Endpoints:**
  - Query: `GET /api/v1/finance/settlements/today-b2b`
  - Settle: `POST /api/v1/finance/settlements/same-day-b2b`
* **Backend Services:** [`SettlementService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs).
* **Database Impact:** Updates `dbo.Invoices`, marks bills as settled, and creates `dbo.Payments` records with prefix `RCP-B2B`.
* **Disconnection Point:** Discretionary B2B waivers adjust invoice discount amounts directly without consistently emitting separate `DiscountFact` audit trails.

### Workflow 12: Cash Drawer and Cashier Shift Closing (Z-Report)
* **Entry Point:** [`RevenueScreens.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/RevenueScreens.jsx) (Tab 9: *Cash Drawer Ledgers* $\rightarrow$ *Close Shift & Handover*).
* **API Endpoints:**
  - Summary: `GET /api/v1/finance/bills/cash-drawer/my-shift-closing`
  - Submit: `POST /api/v1/finance/bills/cash-drawer/submit-shift-closing`
* **Backend Services:** [`FinanceBillsController.cs:1670-1990`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1670).
* **Database Impact:**
  - Queries `dbo.Payments` and `dbo.OverheadPayableFacts` for the cashier's active shift.
  - Creates a row in `dbo.CashierShiftClosings` with `OpeningFloat`, `SystemExpectedCash`, `PhysicalCountedCash`, `Variance`, denomination JSON, and `Status = Closed`.
* **Disconnection Point:** Newly implemented. While it generates the variance and locks the shift, it does not yet automatically record a general ledger journal entry for cash over/short.

### Workflow 13: Overhead Expenses & Petty Cash
* **Entry Point:** [`OverheadScreens.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/OverheadScreens.jsx) $\rightarrow$ *Record Expense*.
* **API Endpoints:**
  - `POST /api/v1/finance/expenses/overhead`
  - `POST /api/v1/finance/expenses/overhead/{id}/settle`
* **Backend Services:** [`OverheadExpensesController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/OverheadExpensesController.cs).
* **Database Impact:** Creates `dbo.OverheadExpenses`, `dbo.OverheadPayableFacts`, and `dbo.SpendFacts`. If paid via Cash Drawer, directly reduces drawer balance.

### Workflow 14: Inventory Consumption
* **Entry Point:** Triggered automatically upon specimen collection in phlebotomy.
* **API Endpoints:** Internal service call `ITubeConsumptionService.ConsumeStockForSpecimenAsync`.
* **Backend Services:** [`TubeConsumptionService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/TubeConsumptionService.cs).
* **Database Impact:** Decrements `QuantityOnHand` in `dbo.ImsInventoryLots` and appends an audit row in `dbo.ImsInventoryTransactions`.

### Workflow 15: Procurement & Supplier Bills
* **Entry Point:** [`ProcurementTerminal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/inventory/ProcurementTerminal.jsx) $\rightarrow$ `PODetailTerminal.jsx`.
* **API Endpoints:**
  - Create PO: `POST /api/v1/finance/purchasing/orders`
  - Receive Goods: `POST /api/v1/inventory/stock/receive`
* **Backend Services:** [`PurchasingService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/PurchasingService.cs) and [`InventoryService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Inventory/InventoryService.cs).
* **Database Impact:** Creates `dbo.ImsPurchaseOrders`, `dbo.ImsGoodsReceipts`, and inserts a pending liability into `dbo.VendorPayables`.
* **Disconnection Point:** Settling a vendor payable does not link to a company bank account; it simply flips `VendorPayable.Status = Settled`.

### Workflow 16: Staff Attendance & Payroll
* **Entry Point:** [`MyHRDashboard.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/employee/MyHRDashboard.jsx) & [`WorkforceScreens.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/WorkforceScreens.jsx).
* **API Endpoints:**
  - Leave Application: `POST /api/v1/workforce/attendance/leave`
  - Execute Payroll: `POST /api/v1/finance/payroll/runs/{id}/execute`
* **Backend Services:** [`AttendanceController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/AttendanceController.cs) and [`PayrollWorkflowService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Payroll/Orchestration/PayrollWorkflowService.cs).
* **Database Impact:** Creates `dbo.LeaveRequests`, `dbo.PayrollRuns`, and `dbo.PayrollFacts`.
* **Disconnection Point:** `PayrollCalculationLogicStub.cs` is hardcoded. Salary payments do not generate real bank disbursement files (NEFT/RTGS CSV export).

### Workflow 17: Doctor Commissions & Outsourced Investigations
* **Entry Point:** [`ReferralTerminal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/ReferralTerminal.jsx) & [`ExpenseScreens.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/ExpenseScreens.jsx) (`OutsourcingTerminal`).
* **API Endpoints:**
  - Outsource Order: `POST /api/v1/lab/outsourcing/order/{orderId}`
  - Settle Reference Lab: `POST /api/v1/finance/reference-payables/{id}/settle`
  - Settle Doctor Commission: `POST /api/v1/finance/settlements/referral/{id}`
* **Backend Services:** [`OutsourcingController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/OutsourcingController.cs), [`ReferencePayablesController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/ReferencePayablesController.cs), and [`SettlementService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs).
* **Database Impact:**
  - Creates `dbo.ReferenceLabPayables` for outsourced orders.
  - Creates `dbo.ReferralCommissionAccruals` and `dbo.ReferralSettlementFacts` for referring doctors.
* **Disconnection Point:** Functionally complete at the operational ledger level; however, payouts are tracked as isolated spend facts rather than posting to double-entry general ledger accounts.

---

## 6. Existing Financial Functionality Inventory

| Financial Domain | Frontend Implementation | Backend Implementation | Database Persistence | Genuine vs. Partial Reality |
| :--- | :--- | :--- | :--- | :--- |
| **Billing & Collections** | `RevenueScreens.jsx` (Tabs 1-4) | `FinanceBillsController.cs`, `InvoiceService.cs` | `Invoices`, `Payments`, `PaymentConfirmedFacts` | **Genuinely Implemented:** Real-time billing, discounts, cash/digital split, partial dues. |
| **Cash Drawer & Shift Closings** | `RevenueScreens.jsx` (Tab 9), `ShiftClosingModal.jsx` | `FinanceBillsController.cs` | `CashierShiftClosings`, `Payments`, `SpendFacts` | **Genuinely Implemented:** Real-time float tracking, denomination count, variance detection. |
| **Cancellations & Refunds** | `RevenueScreens.jsx` (Tab 6), `ReceptionRefundTerminal.jsx` | `FinanceBillsController.cs` | `VisitCancellations`, `Payments` (`Amount < 0`) | **Genuinely Implemented:** Approval tracking, counter cash disbursement, change due liabilities. |
| **Accounts Receivable (AR)** | `RevenueScreens.jsx` (Tab 4: *Pending Receivables*), `CorporateTerminal.jsx` | `ReceivablesController.cs`, `SettlementService.cs` | `Invoices`, `ReceivableFacts` | **Partially Implemented:** Tracks uncollected B2B balances, but lacks formal aging buckets (30/60/90 days) and automated dunning. |
| **Accounts Payable (AP)** | `ExpenseScreens.jsx` (Tabs 1-3) | `PayablesController.cs`, `ReferencePayablesController.cs` | `VendorPayables`, `ReferenceLabPayables`, `EmployeePayables` | **Partially Implemented:** Captures liabilities from POs and reference labs, but lacks payment schedules and bank transfer integration. |
| **Overhead & Petty Cash Expenses** | `OverheadScreens.jsx`, `AccountsPayableTerminal.jsx` | `OverheadExpensesController.cs` | `OverheadExpenses`, `OverheadPayableFacts`, `SpendFacts` | **Genuinely Implemented:** Category management, daily desk cash outflows, full edit/cancel audit history. |
| **Doctor Referral Commissions** | `ReferralTerminal.jsx` | `DoctorCrmController.cs`, `ReferralPartnersController.cs` | `ReferralCommissionAccruals`, `ReferralSettlementFacts` | **Genuinely Implemented:** Percentage-based commission accrual, payout settlement, desk recovery. |
| **Outsourced Investigation Costs** | `ExpenseScreens.jsx` (`OutsourcingTerminal`) | `OutsourcingController.cs`, `ReferencePayablesController.cs` | `ReferenceLabs`, `ReferenceLabPayables` | **Genuinely Implemented:** Test outsourcing, rate contract negotiation, payable settlement. |
| **Inventory & Reagent Costs** | `InventoryTerminal.jsx` | `InventoryController.cs`, `TubeConsumptionService.cs` | `ImsInventoryLots`, `CostAttribution_UsageFacts` | **Partially Implemented:** FIFO inventory valuation exists on lots, but automated landed cost attribution is not fully enabled. |
| **Staff Payroll** | `WorkforceScreens.jsx` (Payroll Tab) | `PayrollController.cs`, `PayrollWorkflowService.cs` | `PayrollRuns`, `PayrollFacts`, `EmployeePayables` | **Partially Implemented:** Period management and settlement work, but calculation logic is a stub (`PayrollCalculationLogicStub.cs`). |
| **Cash & Bank Treasury** | *None* | *None* | *None* | **Not Implemented:** No bank accounts, no bank reconciliation, no cash safe transfer tracking. |
| **Financial Reporting & Balance Sheet** | `FinanceOverview.jsx`, `EconomicsScreens.jsx` | `EconomicsController.cs`, `RevenueEngine.cs` | `RevenueFacts`, `SpendFacts` | **Partially Implemented:** Executive dashboards show gross sales, net margin, and expense totals, but no formal P&L, Balance Sheet, or Trial Balance exists. |

---

## 7. Database and Data Ownership Overview

### 7.1 Major Entity Relationship Clusters
1. **Clinical Core Cluster:**  
   `Patient` (1) $\rightarrow$ (N) `Visit` (1) $\rightarrow$ (N) `Order` (1) $\rightarrow$ (1) `Test`  
   `Order` (N) $\rightarrow$ (1) `Specimen` (Accessioning)  
   `Order` (1) $\rightarrow$ (N) `Result` $\rightarrow$ (N) `Parameter`  
   `Visit` (1) $\rightarrow$ (1) `Report` $\rightarrow$ (N) `ReportSignature`

2. **Commercial & Settlement Cluster:**  
   `Visit` (1) $\rightarrow$ (1) `Invoice` (1) $\rightarrow$ (N) `Payment`  
   `Invoice` (1) $\rightarrow$ (N) `DiscountFact`  
   `Visit` (1) $\rightarrow$ (1) `VisitCancellation`  
   `User` (Cashier) (1) $\rightarrow$ (N) `CashierShiftClosing`

3. **B2B & Referral Cluster:**  
   `Visit` (N) $\rightarrow$ (1) `ReferralPartner` $\rightarrow$ (N) `ReferralRateRule`  
   `Visit` (1) $\rightarrow$ (N) `ReferralCommissionAccrual` $\rightarrow$ (1) `ReferralSettlementFact`

4. **Procurement & Inventory Cluster:**  
   `ImsSupplier` (1) $\rightarrow$ (N) `ImsPurchaseOrder` (1) $\rightarrow$ (N) `ImsPurchaseOrderItem`  
   `ImsPurchaseOrder` (1) $\rightarrow$ (N) `ImsGoodsReceipt` $\rightarrow$ (N) `ImsInventoryLot` $\rightarrow$ `ImsInventoryItem`  
   `ImsGoodsReceipt` (1) $\rightarrow$ (1) `VendorPayable`

### 7.2 Consistency Risks & Overlapping Records
1. **Dual Representation of Cash Transactions:**
   - Cash collections exist as relational records in `dbo.Payments`.
   - Simultaneously, they exist as event facts in `dbo.PaymentConfirmedFacts` and `dbo.RevenueFacts`.
   - *Risk:* If a payment is modified or voided directly in `dbo.Payments` without emitting a compensating reversal in `dbo.RevenueFacts`, operational stats and financial truth diverge.
2. **Visit Concession vs. Secondary Waiver Separation:**
   - Front-desk marketing discounts generate `dbo.DiscountFacts`.
   - However, B2B secondary write-offs and bad-debt waivers in `SettlementService.cs` modify `Invoice.DiscountAmount` directly, bypassing the `DiscountFact` audit ledger.
3. **Draft Visit Proliferation:**
   - Visits started at reception without completion generate temporary records (`Token = D-XXXXXX`).
   - If receptionists abandon intake without clicking "Delete Draft", ghost records accumulate in `dbo.Visits` until `DraftVisitCleanupService` runs.
4. **Denomination Persistence:**
   - Until recently, `dbo.Payments` only stored `Amount`, discarding physical cash tendered (`TenderedAmount`) and change returned (`ChangeReturned`). While columns were recently added, older records lack denomination data.

---

## 8. Integration Architecture

### 8.1 Inter-Module Communication Mechanisms
1. **Direct In-Memory Method Calls:** Core domain operations execute synchronously within ASP.NET Core scoped DI services (e.g., `ReceptionFlowService` calls `InvoiceService` and `AccessionService` directly within the same database transaction).
2. **Domain Outbox Pattern (`dbo.OutboxEvents`):** Asynchronous decoupling is facilitated via `OutboxEvent` records written during database transactions and polled by hosted background workers.
3. **SignalR WebSocket Broadcasting:**
   - Server-side state changes push real-time notifications via `IHubContext<DashboardHub>` and `IHubContext<BranchOperationsHub>`.
   - Reception desks receive immediate event alerts to refresh action queues without manual browser reloads.
4. **Automated Laboratory Analyzers:**
   - Socket listener (`AnalyzerTcpListenerService`) listens on raw TCP ports for ASTM E1381/E1394 data packets.
   - Serial port listener (`SerialPortListenerService`) receives RS-232 telemetry.
   - Parsed results land in `dbo.LabAnalyzerResultInboxes` for technician review.
5. **DICOM Modality C-STORE Integration:**
   - `DicomCStoreScpService` acts as an active DICOM Storage SCP node listening on port 104/11112 for direct image transfer from X-Ray, CT, and MRI machines.

---

## 9. Pilot Stability and Delivery Risks

### Critical Risks (Could Disrupt Live Operations or Corrupt Records)
1. **Schema DDL at Startup (`DbInitializer.EnsureTablesAndColumnsCreated`):**
   - In [`Program.cs:175`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Program.cs#L175), the backend executes raw SQL DDL checks during startup to ensure tables and columns exist. If executed while production users are actively writing to the database, table lock escalation can cause temporary API timeouts (`HTTP 504`).
   - *Mitigation:* Schema changes must be decoupled from application startup and executed strictly via controlled database migration scripts during scheduled maintenance windows.
2. **Missing Database Transaction Enclosure in Certain Multi-Step Workflows:**
   - In [`SettlementService.cs:640-740`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs#L640), bulk B2B settlements loop over multiple invoices and save changes incrementally. If an exception occurs on invoice 4 of 5, invoices 1 to 3 remain settled while 4 and 5 remain unpaid.
   - *Mitigation:* Wrap all multi-invoice settlement operations in an explicit `using var transaction = await _context.Database.BeginTransactionAsync()`.

### High Risks (Could Create Incorrect Business or Financial Records)
1. **Transient Frontend State for Counter Liabilities:**
   - As documented in Sections 25 and 27 of the fix registry, relying on transient React state (such as `isChangeRetainedAsDue`) causes overpaid visits to omit change due liabilities on thermal slips when resumed from queue.
   - *Mitigation:* All financial calculations must strictly derive from mathematical truths (`totalPaid - netAmount`) rather than temporary component state.
2. **Unmonitored Discretionary Waivers:**
   - Front-desk staff can apply secondary concessions during B2B settlement without mandatory dual-authorization or upper percentage limits.
   - *Mitigation:* Implement approval limits (e.g., waivers $> ₹500$ require supervisor PIN).

### Medium Risks (Incomplete Workflow or Operational Limitation)
1. **Mocked Delivery Channels (WhatsApp / SMS):**
   - The pilot laboratory currently relies on manual print distribution or external WhatsApp messaging because the backend uses `StubWhatsAppSender.cs`.
2. **Lack of Integrated Bank Treasury:**
   - UPI payments are recorded as successful without automated verification against bank settlement webhooks (e.g., Razorpay / PineLabs / Paytm POS webhooks).

### Low Risks (Usability or Maintainability Concern)
1. **Tab Proliferation in Finance Module:**
   - The 9-tab navigation in `RevenueScreens.jsx` causes cognitive fatigue for the lab owner. Consolidating into 3 operational domains (Receivables, Treasury, Exceptions) is strongly advised.

---

## 10. Confirmed Missing Functionality

To transition SynOS into a complete, enterprise-grade Diagnostic Business ERP, the following components must be built from the ground up:

1. **Integrated Double-Entry General Ledger (GL):**
   - Chart of Accounts (Assets, Liabilities, Equity, Revenue, Cost of Goods Sold, Operating Expenses).
   - Journal entry engine with automated debit/credit rules triggered by operational events.
   - Standard financial statements: Trial Balance, Profit & Loss (P&L), Balance Sheet.
2. **Treasury and Bank Account Management:**
   - Company Bank Account master data (Current Accounts, Petty Cash Safes).
   - Bank statement import (MT940 / CSV) and one-click reconciliation against daily UPI/POS collections.
   - Cash transfer workflows (Counter Drawer $\rightarrow$ Main Lab Safe $\rightarrow$ Bank Deposit).
3. **Automated Live Omnichannel Dispatch:**
   - Direct integration with WhatsApp Cloud API / Meta Business API.
   - Live SMS gateway integration (DLT-compliant Indian telecom templates).
4. **Automated Payroll Calculation Engine:**
   - Replacement of `PayrollCalculationLogicStub.cs` with real statutory calculation rules (PF, ESI, Professional Tax, TDS slabs).
   - Automated generation of Bank Payout CSV files for bulk employee salary transfers.
5. **Fixed Assets & Machine Depreciation:**
   - Asset registry for diagnostic equipment (Analyzers, X-Ray machines, MRI scanners, UPS systems).
   - Automated monthly straight-line depreciation posting to the general ledger.

---

## 11. Unknowns Requiring Further Investigation

1. **Hardware Peripheral Setup at Pilot Site:**
   - What specific thermal printer hardware (e.g., TVS RP-3200, EPSON TM-T82) and barcode label printer models (e.g., TSC TE-244, Zebra ZD-220) are installed at Sri Divya Diagnostic Centre?
   - Is `SynOS.RemoteBridge` running locally on the reception PC, or are print jobs routed via standard Windows OS printer dialogs?
2. **Biometric Device Protocol:**
   - Does the pilot site currently use a physical biometric attendance terminal (e.g., eSSL, ZKTeco)? If so, what communication protocol (push SDK, ADMS, or local database sync) is expected?
3. **Reference Lab Pricing Agreements:**
   - Are outsourced tests billed on a per-sample basis or monthly credit account by the reference facilities (e.g., Neuberg, Lal PathLabs)?

---

## 12. Overall Assessment

SynOS is **not** a broken codebase, nor does it require a rewrite. 

On the contrary, it possesses an exceptionally strong, robustly engineered clinical and transactional foundation. It successfully handles the end-to-end clinical workflow of a live diagnostic centre—from patient registration and ESC/POS billing to phlebotomy accessioning, analyzer telemetry ingestion, QuestPDF clinical reporting, and digital pathologist authorization.

The current limitation is primarily architectural perspective: **SynOS has been built by engineers solving operational desk problems individually, resulting in an accumulation of disconnected ledgers.**

### The Path Forward
The transformation into a true Diagnostic Business ERP requires three strategic phases:
1. **Preserve & Protect:** Maintain the working transactional core (`Patients`, `Visits`, `Invoices`, `Specimens`, `Results`, `Reports`).
2. **Consolidate & Close:** Transition from open-ended browsing logs to **Closed Cycles** (shift closings, blind cash drops, and executive exception cockpits).
3. **Synthesize:** Introduce a native Chart of Accounts and General Ledger that silently listens to operational facts (`PaymentConfirmedFacts`, `SpendFacts`, `RevenueFacts`) and automatically turns daily lab activity into real-time business financial statements.

---
*Report compiled and verified against the SynOS repository source code on November 6, 2026.*
