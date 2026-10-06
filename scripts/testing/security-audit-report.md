# SynOS Comprehensive Multi-Agent Security Assessment Report

**Target**: `http://localhost:59999` (Local SynOS Development/Staging Instance)  
**Date**: October 5, 2026  
**Auditor**: Antigravity Multi-Agent Security Swarm  
**Branch**: `testing`  
**Classification**: Authorized Confidential Security Audit  

---

## Executive Summary

A full-scope, multi-agent white-box and gray-box security assessment was conducted against the local SynOS Diagnostic Laboratory Intelligence System. Across 411 API paths and 507 exposed operations, the assessment revealed critical systemic security weaknesses stemming from missing authorization attributes, broken object-level access controls (BOLA/IDOR), unintended public information disclosure, and architectural logic flaws.

Most critically, **15 controllers containing sensitive clinical and financial operations are completely unauthenticated**, enabling any network observer to extract doctor and employee password hashes, government identification numbers (Aadhaar/PAN), patient billing rosters, and medical records without providing any credentials.

---

## Swarm Agent Findings & Detailed Technical Analysis

### Agent 1 — Reconnaissance & Surface Analysis
- **Scope Mapped**: 507 REST endpoints, 5 SignalR hubs, 2 DICOM listeners.
- **Surface Observation**: Over 40 controllers lacked class-level `[Authorize]` attributes. While some individually decorated action methods, 15 controllers lacked any authorization filters whatsoever.

---

### Agent 2 — Authentication Architecture
- **JWT Implementation**: Standard HMAC-SHA256 tokens issued via `AuthService.GenerateJwtToken`.
- **Finding SEC-AUTH-01 (Medium)**: **Hardcoded Bootstrap Key in Secret Fallback**
  - *Location*: `src/SynOS.Api/Program.cs` line 350
  - *Details*: When `Jwt:Secret` is not configured or contains placeholder text, the application falls back to a hardcoded 64-character string:
    `"SynOS_Bootstrap_Secret_Key_For_Initial_Setup_Must_Be_Overridden_By_Setup_Wizard_64_Characters_Long"`.
  - *Impact*: Any deployment running without an explicit production secret will accept arbitrarily forged tokens signed with this publicly known string.
- **Finding SEC-AUTH-02 (Medium)**: **Lack of Token Revocation Checks on REST APIs**
  - *Details*: Refresh token revocation (`rt.Revoked = DateTime.UtcNow`) invalidates refresh tokens, but active JWT access tokens (lifetime 1440 minutes / 24 hours) remain valid until expiration because stateless JWT bearer validation in `Program.cs` does not cross-check the user's active session state in the database on incoming requests.

---

### Agent 3 — Authorization & RBAC Enforcement
- **Finding SEC-AUTHZ-01 (CRITICAL)**: **Completely Unauthenticated Administrative, Financial, and HR Controllers**
  - *Status*: **CONFIRMED**
  - *Affected Controllers*: `StaffController`, `FinanceBillsController`, `PayrollController`, `WorkforceAdminController`, `RevenueController`, `PayablesController`, `OverheadExpensesController`, `PaymentDeclarationController`, `ReferencePayablesController`, `FinancePayablesController`, `SpendReadController`, `AttendanceController`, `MacrosController`, `OutsourcingController`, `DevStateController`.
  - *Root Cause*: Missing `[Authorize]` attribute on the controller classes.
  - *Proof / Evidence*:
    - `GET http://localhost:59999/api/v1/finance/bills` returned HTTP 200 OK without headers, exposing patient names, invoice UUIDs, amounts, and referring doctor names.
    - `GET http://localhost:59999/api/v1/staff` returned HTTP 200 OK without headers, dumping all employees, salaries, and user entities.
  - *Impact*: Complete administrative and financial takeover by any unauthenticated attacker on the local network.
