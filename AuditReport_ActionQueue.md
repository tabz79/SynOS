# 🔍 Backend Audit Report: Reception Action Queue Readiness

## 1️⃣ Identity & Ordering

*   **Token ID**
    *   ✅ **Exists:** YES
    *   **Source:** Operations Engine / `Visit.Token` (and `TokenCounter` table)
    *   **Uniqueness:** Guaranteed daily per department via `GenerateDailyTokenAsync` logic.
*   **Timestamps**
    *   ✅ **Exists:** YES
    *   **Source:** `Visit.CreatedAt` (UTC). `Visit.TokenDate` (Lab Local Date) is also available for "Today" filtering.
    *   **Notes:** `CreatedAt` is suitable for ordering the timeline.

## 2️⃣ Patient Summary Payload

*   **Patient Name, Age, Sex, MRN**
    *   ✅ **Exists:** YES
    *   **Source:** `Visit.Patient` navigation property.
    *   **Resolution:** Available via standard `Include(v => v.Patient)` in `VisitService`.
    *   **Notes:** `Age` is derived from `DateOfBirth` at runtime (standard logic in `ReceptionSnapshotService` and `PatientService`).

## 3️⃣ Tests Summary (Operational Codes)

*   **Test Codes**
    *   ✅ **Exists:** YES
    *   **Source:** `Visit.Orders` -> `Order.TestCode`.
    *   **Notes:** `TestCode` is denormalized on the `Order` entity, making it efficient to query without joining the full `Test` master table.
*   **Ordering**
    *   ✅ **Exists:** YES
    *   **Source:** `Order` table has `CreatedAt`. Can order by insertion time.

## 4️⃣ Payment Outcome (Reception-Friendly)

*   **Payment Method Classification**
    *   ✅ **Exists:** YES
    *   **Source:** `Visit.Invoices` -> `Payment.Method`.
    *   **Values:** "Cash", "Card", "UPI", "PartnerAccount" (Prepaid).
*   **Prepaid Detection**
    *   ✅ **Exists:** YES
    *   **Source:** `Visit.PaymentCollectionModel` == "PartnerCollects" OR `Payment.Method` == "PartnerAccount".
*   **Referral Partner Display Name**
    *   ✅ **Exists:** YES
    *   **Source:** `Visit.ReferralPartner` -> `ReferralPartner.Name`.
    *   **Safety:** Available via `Include(v => v.ReferralPartner)`. No commission data is exposed on this path.

## 5️⃣ Operational Status (Live State)

*   **Single Current Operational Status**
    *   ⚠️ **Missing / Partial:** PARTIAL
    *   **Current State:** `Visit.Status` tracks financial/workflow macro state ("PendingPayment", "Paid", "Cancelled"). `Sample.Status` tracks lab status ("Pending", "Collected", "Received", "Resulted").
    *   **Gap:** There is no single "Visit Operational Status" field that aggregates "Paid" + "Sample Collected" + "Report Ready". Derivation is required.
    *   **Transformation Required:** The backend needs a lightweight projection (DTO) that inspects `Visit.Status`, `Sample.Status` (aggregated), and `Report.Status` to emit a single enum like `ReadyForSample`, `InLab`, `ReportReady`.
*   **Timestamps per State**
    *   ✅ **Exists:** YES
    *   **Source:** `BranchOperationalEvents` (History), `Sample.CollectedAt`, `Result.VerifiedAt` (Audit).

## 6️⃣ Time Signals

*   **Time since last state change**
    *   ✅ **Exists:** YES (Computable)
    *   **Source:** `Visit.CreatedAt` vs `Sample.CollectedAt`.
    *   **Notes:** Frontend can compute "Time since X" if backend provides the raw timestamps.

## 7️⃣ User Scope & Filtering

*   **Today's Visits**
    *   ✅ **Exists:** YES
    *   **Source:** `VisitService` queries filter by `TokenDate` or `CreatedAt`.
*   **Scoped by Facility**
    *   ✅ **Exists:** YES
    *   **Source:** `Visit.BranchId`.
*   **Scoped by Receptionist**
    *   ⚠️ **Missing / Implicit:** PARTIAL
    *   **Notes:** `Visit` does not strictly store "CreatedByReceptionistId" as a top-level column (it is in Audit Logs). However, for an Action Queue, showing *all* facility visits is usually preferred over just "my" visits. Filtering by `AuditLog` join is expensive. Filtering by Branch is standard.

## 🧠 Final Audit Verdict

> **Can the backend emit a single, clean, immutable `ActionQueueRow DTO`?**

**YES**, but with **one minor transformation logic required**.

The backend has all the *data*, but it is scattered across `Visit`, `Patient`, `Order`, `Payment`, and `Sample` tables.

### Required DTO Contract (Proposed)

```csharp
public class ActionQueueRowDto
{
    public Guid VisitId { get; set; }
    public string Token { get; set; }        // 1. Identity
    public DateTime CreatedAt { get; set; }  // 1. Ordering
    
    public string PatientName { get; set; }  // 2. Patient
    public string PatientAgeGender { get; set; } // 2. Patient (Formatted "25y/M")
    
    public List<string> TestCodes { get; set; } // 3. Tests
    
    public string PaymentStatus { get; set; } // 4. Payment ("Paid", "Prepaid - Dr. Smith", "Due")
    public string PaymentMethod { get; set; } // 4. Payment ("Cash", "UPI", "PartnerAccount")
    
    public string OperationalStatus { get; set; } // 5. Status (Derived: "To Sample", "In Lab", "Completed")
    public DateTime? LastStatusChangeAt { get; set; } // 6. Time Signal
}
```

**Blocking Gaps:** None.
**Transformation:** A new service method (e.g., `GetActionQueueAsync`) is needed to project the EF Core entities into this specific DTO to avoid fetching the entire graph to the frontend.
