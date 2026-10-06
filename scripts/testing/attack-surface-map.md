# SynOS Attack Surface Map

## 1. Overview & Statistics
- **Target URL**: `http://localhost:59999`
- **Specification Source**: OpenAPI 3.0 (`/swagger/v1/swagger.json`) & ASP.NET Core 8 Web API Source Code
- **Total Paths**: 411
- **Total Endpoints**: 507
- **Total Controllers**: 68
- **SignalR Hubs**: 5 (`/dashboardHub`, `/sampleHub`, `/branchOperationsHub`, `/collaborationHub`, `/radiologyCollaborationHub`)
- **Protocol Listeners**:
  - HTTP Kestrel (`0.0.0.0:59999`)
  - DICOM C-STORE SCP (`Port 10411`, AE Title: `SYNOS_PACS`)
  - DICOM C-STORE Storage Service (`Port 8899`, AE Title: `SYNOS_PACS`)

---

## 2. Authentication & Authorization Boundaries

### Authentication Scheme
- **Primary Auth**: JWT Bearer (`Authorization: Bearer <token>`)
- **Signature Algorithm**: HMAC-SHA256 (`HmacSha256Signature`)
- **Key Source**: `Jwt:Secret` from `appsettings.json` / Database configuration (with fallback bootstrap key)
- **Token Claims**: `sub` / `NameIdentifier`, `username`, `name`, `email`, `role`, `RoleId`, `branch_id`, `branch_name`, `session_id`, `session_mode`, `department_code`, `workspaces`
- **SignalR Auth**: Query string parameter `?access_token=<token>` intercepted in `JwtBearerEvents.OnMessageReceived`

### Role Hierarchy & Policy Matrix
| Policy / Role | Target Roles | Intended Scope |
| :--- | :--- | :--- |
| `AdminPolicy` | `Admin`, `SystemAdmin`, `Administrator` | Full administrative, configuration, and tenant control |
| `ReceptionPolicy` | `Receptionist`, `Admin` | Patient registration, intake, visits, and billing |
| `PhlebotomyPolicy` | `Phlebotomist`, `Admin` | Sample collection, barcode scanning |
| `LabProcessingPolicy` | `Technician`, `LabTech`, `Admin` | Analyzer results, batch testing, QC |
| `TypingPolicy` | `Typist`, `Admin` | Report drafting and transcriptions |
| `PathologyPolicy` | `Pathologist`, `Admin` | Pathology verification, medical interpretation, digital signing |
| `ReportingPolicy` | All diagnostic & technical roles | Report reading and result recording |
| `DeliveryPolicy` | `DeliveryDesk`, `Admin` | Dispatch, printing, patient delivery |

---

## 3. High-Risk Attack Surface: Unauthenticated Endpoints

The following 15 controllers contain **ZERO** `[Authorize]` attributes (neither class-level nor method-level), making all their endpoints completely open to anonymous network callers:

| Controller | Base Route | Exposed Capabilities | Severity |
| :--- | :--- | :--- | :--- |
| `StaffController` | `/api/v1/staff` | Full employee list with **BCrypt password hashes**, PAN, Aadhaar, bank details, and CRUD | **CRITICAL** |
| `FinanceBillsController` | `/api/v1/finance/bills` | Full patient billing list, institutional accounts, and payment statuses | **CRITICAL** |
| `PayrollController` | `/api/v1/payroll` | Payroll periods, runs, calculations, and financial finalizations | **HIGH** |
| `WorkforceAdminController` | `/api/v1/workforce-admin` | Statutory tax configurations, salary advances, and employee reimbursements | **HIGH** |
| `RevenueController` | `/api/revenue` | Immutable revenue fact creation (`/facts`) | **HIGH** |
| `PayablesController` | `/api/v1/payables` | Vendor payables list and debt settlement actions (`/settle`) | **HIGH** |
| `OverheadExpensesController` | `/api/v1/overheadexpenses` | Overhead expenses list, creation, settlement, and deletion | **HIGH** |
| `PaymentDeclarationController`| `/api/admin/payment-declaration` | Arbitrary incoming/outgoing payment confirmations | **HIGH** |
| `ReferencePayablesController` | `/api/v1/reference-payables` | Referring doctor payable commissions and ledger entries | **HIGH** |
| `FinancePayablesController` | `/api/v1/finance/payables` | Financial obligations and payment schedules | **HIGH** |
| `SpendReadController` | `/api/v1/spend-read` | Comprehensive hospital/lab spend ledger data | **MEDIUM** |
| `AttendanceController` | `/api/v1/attendance` | Staff attendance records and biometric check-ins | **MEDIUM** |
| `MacrosController` | `/api/v1/macros` | Clinical report autocomplete macros and shorthand text | **LOW** |
| `OutsourcingController` | `/api/v1/outsourcing` | External referral lab test dispatches | **MEDIUM** |
| `DevStateController` | `/api/v1/dev-state` | Simulated workflow state transition engine | **HIGH (in Dev)** |

### Explicit `[AllowAnonymous]` Endpoints on Otherwise Secured Controllers:
- `PacsController`: `GET /api/v1/radiology/pacs/instances/{instanceId}/file` (Direct raw DICOM image download; bypasses access guard when unauthenticated)
- `PurchasingController`: `GET /api/v1/purchasing/po/{id}/print` (Exposes supplier and PO financial contents)
- `ReportTemplateController`: `GET /api/v1/reporttemplate` and `GET /api/v1/reporttemplate/{id}` (Exposes medical report layout templates and DSL structures)
- `SecureDownloadController`: `GET /api/v1/public/reports/verify/{token}` (Exposes patient name and medical test names without phone verification)
- `DebugController` (Debug builds): `POST /trigger-update`, `POST /trigger-backup`, `POST /regenerate-pdf/{reportId}`, `POST /payroll-calc-test/{runId}`

---

## 4. SignalR Real-Time Surface
- **Endpoints**:
  - `/branchOperationsHub`: Handles terminal printing groups (`Branch-{id}-Thermal80mm`, `BarcodeZebra`).
  - `/dashboardHub`: Real-time operational metrics and branch synchronization.
  - `/sampleHub`: Specimen lifecycle updates across collection, phlebotomy, and processing.
  - `/collaborationHub`: Multi-user active presence and edit locks.
  - `/radiologyCollaborationHub`: PACS viewing and dictation sync.
- **Vulnerability Highlight**:
  - `SessionValidationHubFilter` intentionally disables session verification (`// Session anchoring disabled for UX`).
  - `SampleHub.SendSampleUpdate` allows any authenticated client in any branch to broadcast spoofed specimen updates into arbitrary foreign branch groups (`Branch-{sample.BranchId}`).

---

## 5. File System & PACS Storage Surface
- **Base Storage Path**: `C:\SynOS_Files`
- **PACS Root**: `C:\SynOS_Files\PACS`
- **Report Signatures**: `C:\SynOS_Files\signatures`
- **Diagnostic Bundles**: `C:\SynOS_Files\Logs`
- **Vulnerability Highlight**: Digital signatures and raw DICOM instance streams lack object-level ownership controls, exposing clinical artifacts across user boundaries.