- **Finding SEC-AUTHZ-02 (HIGH)**: **Unrestricted Financial Settlement by Any Authenticated Role**
  - *Status*: **CONFIRMED**
  - *Location*: `src/SynOS.Api/Controllers/SettlementsController.cs` line 12
  - *Details*: `SettlementsController` uses a generic `[Authorize]` attribute with no role policy. Any user with a valid token (e.g. `Phlebotomist`, `Typist`, `Receptionist`) can invoke `POST /api/settlements/referral-payable/{id}/settle` or `POST /api/settlements/receivable/{id}/settle` to record settlements.

---

### Agent 4 — Broken Object Level Authorization (BOLA / IDOR)
- **Finding SEC-BOLA-01 (HIGH)**: **Cross-Branch Patient Search, Record Modification, and Merge**
  - *Status*: **CONFIRMED**
  - *Location*: `src/SynOS.Services/PatientService.cs` lines 168-171 & `src/SynOS.Api/Controllers/PatientsController.cs`
  - *Details*: `SearchPatientsAsync`, `GetPatientByIdAsync`, `UpdatePatient`, and `Merge` check only `ReceptionPolicy`. The EF Core queries filter only by `!p.IsSoftDeleted` without checking `branch_id`. A receptionist assigned to Branch A can search, read, modify, and merge patient records belonging to Branch B.
- **Finding SEC-BOLA-02 (HIGH)**: **Direct Invoice Access via Invoice ID**
  - *Location*: `src/SynOS.Api/Controllers/InvoicesController.cs` line 28
  - *Details*: `GET /api/v1/invoices/{id}/print` accepts an `id` parameter. Any user with `ReceptionPolicy` can retrieve the complete billing and clinical test breakdown of any invoice across all branches by UUID.

---

### Agent 5 — Business Logic & Workflow State Bypasses
- **Finding SEC-LOGIC-01 (HIGH)**: **Unauthenticated Revenue and Payment Ledger Injections**
  - *Location*: `RevenueController.cs` (`POST /api/revenue/facts`) and `PaymentDeclarationController.cs` (`POST /api/admin/payment-declaration`)
  - *Details*: These endpoints are designed as append-only "write-gates" to record immutable financial facts. Because both controllers lack authorization, an attacker can inject fraudulent revenue or payment confirmations into the accounting ledger.
- **Finding SEC-LOGIC-02 (MEDIUM)**: **Simulated Workflow State Transitions via Dev Endpoint**
  - *Location*: `DevStateController.cs` (`POST /api/v1/dev-state/create`)
  - *Details*: In development mode, `DevStateController` allows callers to force visits into arbitrary downstream clinical states without going through sample collection or verification gates.

---

