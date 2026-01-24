# 🔍 Backend Audit Report: Operations Engine Integrity

## 1️⃣ Audit Scope
**Goal:** Verify that all operational state changes (Visit, Sample, Result, Report) flow through the `OperationsEngine` or `IOperationalEventWriter` to ensure zero-leak visibility.

**Services Audited:**
*   `VisitService`
*   `SampleService`
*   `ReportService`
*   `ResultService`
*   `InvoiceService`

---

## 2️⃣ Findings Summary

| Service | Status | Findings |
| :--- | :--- | :--- |
| **VisitService** | ✅ **Secure** | Heavy instrumentation via `IOperationalEventWriter`. Covers Creation, Updates, Prepaid, Cancellation. |
| **InvoiceService** | ✅ **Secure** | Emits `PAYMENT_RECEIVED` via `IOperationalEventWriter`. |
| **SampleService** | ✅ **Secure** | Uses `IOperationsEngine` facade for Collection and Rejection. Logic is centralized and atomic. |
| **ReportService** | ✅ **Secure** | Uses `IOperationsEngine` for Signing, Delivery, and Final Verification. |
| **ResultService** | ❌ **LEAKING** | **Critical Gaps Detected.** Direct DB updates without event emission. |

---

## 3️⃣ Detailed Leak Analysis (ResultService)

### 🔴 Leak 1: Result Drafting (`EnterResultsAsync`)
*   **Action:** Technician enters/updates result values (Draft status).
*   **Code:** Updates `Result` entity and calls `SaveChanges`.
*   **Missing:** No call to `IOperationalEventWriter`.
*   **Impact:** The "In Progress" / "Reporting" state is not visible in real-time streams. The Action Queue cannot distinguish between "Sample In Lab" and "Technician Working".

### 🔴 Leak 2: Verification Submission (`SubmitForVerificationAsync`)
*   **Action:** Technician submits results for Pathologist review.
*   **Code:**
    *   Updates `Result.Status` to `PendingVerification`.
    *   **Creates `Report` entity directly.**
*   **Missing:** No call to `IOperationalEventWriter` (Expected: `REPORT_READY` or similar).
*   **Impact:** The system does not know a report is ready for signature until a poller checks the table. Push notifications for Pathologists will fail. The operational timeline will have a gap between "Sample Collected" and "Report Signed".

---

## 4️⃣ Operations Engine Gap
The `IOperationsEngine` interface is missing methods for these intermediate result states:
*   Missing: `RecordResultDraftedAsync(...)`
*   Missing: `RecordReportReadyForSignatureAsync(...)` (or `SubmitForVerification`)

---

## 5️⃣ Recommendations
1.  **Extend `IOperationsEngine`:** Add `RecordReportReadyAsync`.
2.  **Wire `ResultService`:** Inject `IOperationsEngine` into `ResultService`.
3.  **Refactor `SubmitForVerificationAsync`:** Move the `Report` creation logic into the Engine (or at least wrap the state change with an event).

**Final Verdict:** The Operations Engine is **PARTIALLY LEAKING** at the Result Entry/Verification stage. This must be patched to ensure the Action Queue reflects the "Reporting" status accurately.
