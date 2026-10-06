# SynOS Destructive Browser QA & Chaos Stress Testing Report

**Target URL:** `http://localhost:59999`  
**Test Environment:** Real Chrome Browser with DevTools subagent control, active ASP.NET Core backend, and live SQL Server database `SynOSDb-1`.  
**Simulation Profile:** High-Volume Walk-In Burst (50–100 Daily Patients), Hostile Payload Injections (SQLi, XSS, Overflow Strings), Rapid Multi-Click Race Conditions, Parameter Type Coercion, and Out-of-Order State Transitions.

---

## 1. Executive Summary

A full end-to-end browser QA pass was performed via live Chrome browser automation. Testing moved across all clinical roles:
- **Reception Desk** (`reception` / `Admin`)
- **Phlebotomy Workstation** (`phlebo` / `admin123`)
- **Hematology Workbench** (`hemtech` / `Admin`)
- **Pathology Verification** (`drvasu` / `admin123`)
- **Delivery Desk** (`delivery` / `Admin`)

### Key Takeaway
The React frontend architecture demonstrated notable structural resilience against unhandled runtime crashes (no white-screen-of-death or unmounted React trees occurred). Furthermore, SQL injection attacks were completely neutralized by EF Core parameterized queries, and unpaid draft tokens were strictly prevented from leaking into the phlebotomy worklist.

However, several **critical clinical data integrity issues, database truncation crashes, race conditions, and synchronous browser lockups** were uncovered that must be addressed before deployment.

---

## 2. Defects Summary Table

| ID | Module | Severity | Classification | Defect Description |
|---|---|---|---|---|
| **DEF-001** | Reception / DB | **HIGH** | Crash & Information Disclosure | 250-character patient name triggers an unhandled SQL column truncation `500 Internal Server Error`, exposing database schema and file paths in the API response. |
| **DEF-002** | Lab Workbench | **CRITICAL** | Clinical Data Integrity | Hematology Workbench allows negative values (`-10.0` Hb) and non-numeric strings (`"abc"` RBC) to be saved and pushed downstream to the clinical report. |
| **DEF-003** | Reception | **MEDIUM** | Data Validation | Patient registration accepts impossible dates of birth (`2030-01-01`, `1870-01-01`) and invalid phone numbers (`123`, `98765abcde`) without rejection. |
| **DEF-004** | Reception / Billing | **MEDIUM** | Concurrency / UX | Rapid double/triple-clicking `Accept Payment` triggers a blocking synchronous `window.alert()` and an HTTP 409 Conflict. |
| **DEF-005** | Pathologist | **MEDIUM** | Concurrency / Error Handling | Rapid double-clicking `Verify & Sign Digitally` triggers a `400 Bad Request` and synchronous browser alert: `Verification Context Sync Failed: Failed to save final results.` |
| **DEF-006** | All Modules | **LOW** | Presentation / Sanitization | XSS payloads like `<script>alert("XSS")</script>` are accepted as patient names and rendered verbatim in UI queues and report headers. |

---

## 3. Detailed Test Findings & Reproduction Steps

### 3.1 Reception Desk & Walk-In Burst Simulation

#### Test 1.1: 15-Patient Rapid Registration Burst
- **Action:** Rapidly registered 15 realistic walk-in patients (`QA-Burst-Patient-1` to `QA-Burst-Patient-15`).
- **Observation:**
  - Token generator successfully incremented and assigned tokens without MRN collisions (`PATIEX` through `PATIFB`).
  - Action Queue scaled seamlessly from 2 to 12+ items.
  - Search filtering under rapid keystrokes operated with `<2ms` latency.
- **Status:** **PASS**

#### Test 1.2: Hostile Input Injections
- **SQL Injection:**
  - Input: `Dr. Robert '); DROP TABLE Patients; --`
  - Result: Correctly sanitized via parameterized queries and persisted safely as literal string (MRN `PATIEQ`). No database damage occurred.
  - Status: **PASS**
- **Buffer Overflow / Truncation Crash (DEF-001):**
  - Input: 250 characters (`A * 250`).
  - Result: Failed with HTTP 500: `Microsoft.Data.SqlClient.SqlException: String or binary data would be truncated in table 'SynOSDb-1.dbo.Patients', column 'FirstName'`. The raw stack trace exposed internal file paths.
  - Status: **FAIL (DEF-001)**