### Agent 6 — Clinical Report Security & Verification
- **Finding SEC-REP-01 (CRITICAL)**: **Credential and Digital Signature Image Exposure**
  - *Status*: **CONFIRMED**
  - *Location*: `src/SynOS.Api/Controllers/StaffController.cs` line 30
  - *Details*: The `GetStaff()` method includes navigation property `.Include(e => e.User)`. The user entity contains `signatureImageUrl` (pointing to the Pathologist's signature on disk) and `passwordHash`. An attacker can forge signed medical reports by downloading the pathologist's signature file.
- **Finding SEC-REP-02 (HIGH)**: **Public Patient & Test Disclosure on Verification Links**
  - *Location*: `src/SynOS.Api/Controllers/SecureDownloadController.cs` line 263 (`GET /api/v1/public/reports/verify/{token}`)
  - *Details*: While report downloading requires the patient's phone number, the verification metadata endpoint is `[AllowAnonymous]` and requires no phone number or OTP. Anyone holding a report link token receives `PatientName` and the full list of diagnostic tests (`Tests`).

---

### Agent 7 — PACS / DICOM / File Security
- **Finding SEC-PACS-01 (CRITICAL)**: **Authentication Bypass on Raw DICOM Image Download**
  - *Status*: **CONFIRMED**
  - *Location*: `src/SynOS.Api/Controllers/Radiology/PacsController.cs` lines 108-112 & `src/SynOS.Services/PacsService.cs` lines 7-14
  - *Root Cause Logic Error*:
    ```csharp
    [HttpGet("instances/{instanceId:guid}/file")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDicom(Guid instanceId) {
        TryGetUserId(out var userId);
        var (stream, contentType) = await _pacsService.GetDicomStreamAsync(instanceId, userId);
        return File(stream, contentType, $"{instanceId}.dcm");
    }
    ```
    In `PacsService.cs`:
    ```csharp
    if (currentUserId != Guid.Empty) {
        await _accessGuard.EnsureCanAccessStudyAsync(instance.RadiologyStudyId, currentUserId);
    }
    ```
  - *Vulnerability Mechanics*: When called anonymously, `TryGetUserId` yields `Guid.Empty`. Because `currentUserId == Guid.Empty`, the `if (currentUserId != Guid.Empty)` condition evaluates to false, completely bypassing `_accessGuard.EnsureCanAccessStudyAsync`. The service directly opens and streams the patient's raw DICOM medical scan to the anonymous caller.

---

### Agent 8 — API Parameter Tampering & Mass Assignment
- **Finding SEC-API-01 (MEDIUM)**: **Over-Posting in Employee and Staff Creation**
  - *Location*: `src/SynOS.Api/Controllers/StaffController.cs` line 48 (`CreateEmployee([FromBody] Employee employee)`)
  - *Details*: Direct entity binding rather than a restricted DTO allows callers to specify internal properties such as `EmployeeId`, statutory flags, or linked navigation data.

---

### Agent 9 — Injection & Execution Hazards
- **Finding SEC-INJ-01 (HIGH)**: **Unauthenticated Process Execution via OTA Debug Endpoint**
  - *Location*: `src/SynOS.Api/Controllers/Admin/DebugController.cs` line 384 (`POST /api/v1/debug/trigger-update`)
  - *Details*: In debug mode, `trigger-update` accepts a JSON manifest with `[AllowAnonymous]`, invokes `UpdateService.ExecuteUpdateAsync`, which runs `Process.Start` to launch `SynOS.Updater.exe`.

---

### Agent 10 — Information Disclosure & Error Leakage
- **Finding SEC-INFO-01 (CRITICAL)**: **Mass Exposure of Sensitive PII, Banking Info, and Password Hashes**
  - *Status*: **CONFIRMED**
  - *Details*: As verified on `http://localhost:59999/api/v1/staff`, the unauthenticated endpoint returns:
    - First/Last Name, Email, Phone
    - Bank Name, Account Number, IFSC code
    - PAN Number, Aadhaar Number
    - Base Salary, PF/ESI/TDS settings
    - BCrypt Password Hash (`$2a$11$...`)
- **Finding SEC-INFO-02 (LOW)**: **Detailed Stack Traces in Debug and Error Handlers**
  - *Location*: `DebugController.cs` and `ReportsController.cs` lines 78 & 132 (`details = ex.ToString()`)
  - *Details*: Internal server errors serialize full exception strings including filesystem file paths and line numbers.

---

### Agent 11 — Dependency & Security Configuration Review
- **NuGet Advisory Warning**: `NCalcSync 5.12.0` has a known moderate severity advisory ([GHSA-3w5p-95mh-gq75](https://github.com/advisories/GHSA-3w5p-95mh-gq75)) flagged during restore.
- **CORS & AllowedHosts**: Configured to `*` (`"AllowedHosts": "*"` in `appsettings.json`).

---

### Agent 12 — Frontend vs Backend Security Mismatches
- **Finding SEC-FE-01 (HIGH)**: **UI Role Gating without Corresponding API Authorization**
  - *Details*: The React frontend (`SynOS.Frontend`) hides tabs (e.g. `Payroll`, `Payables`, `Settlements`, `Finance`) from users without administrator roles. However, because the corresponding backend controllers have no `[Authorize]` attributes, any user can bypass the UI by sending direct HTTP requests to the API.

---

### Agent 13 — SignalR Real-Time Security
- **Finding SEC-SIG-01 (MEDIUM)**: **Cross-Branch Event Injection in SampleHub**
  - *Location*: `src/SynOS.Api/Hubs/SampleHub.cs` lines 25-31
  - *Details*: The `SendSampleUpdate(SampleDto sample)` method pushes the payload to group `Branch-{sample.BranchId}` based on the incoming DTO's `BranchId` without verifying that the caller's connection identity belongs to that branch.
- **Finding SEC-SIG-02 (LOW)**: **Disabled Session Validation Filter**
  - *Location*: `src/SynOS.Api/Hubs/SessionValidationHubFilter.cs` lines 27 & 33
  - *Details*: Session anchoring was explicitly commented out (`// Session anchoring disabled for UX`), allowing stale or terminated sessions to continue listening to real-time events.

---

### Agent 14 — White-Box Architecture Correlation
- The intended multi-tenant / multi-branch isolation relies heavily on `UserContext.CurrentBranchId`. However, EF Core queries in controllers frequently query entities directly (`_context.Invoices.ToListAsync()`, `_context.Patients.ToListAsync()`, `_context.VendorPayables.ToListAsync()`) without filtering by `CurrentBranchId`, creating pervasive IDOR vulnerabilities.

---

### Agent 15 — Adversarial Red Team Attack Chains

#### Attack Chain Alpha: Anonymous Initial Foothold to Full System Compromise
```
[Unauthenticated Attacker on Local Network]
       │
       ▼ (GET /api/v1/staff)
[Extract Doctor/Admin Username & Password Hash: $2a$11$...]
       │
       ▼ (Offline Hash Cracking / Weak Password Dictionary)
[Recover Admin / Pathologist Credentials]
       │
       ▼ (POST /api/v1/auth/login)
[Obtain Admin JWT Access Token]
       │
       ▼ (Full System Compromise: Modify Patient Records, Sign Reports, Issue Payouts)
```

#### Attack Chain Beta: Anonymous Direct Medical Data Exfiltration
```
[Unauthenticated Attacker]
       │
       ▼ (GET /api/v1/finance/bills)
[Harvest Active Patient Names, Invoice UUIDs, Doctor Relationships]
       │
       ▼ (GET /api/v1/radiology/pacs/instances/{instanceId}/file)
[Bypass _accessGuard with Guid.Empty to download raw DICOM studies]
```

---

### Agent 16 — Blue Team Remediation & Prioritization Matrix

| Finding ID | Severity | Root Cause | Priority 1 Remediation |
| :--- | :--- | :--- | :--- |
| **SEC-AUTHZ-01** | **CRITICAL** | 15 unauthenticated controllers | Apply `[Authorize(Roles = "...")]` to all unprotected controllers immediately |
| **SEC-INFO-01** | **CRITICAL** | `StaffController.GetStaff` includes `User` with password hashes | Replace entity serialization with strict `EmployeeSummaryDto` excluding sensitive fields |
| **SEC-PACS-01** | **CRITICAL** | `currentUserId != Guid.Empty` guard bypass | Remove `[AllowAnonymous]` from DICOM stream; require valid JWT and reject `Guid.Empty` |
| **SEC-AUTHZ-02** | **HIGH** | `SettlementsController` lacks role requirements | Require `[Authorize(Roles = "Admin,FinanceManager")]` |
| **SEC-BOLA-01** | **HIGH** | Queries lack `CurrentBranchId` scoping | Enforce global query filters or repository branch scoping on `Patients`, `Visits`, `Invoices` |
| **SEC-INJ-01** | **HIGH** | Anonymous `trigger-update` in `DebugController` | Wrap `DebugController` in `#if DEBUG` with mandatory `[Authorize(Roles = "Admin")]` or remove in production |
| **SEC-REP-01** | **HIGH** | Public verification link discloses patient test names | Remove patient and test details from unauthenticated verification response |
| **SEC-AUTH-01** | **MEDIUM** | Hardcoded bootstrap secret fallback | Throw exception on startup if `Jwt:Secret` is not properly configured |
| **SEC-SIG-01** | **MEDIUM** | `SampleHub` allows spoofed `BranchId` updates | Validate `sample.BranchId == userBranchId` before broadcasting |
