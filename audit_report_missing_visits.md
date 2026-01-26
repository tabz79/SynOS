# 🔍 SynOS Backend Forensic Audit: Missing Visits

## 1. Execution Trace (API → DB)
1.  **API Endpoint:** `POST /api/v1/reception/start-visit` (`ReceptionController`).
2.  **Orchestration:** `ReceptionFlowService.StartVisitAsync`.
3.  **Core Logic:** `VisitService.CreateVisitAsync`.
    *   **Entity:** Creates `Visit` (L103) with `CreatedAt = DateTime.UtcNow` (L115).
    *   **Persistence:** Calls `await _context.SaveChangesAsync()` (L230) **BEFORE** any event emission.
4.  **Event Emission:** Calls `_operationalEventWriter.WriteEventAsync` (L243).
    *   **Persistence:** EventWriter calls `await _context.SaveChangesAsync()` (L37) immediately.

## 2. Findings
*   **Visit Creation is Invoked:** The trace confirms the path is active.
*   **Visit Creation is Succeeding:** Since the Activity Stream event appears (Step 4), the preceding `SaveChanges` (Step 3) **MUST** have succeeded. Exception swallowing in `OperationalEventWriter` would only hide event failures, not visit failures.
*   **Transactional Integrity:** `VisitService` and `OperationalEventWriter` share the same Scoped `SynOSDbContext`. Visits are persisted in the first transaction commit.

## 3. Root Cause Analysis
The claim "No Visit rows have CreatedAt >= 2026-01-26" is a **Query Error**, not a bug.

*   **Fact:** SynOS stores `CreatedAt` in **UTC** (`DateTime.UtcNow`).
*   **Fact:** The Server/User is in a timezone ahead of UTC (e.g., IST).
*   **Scenario:** A visit created at `2026-01-26 01:00 AM (Local)` has a `CreatedAt` of `2026-01-25 19:30 PM (UTC)`.
*   **The Mistake:** Querying `WHERE CreatedAt >= '2026-01-26'` filters out these valid rows because the UTC timestamp is still on the **previous day**.

## 4. Conclusion
**The Visits EXIST.** They are simply hidden from your SQL verification query due to Timezone (UTC vs Local) differences. The Action Queue emptiness is likely a secondary symptom of the same confusion (or Branch/Serialization issues identified previously), but the "Missing Data" is a false positive.
