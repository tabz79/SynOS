# 🛡️ Backend Audit Report: Correction Capabilities

## 1. Executive Summary
The statement that "The backend strictly rejects edits to paid visits" is **technically false** but **operationally true for the current frontend integration**. 

The backend **HAS** a dedicated Correction Layer (`CorrectionService`) capable of editing Paid visits with specific privileges (`Admin`/`LabOwner`), but the standard Reception flow (`VisitService`) correctly enforces a lock. The frontend is likely hitting the `VisitService` endpoints instead of the `CorrectionService` endpoints.

## 2. Evidence of Correction Capabilities
### A. CorrectionService (The Bypass)
*   **File:** `src/SynOS.Services/Revenue/CorrectionService.cs`
*   **Logic:**
    *   Checks `totalPaid > 0`.
    *   If Paid: **Allows** edit IF `Role == Admin/LabOwner` AND `Reason` is provided.
    *   **Capabilities:** `AddTest`, `RemoveTest`, `ChangeDiscount`, `PriceOverride`.
    *   **Bypass:** It directly manipulates `Orders` and calls `RevenueEngine`, bypassing the `VisitService` status checks.

### B. VisitService (The Lock)
*   **File:** `src/SynOS.Services/VisitService.cs`
*   **Logic:** `AddTestToVisitAsync` explicitly throws `InvalidOperationException` if status is "Paid".
*   **Purpose:** Prevents accidental modification during normal workflow.

## 3. Discrepancy Analysis
| Feature | VisitService (Standard) | CorrectionService (Audit/Edit) |
| :--- | :--- | :--- |
| **Add Test** | Blocked if Paid | Allowed (with Reason + Admin Role) |
| **Remove Test** | Blocked if Paid | Allowed (with Reason + Admin Role) |
| **Change Discount** | Blocked if Paid | Allowed (with Reason + Admin Role) |
| **API Endpoint** | `/api/v1/reception/visits/...` | `/api/v1/visits/{id}/corrections` |

## 4. Conclusion & Recommendation
The backend **IS READY** for corrections. The "Missing API" claim is incorrect; the API exists at `/api/v1/visits/{visitId}/corrections`.

**Required Action:**
The Frontend needs to switch strategies when a visit is "Paid":
1.  **Detect Paid State:** UI correctly locks standard inputs.
2.  **Enable Correction Mode:** If user has permission, show "Correct Visit" button.
3.  **Switch API:** When in Correction Mode, send actions to `CorrectionController` (`POST /corrections`), **NOT** to `ReceptionController`.