- **XSS & HTML Injection (DEF-006):**
  - Input: `<script>alert("XSS")</script>`
  - Result: React DOM escaping prevented script execution, but the raw tag was accepted and printed verbatim in patient headers across all screens.
  - Status: **ATTENTION (DEF-006)**

#### Test 1.3: Payment Concurrency & Race Conditions (DEF-004)
- **Action:** Added Complete Blood Count (`CBC`, ₹450) and rapid triple-clicked `Accept Payment (₹450)`.
- **Result:**
  - First click debited ₹450 and marked invoice as `Paid`.
  - Concurrent duplicate clicks threw `HTTP 409 Conflict: Cannot record payment for invoice in 'Paid' status.`
  - The UI triggered a synchronous `window.alert()` that froze the browser thread until dismissed.
  - Status: **ATTENTION (DEF-004)**

---

### 3.2 Phlebotomy Workstation

#### Test 2.1: Queue Isolation & Draw Enforcement
- **Action:** Inspected phlebotomy worklist (`/phlebotomy`) for unpaid draft visits vs paid tokens (`MAI-001`, `MAI-002`).
- **Observation:**
  - Unpaid visits were strictly excluded from the queue (`/api/v1/phlebotomy/queue`).
  - Only paid visits appeared with their respective test panels.
  - Status: **PASS**

#### Test 2.2: Sample Collection & Accessioning
- **Action:** Claimed `MAI-002` and recorded collection.
- **Observation:**
  - Accession number `MAIN261005000002` was assigned.
  - Worklist refreshed in real time, moving the item to the collected queue without UI state desync.
  - Status: **PASS**

---

### 3.3 Hematology Workbench

#### Test 3.1: Parameter Chaos & Biological Impossibility (DEF-002)
- **Action:** Claimed `MAIN261005000002` in `/workbench` and entered:
  - Hemoglobin: `-10.0`
  - WBC: `999999`
  - RBC: `"abc"`
- **Result:**
  - The UI did not enforce numeric typing or biological sanity boundaries.
  - `Complete Processing` succeeded and incremented the counter to `2 Completed Today`.
  - The abnormal/chaotic values were rendered directly on the verification report:
    - `HEMOGLOBIN: -10.00 g/dL`
    - `WHITE BLOOD CELL COUNT: 999999.00 K/uL`
    - `RED BLOOD CELL: abc`
  - Status: **FAIL (DEF-002)**

---

### 3.4 Pathologist Verification & Delivery Desk

#### Test 4.1: Rich Text Editor Stress
- **Action:** Pasted a 5,000-word clinical narrative into the rich text editor.
- **Observation:**
  - ProseMirror editor absorbed the payload without dropping frames or freezing the DOM.
  - Status: **PASS**

#### Test 4.2: Digital Verification Concurrency (DEF-005)
- **Action:** Double-clicked `Verify & Sign Digitally`.
- **Result:**
  - Concurrent requests caused a backend save conflict: `HTTP 400 Bad Request`.
  - A blocking `window.alert('Verification Context Sync Failed: Failed to save final results.')` appeared.
  - Status: **FAIL (DEF-005)**

#### Test 4.3: High-Frequency Tab Switching & Real-Time Sync
- **Action:** Cycled through tabs (`LIVE`, `HISTORY`, `AVAILABLE`, `ASSIGNED`) 40+ times in rapid succession.
- **Observation:**
  - Completed in ~477ms with zero React hydration errors or memory warnings.
  - SignalR connection re-established automatically on route transitions.
  - Status: **PASS**

---

## 4. Remediation Recommendations

1. **Input Validation (Backend & Frontend):**
   - Add `[StringLength(100)]` on `IntakeRegisterPatientRequest` and `[MaxLength(100)]` in EF Core model configurations to eliminate SQL truncation exceptions.
   - Enforce phone number regex (`^\+?[0-9]{7,15}$`) and realistic age bounds (`0 <= Age <= 130` and `DOB <= DateTime.Today`).
2. **Clinical Safety Safeguards (Workbench):**
   - Enforce `type="number"` and strict biological range validation for lab test parameters.
   - Non-numeric strings and negative values must be rejected at input time with explicit technician validation feedback.
3. **UI Idempotency & Concurrency:**
   - Throttle/disable buttons immediately on click (`isSubmitting` / `disabled`) for `Accept Payment` and `Verify & Sign Digitally` to prevent duplicate concurrent POST requests.
   - Replace synchronous `window.alert()` calls across the frontend with non-blocking toast notifications (e.g. `sonner` or `react-toastify`).
